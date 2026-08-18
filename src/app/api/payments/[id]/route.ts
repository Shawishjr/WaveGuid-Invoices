import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseProofDataUrl,
  paymentSchema,
  recalcInvoicePayments,
} from "@/lib/payments";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
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

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: { select: { id: true, total: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const data = parsed.data;
    const invoiceId = existing.invoice.id;

    // Sum of the other payments + the new amount must not exceed the total.
    const agg = await prisma.payment.aggregate({
      where: { invoiceId, id: { not: id } },
      _sum: { amount: true },
    });
    const others = agg._sum.amount ?? 0;
    if (others + data.amount > existing.invoice.total + 0.005) {
      return NextResponse.json(
        {
          error: `Payment exceeds the amount due. Remaining for this invoice: ${(
            existing.invoice.total - others
          ).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const proof = data.proofData ? parseProofDataUrl(data.proofData) : null;
    // proofData === "" (empty string) means "remove the attached proof"
    const removeProof = data.proofData === "";

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amount: data.amount,
        date: new Date(data.date),
        method: data.method || null,
        note: data.note || null,
        ...(removeProof
          ? { proofData: null, proofMime: null, proofName: null }
          : proof
            ? {
                proofData: proof.base64,
                proofMime: proof.mime,
                proofName: data.proofName || null,
              }
            : {}),
      },
    });

    await recalcInvoicePayments(prisma, invoiceId);

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.payment.findUnique({
      where: { id },
      select: { id: true, invoiceId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.payment.delete({ where: { id } });
    await recalcInvoicePayments(prisma, existing.invoiceId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
