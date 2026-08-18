import { prisma } from "@/lib/prisma";
import { PaymentsTable } from "@/components/PaymentsTable";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      amount: true,
      date: true,
      method: true,
      note: true,
      proofMime: true,
      proofName: true,
      invoice: {
        select: {
          id: true,
          number: true,
          currency: true,
          client: { select: { name: true, company: true } },
        },
      },
    },
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Payments
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          All recorded payments across invoices — bank transfers and cash, with
          transfer receipts attached.
        </p>
      </section>
      <PaymentsTable
        payments={payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          date: p.date.toISOString(),
          method: p.method,
          note: p.note,
          proofMime: p.proofMime,
          proofName: p.proofName,
          invoice: {
            id: p.invoice.id,
            number: p.invoice.number,
            currency: p.invoice.currency,
            clientName:
              p.invoice.client.company || p.invoice.client.name,
          },
        }))}
        totalCollected={total}
      />
    </>
  );
}
