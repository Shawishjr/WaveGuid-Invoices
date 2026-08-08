"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Invoice = {
  id: string;
  number: string;
  issueDate: string | Date;
  status: string;
  total: number;
  currency: string;
};

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  company?: string | null;
  invoices: Invoice[];
};

export function ClientManager({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, phone, address }),
      });

      if (!res.ok) {
        setError("Unable to add client. Please check the form and try again.");
        setSaving(false);
        return;
      }

      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      setAddress("");
      setShowModal(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <>
      <section
        className="page-heading"
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "2.4rem", margin: "0 0 8px" }}>
            Clients
          </h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Click a client to expand invoices created for that contact.
          </p>
        </div>

        <button className="btn btn-primary" type="button" onClick={() => setShowModal(true)}>
          Add client
        </button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>{clients.length} clients</h3>
        </div>

        <div className="clients-list" style={{ padding: 16 }}>
          {clients.length === 0 ? (
            <div className="empty">No clients yet.</div>
          ) : (
            clients.map((client) => (
              <details className="client-card" key={client.id}>
                <summary className="client-summary">
                  <div>
                    <strong>{client.company || client.name}</strong>
                    {client.company && (
                      <div className="client-subtitle">{client.name}</div>
                    )}
                    {client.email && (
                      <div className="client-subtitle">{client.email}</div>
                    )}
                  </div>
                  <div className="client-count">
                    {client.invoices.length} invoice{client.invoices.length === 1 ? "" : "s"}
                  </div>
                </summary>

                <div className="client-panel">
                  {client.invoices.length === 0 ? (
                    <div className="empty">No invoices created for this client yet.</div>
                  ) : (
                    <div className="invoice-summary-list">
                      {client.invoices.map((invoice) => (
                        <div className="invoice-summary" key={invoice.id}>
                          <div>
                            <strong>{invoice.number}</strong>
                            <div className="client-subtitle">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                          </div>
                          <div className="invoice-meta">
                            <span>{invoice.status}</span>
                            <strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.total)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add client</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Add a new billing contact and start creating invoices.
                </p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>

            <form className="form-page" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="client-name">Contact name</label>
                  <input
                    id="client-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-company">Company</label>
                  <input
                    id="client-company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-email">Email</label>
                  <input
                    id="client-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-phone">Phone</label>
                  <input
                    id="client-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="client-address">Address</label>
                  <textarea
                    id="client-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
              </div>

              {error && <p className="error">{error}</p>}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Add client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
