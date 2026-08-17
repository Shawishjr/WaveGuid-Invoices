import { prisma } from "@/lib/prisma";
import { buildInvoicePdf, renderTemplatePdf } from "@/lib/pdf";
import { parseElements } from "@/lib/templates";

export async function getInvoicePdfById(
  invoiceId: string
): Promise<{ pdf: Buffer; number: string } | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, items: true, template: true },
  });
  if (!invoice) return null;

  let company = await prisma.companySettings.findFirst();
  if (!company) {
    company = await prisma.companySettings.create({
      data: { name: "WaveGuid" },
    });
  }

  if (invoice.template) {
    return {
      pdf: await renderTemplatePdf(invoice, company, parseElements(invoice.template.elements)),
      number: invoice.number,
    };
  }
  if (invoice.templateId) {
    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: invoice.templateId },
    });
    if (template) {
      return {
        pdf: await renderTemplatePdf(invoice, company, parseElements(template.elements)),
        number: invoice.number,
      };
    }
  }
  return { pdf: await buildInvoicePdf(invoice, company), number: invoice.number };
}
