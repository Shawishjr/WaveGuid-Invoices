import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, invoiceStatuses } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceRowActions } from "@/components/InvoiceRowActions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const activeStatus =
    status && (invoiceStatuses as readonly string[]).includes(status)
      ? status
      : null;

  const where = activeStatus ? { status: activeStatus } : {};

  const [invoices, statusCounts] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const countFor = (s: string) =>
    statusCounts.find((g) => g.status === s)?._count.status ?? 0;
  const totalInvoices = statusCounts.reduce((sum, g) => sum + g._count.status, 0);

  const chips = [
    { label: "All", value: null, count: totalInvoices },
    ...invoiceStatuses.map((s) => ({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      value: s,
      count: countFor(s),
    })),
  ];

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          All invoices
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Track drafts, sent bills, and paid work in one place.
        </p>
      </section>

      <div className="filter-chips" style={{ marginBottom: 16 }}>
        {chips.map((chip) => {
          const isActive = (chip.value ?? null) === (activeStatus ?? null);
          const href = chip.value ? `/invoices?status=${chip.value}` : "/invoices";
          return (
            <Link
              key={chip.label}
              href={href}
              className={`filter-chip${isActive ? " is-active" : ""}`}
            >
              {chip.label}
              <span className="filter-chip-count">{chip.count}</span>
            </Link>
          );
        })}
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3>{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}</h3>
          <Link className="btn btn-primary" href="/invoices/new">
            New invoice
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="empty">
            {activeStatus
              ? `No ${activeStatus} invoices.`
              : "No invoices yet."}
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>{invoice.number}</Link>
                    </td>
                    <td>{invoice.client.company || invoice.client.name}</td>
                    <td>{formatDate(invoice.issueDate)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td>{formatMoney(invoice.total, invoice.currency)}</td>
                    <td>
                      <InvoiceRowActions id={invoice.id} />
                    </td>
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
