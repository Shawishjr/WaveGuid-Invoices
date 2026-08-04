import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/ClientForm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
          Clients
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Keep billing contacts ready for new invoices.
        </p>
      </section>

      <ClientForm />

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <h3>{clients.length} clients</h3>
        </div>
        <div style={{ padding: 16 }}>
          {clients.length === 0 ? (
            <div className="empty">No clients yet.</div>
          ) : (
            <div className="clients-list">
              {clients.map((client) => (
                <div className="client-row" key={client.id}>
                  <div>
                    <strong>{client.company || client.name}</strong>
                    {client.company && (
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {client.name}
                      </div>
                    )}
                    {client.email && (
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {client.email}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {client._count.invoices} invoice
                    {client._count.invoices === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
