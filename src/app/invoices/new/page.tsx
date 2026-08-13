import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const [clients, templates, company] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.invoiceTemplate.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    prisma.companySettings.findFirst(),
  ]);

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          New invoice
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Add line items, set tax, and save — then export as PDF anytime.
        </p>
      </section>
      <InvoiceForm
        clients={clients}
        templates={templates}
        defaultTemplateId={company?.defaultTemplateId}
        defaultClientId={clientId}
      />
    </>
  );
}
