import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { calcTotals, invoiceSchema } = await import("@/lib/invoices");

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const data = parsed.data;
    const totals = calcTotals(data.items, data.taxRate, data.includeVat);

    // Resolve the client: use existing clientId, or auto-create from clientName
    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      const existingClient = await prisma.client.findFirst({
        where: { name: { equals: data.clientName } },
      });
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: { name: data.clientName },
        });
        clientId = newClient.id;
      }
    }

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        number: data.number || existing.number,
        status: data.status,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        currency: data.currency,
        notes: data.notes || null,
        subject: data.subject || null,
        taxRate: data.taxRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        vatAmount: totals.vatAmount,
        total: totals.total,
        clientId: clientId!,
        templateId: data.templateId || null,
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
          })),
        },
      },
      include: { client: true, items: true },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
}
