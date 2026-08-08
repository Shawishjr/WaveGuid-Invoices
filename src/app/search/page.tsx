import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/invoices";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  if (!query) {
    redirect("/dashboard");
  }

  const normalizedQuery = query.toLowerCase();

  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: { invoices: true },
    }),
  ]);

  const filteredInvoices = invoices.filter((invoice) => {
    const haystack = `${invoice.number} ${invoice.client.name} ${invoice.client.company ?? ""} ${invoice.status}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const filteredClients = clients.filter((client) => {
    const haystack = `${client.name} ${client.company ?? ""} ${client.email ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Search results
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Showing matches for “{query}”.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3>{filteredInvoices.length} matching invoices</h3>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="empty">No invoices matched your search.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>{invoice.number}</Link>
                    </td>
                    <td>{invoice.client.company || invoice.client.name}</td>
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

      <section className="panel">
        <div className="panel-header">
          <h3>{filteredClients.length} matching clients</h3>
        </div>

        {filteredClients.length === 0 ? (
          <div className="empty">No clients matched your search.</div>
        ) : (
          <div className="clients-list" style={{ padding: 16 }}>
            {filteredClients.map((client) => (
              <div className="client-card" key={client.id}>
                <div className="client-summary">
                  <div>
                    <strong>{client.company || client.name}</strong>
                    {client.company && <div className="client-subtitle">{client.name}</div>}
                    {client.email && <div className="client-subtitle">{client.email}</div>}
                  </div>
                  <div className="client-count">{client.invoices.length} invoices</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
