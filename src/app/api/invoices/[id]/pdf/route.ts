import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildInvoicePdf, renderTemplatePdf } from "@/lib/pdf";
import { parseElements } from "@/lib/templates";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, items: true, template: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  let company = await prisma.companySettings.findFirst();
  if (!company) {
    company = await prisma.companySettings.create({
      data: { name: "WaveGuid" },
    });
  }

  let pdf: Buffer;
  if (invoice.template) {
    pdf = await renderTemplatePdf(
      invoice,
      company,
      parseElements(invoice.template.elements)
    );
  } else if (invoice.templateId) {
    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: invoice.templateId },
    });
    pdf = template
      ? await renderTemplatePdf(invoice, company, parseElements(template.elements))
      : await buildInvoicePdf(invoice, company);
  } else {
    pdf = await buildInvoicePdf(invoice, company);
  }

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
