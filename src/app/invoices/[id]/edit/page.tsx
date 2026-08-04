import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InvoiceForm } from "@/components/InvoiceForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params;

  const [invoice, clients] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!invoice) notFound();

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Edit {invoice.number}
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Update details, line items, or status.
        </p>
      </section>
      <InvoiceForm
        clients={clients}
        invoice={{
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate.toISOString(),
          currency: invoice.currency,
          notes: invoice.notes,
          taxRate: invoice.taxRate,
          clientId: invoice.clientId,
          items: invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }}
      />
    </>
  );
}
