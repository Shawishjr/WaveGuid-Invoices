import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [invoices, clientCount] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.client.count(),
  ]);

  const outstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total, 0);

  const paid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h2>Invoices that look as sharp as the work behind them.</h2>
          <p>
            Create, track, and export polished PDFs for every client —
            without leaving WaveGuid.
          </p>
        </div>
        <div className="stat-panel">
          <div className="stat">
            <h3>Open invoices</h3>
            <strong>{invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length}</strong>
          </div>
          <div className="stat">
            <h3>Clients</h3>
            <strong>{clientCount}</strong>
          </div>
          <div className="stat">
            <h3>Outstanding</h3>
            <strong>{formatMoney(outstanding)}</strong>
          </div>
          <div className="stat">
            <h3>Collected</h3>
            <strong>{formatMoney(paid)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Recent invoices</h3>
          <Link className="btn btn-secondary" href="/invoices/new">
            Create invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="empty">
            No invoices yet. Create your first one to get started.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Issue date</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>
                        {invoice.number}
                      </Link>
                    </td>
                    <td>{invoice.client.company || invoice.client.name}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td>{formatMoney(invoice.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
