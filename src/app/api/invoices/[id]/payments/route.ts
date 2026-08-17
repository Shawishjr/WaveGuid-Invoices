import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentSchema, recalcInvoicePayments } from "@/lib/payments";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, total: true, paidAmount: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const data = parsed.data;
    const newPaid = round(invoice.paidAmount + data.amount);

    if (newPaid > invoice.total + 0.005) {
      return NextResponse.json(
        {
          error: `Payment exceeds the amount due. Remaining on this invoice: ${(
            invoice.total - invoice.paidAmount
          ).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: data.amount,
        date: new Date(data.date),
        method: data.method || null,
        note: data.note || null,
        invoiceId: id,
      },
    });

    await recalcInvoicePayments(prisma, id);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
