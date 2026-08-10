import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderTemplatePdf, PdfInvoice, PdfCompany } from "@/lib/pdf";
import { parseElements, SAMPLE_DATA } from "@/lib/templates";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const template = await prisma.invoiceTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const elements = parseElements(template.elements);

  // Prefer a real invoice for the preview, fall back to built-in sample data.
  const latest = await prisma.invoice.findFirst({
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  let invoice: PdfInvoice;
  let company: PdfCompany;

  if (latest) {
    const companyRow = await prisma.companySettings.findFirst();
    invoice = {
      number: latest.number,
      status: latest.status,
      issueDate: latest.issueDate,
      dueDate: latest.dueDate,
      currency: latest.currency,
      notes: latest.notes,
      taxRate: latest.taxRate,
      subtotal: latest.subtotal,
      taxAmount: latest.taxAmount,
      total: latest.total,
      client: {
        name: latest.client.name,
        company: latest.client.company,
        email: latest.client.email,
        phone: latest.client.phone,
        address: latest.client.address,
      },
      items: latest.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
    };
    company = {
      name: companyRow?.name || "WaveGuid",
      email: companyRow?.email || null,
      phone: companyRow?.phone || null,
      address: companyRow?.address || null,
      website: companyRow?.website || null,
    };
  } else {
    invoice = {
      number: SAMPLE_DATA.invoice.number,
      status: SAMPLE_DATA.invoice.status,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      currency: SAMPLE_DATA.invoice.currency,
      notes: SAMPLE_DATA.invoice.notes,
      taxRate: SAMPLE_DATA.invoice.taxRate,
      subtotal: Number(SAMPLE_DATA.invoice.subtotal.replace(/[^0-9.-]/g, "")),
      taxAmount: Number(SAMPLE_DATA.invoice.taxAmount.replace(/[^0-9.-]/g, "")),
      total: Number(SAMPLE_DATA.invoice.total.replace(/[^0-9.-]/g, "")),
      client: {
        name: SAMPLE_DATA.client.name,
        company: SAMPLE_DATA.client.company,
        email: SAMPLE_DATA.client.email,
        phone: SAMPLE_DATA.client.phone,
        address: SAMPLE_DATA.client.address,
      },
      items: SAMPLE_DATA.items,
    };
    company = {
      name: SAMPLE_DATA.company.name,
      email: SAMPLE_DATA.company.email,
      phone: SAMPLE_DATA.company.phone,
      address: SAMPLE_DATA.company.address,
      website: SAMPLE_DATA.company.website,
    };
  }

  const pdf = await renderTemplatePdf(invoice, company, elements);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${template.name}.pdf"`,
    },
  });
}
