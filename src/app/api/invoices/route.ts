import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { calcTotals, invoiceSchema, nextInvoiceNumber } = await import(
      "@/lib/invoices"
    );

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const totals = calcTotals(data.items, data.taxRate);
    const number = data.number || (await nextInvoiceNumber(prisma));

    // Resolve the client: use existing clientId, or auto-create from clientName
    let clientId = data.clientId;
    if (!clientId && data.clientName) {
      // Check if a client with this name already exists (case-insensitive)
      const existing = await prisma.client.findFirst({
        where: { name: { equals: data.clientName } },
      });
      if (existing) {
        clientId = existing.id;
      } else {
        const newClient = await prisma.client.create({
          data: { name: data.clientName },
        });
        clientId = newClient.id;
      }
    }

    const invoice = await prisma.invoice.create({
      data: {
        number,
        status: data.status,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        currency: data.currency,
        notes: data.notes || null,
        taxRate: data.taxRate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
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

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
