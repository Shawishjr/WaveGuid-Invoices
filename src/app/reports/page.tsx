import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, invoiceStatuses, STATUS_LABELS, type InvoiceStatus } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const STATUSES = invoiceStatuses;

function formatStatusLabel(status: InvoiceStatus) {
  return STATUS_LABELS[status];
}

export default async function ReportsPage() {
  const [clientsCount, statusGroups, pendingInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { total: true, paidAmount: true },
    }),
    prisma.invoice.findMany({
      include: { client: true },
      where: { status: "partly_paid" },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
  ]);

  const stats = STATUSES.reduce(
    (acc, status) => {
      const group = statusGroups.find((item) => item.status === status);
      acc[status] = {
        count: group?._count.status ?? 0,
        total: group?._sum.total ?? 0,
      };
      return acc;
    },
    {} as Record<InvoiceStatus, { count: number; total: number }>
  );

  const totalInvoices = statusGroups.reduce((sum, group) => sum + group._count.status, 0);
  const totalRevenue = statusGroups.reduce((sum, group) => sum + (group._sum.total ?? 0), 0);
  const outstandingAmount = Math.max(
    0,
    statusGroups
      .filter((g) => g.status === "partly_paid")
      .reduce(
        (sum, g) =>
          sum + Math.max(0, (g._sum.total ?? 0) - (g._sum.paidAmount ?? 0)),
        0
      )
  );
  const paidCount = stats.fully_paid.count;
  const collectionRate = totalInvoices ? Math.round((paidCount / totalInvoices) * 100) : 0;

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Reports & Analytics
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Track invoice health, collections, and follow-up priorities from one place.
        </p>
      </section>

      <section className="stat-panel" style={{ marginBottom: 24 }}>
        <div className="stat">
          <h3>Total invoices</h3>
          <strong>{totalInvoices}</strong>
        </div>
        <div className="stat">
          <h3>Total clients</h3>
          <strong>{clientsCount}</strong>
        </div>
        <div className="stat">
          <h3>Total revenue</h3>
          <strong>{formatMoney(totalRevenue)}</strong>
        </div>
        <div className="stat">
          <h3>Outstanding balance</h3>
          <strong>{formatMoney(outstandingAmount)}</strong>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3>Performance snapshot</h3>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h4>Collection rate</h4>
            <strong>{collectionRate}%</strong>
            <span>{paidCount} fully paid invoices</span>
          </div>
          <div className="analytics-card">
            <h4>Outstanding</h4>
            <strong>{formatMoney(outstandingAmount)}</strong>
            <span>Awaiting full payment</span>
          </div>
          <div className="analytics-card">
            <h4>Partly paid</h4>
            <strong>{stats.partly_paid.count}</strong>
            <span>{formatMoney(stats.partly_paid.total)}</span>
          </div>
          <div className="analytics-card">
            <h4>Drafts</h4>
            <strong>{stats.draft.count}</strong>
            <span>{formatMoney(stats.draft.total)}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Priority follow-ups</h3>
          <Link className="btn btn-secondary" href="/invoices">
            Review invoices
          </Link>
        </div>

        {pendingInvoices.length === 0 ? (
          <div className="empty">No pending invoices to review.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>{invoice.number}</Link>
                    </td>
                    <td>{invoice.client.company || invoice.client.name}</td>
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
