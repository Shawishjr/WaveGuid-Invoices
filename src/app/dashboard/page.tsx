import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

type InvoiceStatus = (typeof STATUSES)[number];

function formatStatusLabel(status: InvoiceStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function DashboardPage() {
  const [clientsCount, statusGroups, recentInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { total: true },
    }),
    prisma.invoice.findMany({
      include: { client: true },
      orderBy: { issueDate: "desc" },
      take: 5,
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
  const paidAmount = stats.paid.total;
  const overdueAmount = stats.overdue.total;
  const outstandingAmount = stats.sent.total + stats.overdue.total;

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Dashboard
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Quick access to invoice performance, revenue totals, and outstanding balances.
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
          <h3>Analytics overview</h3>
          <Link className="btn btn-ghost" href="/reports">
            View reports
          </Link>
        </div>

        <div className="analytics-grid">
          <div className="analytics-card">
            <h4>Collection rate</h4>
            <strong>{totalInvoices ? Math.round((stats.paid.count / totalInvoices) * 100) : 0}%</strong>
            <span>{stats.paid.count} paid invoices</span>
          </div>
          <div className="analytics-card">
            <h4>Outstanding</h4>
            <strong>{formatMoney(outstandingAmount)}</strong>
            <span>{stats.sent.count + stats.overdue.count} pending</span>
          </div>
          <div className="analytics-card">
            <h4>Overdue</h4>
            <strong>{stats.overdue.count}</strong>
            <span>{formatMoney(stats.overdue.total)}</span>
          </div>
          <div className="analytics-card">
            <h4>Drafts</h4>
            <strong>{stats.draft.count}</strong>
            <span>Ready to send</span>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3>Status breakdown</h3>
          <Link className="btn btn-ghost" href="/invoices">
            View invoices
          </Link>
        </div>
        <div className="status-grid" style={{ padding: 20 }}>
          {STATUSES.map((status) => (
            <div className="status-card" key={status}>
              <h4>{formatStatusLabel(status)}</h4>
              <strong>{stats[status].count}</strong>
              <span>{formatMoney(stats[status].total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Recent invoices</h3>
          <Link className="btn btn-secondary" href="/invoices/new">
            New invoice
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="empty">No invoices available yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Issue date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>{invoice.number}</Link>
                    </td>
                    <td>{invoice.client.company || invoice.client.name}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
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
