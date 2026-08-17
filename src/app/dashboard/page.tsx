import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

type InvoiceStatus = (typeof STATUSES)[number];

function formatStatusLabel(status: InvoiceStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; soft: string; icon: React.ReactNode }> = {
  draft: {
    color: "#707EAE",
    soft: "rgba(112, 126, 174, 0.16)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  sent: {
    color: "#076C5F",
    soft: "rgba(7, 108, 95, 0.12)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  paid: {
    color: "#01B574",
    soft: "rgba(1, 181, 116, 0.14)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  overdue: {
    color: "#FFB547",
    soft: "rgba(255, 181, 71, 0.16)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  cancelled: {
    color: "#EE5D50",
    soft: "rgba(238, 93, 80, 0.16)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
};

export default async function DashboardPage() {
  const session = await getSession();
  const fullName = session?.name || session?.email || "there";
  const firstName = fullName.split(" ")[0];
  const greeting = getGreeting(new Date().getHours());

  const [clientsCount, statusGroups, recentInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { status: true },
      _sum: { total: true, paidAmount: true },
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
  const outstandingAmount = Math.max(
    0,
    stats.sent.total + stats.overdue.total -
      ((statusGroups
        .filter((g) => g.status === "sent" || g.status === "overdue")
        .reduce((sum, g) => sum + (g._sum.paidAmount ?? 0), 0)) ?? 0)
  );

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
              {greeting}, {firstName}
            </h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Quick access to invoice performance, revenue totals, and outstanding balances.
            </p>
          </div>
          <Link className="btn btn-primary" href="/invoices/new">
            New invoice
          </Link>
        </div>
      </section>

      <section className="stat-boxes" style={{ marginBottom: 24 }}>
        <div className="stat-box" style={{ "--stat-color": "#076C5F", "--stat-soft": "rgba(7, 108, 95, 0.12)" } as React.CSSProperties}>
          <span className="stat-box-chip" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
          </span>
          <div className="stat-box-body">
            <span className="stat-box-label">Total invoices</span>
            <strong className="stat-box-value">{totalInvoices}</strong>
          </div>
        </div>

        <div className="stat-box" style={{ "--stat-color": "#3965FF", "--stat-soft": "rgba(57, 101, 255, 0.12)" } as React.CSSProperties}>
          <span className="stat-box-chip" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
              <circle cx="9.5" cy="7" r="3" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div className="stat-box-body">
            <span className="stat-box-label">Total clients</span>
            <strong className="stat-box-value">{clientsCount}</strong>
          </div>
        </div>

        <div className="stat-box" style={{ "--stat-color": "#01B574", "--stat-soft": "rgba(1, 181, 116, 0.12)" } as React.CSSProperties}>
          <span className="stat-box-chip" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <div className="stat-box-body">
            <span className="stat-box-label">Total revenue</span>
            <strong className="stat-box-value">{formatMoney(totalRevenue)}</strong>
          </div>
        </div>

        <div className="stat-box" style={{ "--stat-color": "#FFB547", "--stat-soft": "rgba(255, 181, 71, 0.14)" } as React.CSSProperties}>
          <span className="stat-box-chip" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </span>
          <div className="stat-box-body">
            <span className="stat-box-label">Outstanding balance</span>
            <strong className="stat-box-value">{formatMoney(outstandingAmount)}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 24 }}>
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

      <section className="panel">
        <div className="panel-header">
          <h3>Status breakdown</h3>
          <Link className="btn btn-ghost" href="/invoices">
            View invoices
          </Link>
        </div>
        <div className="status-grid" style={{ padding: 20 }}>
          {STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div
                className="stat-box"
                key={status}
                style={{ "--stat-color": cfg.color, "--stat-soft": cfg.soft } as React.CSSProperties}
              >
                <span className="stat-box-chip" aria-hidden>
                  {cfg.icon}
                </span>
                <div className="stat-box-body">
                  <span className="stat-box-label">{formatStatusLabel(status)}</span>
                  <strong className="stat-box-value">{stats[status].count}</strong>
                  <span className="stat-box-sub">{formatMoney(stats[status].total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
