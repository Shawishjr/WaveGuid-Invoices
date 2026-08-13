"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "./StatusBadge";

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
  invoiceCount: number;
  owed: number;
  owedCurrency: string;
};

const emptyForm = { name: "", company: "", email: "", phone: "", address: "" };

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function ClientManager({ clients }: { clients: Client[] }) {
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailsClient = clients.find((c) => c.id === detailsId) || null;

  function openAdd() {
    setAddForm(emptyForm);
    setError(null);
    setAddOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setEditForm({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
    });
    setError(null);
  }

  async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        setError("Unable to add client. Please check the form.");
        setSaving(false);
        return;
      }
      setAddOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        setError("Unable to update client.");
        setSaving(false);
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDeleteClient(client: Client) {
    const count = client.invoiceCount;
    const msg =
      count > 0
        ? `Delete "${client.company || client.name}"?\n\nThis will also permanently delete ${count} invoice${count === 1 ? "" : "s"} for this client.`
        : `Delete "${client.company || client.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to delete client.");
        return;
      }
      if (detailsId === client.id) setDetailsId(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  async function handleDeleteInvoice(invoice: Invoice) {
    if (!window.confirm(`Delete invoice ${invoice.number}?`)) return;
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to delete invoice.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  function createInvoiceFor(client: Client) {
    router.push(`/invoices/new?clientId=${client.id}`);
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
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 400,
              fontSize: "2.4rem",
              margin: "0 0 8px",
            }}
          >
            Clients
          </h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Click a client name to view details, invoices, and outstanding balance.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={openAdd}>
          Add client
        </button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>{clients.length} clients</h3>
        </div>

        <div className="table-wrap">
          {clients.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              No clients yet.
            </div>
          ) : (
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th style={{ width: 130 }}>Invoices</th>
                  <th style={{ width: 180 }}>Owed</th>
                  <th style={{ width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <button
                        type="button"
                        className="client-name-btn"
                        onClick={() => setDetailsId(client.id)}
                      >
                        <span className="client-name-primary">
                          {client.company || client.name}
                        </span>
                        {client.company && (
                          <span className="client-name-sub">{client.name}</span>
                        )}
                      </button>
                    </td>
                    <td>{client.invoiceCount}</td>
                    <td>
                      <span
                        className={
                          client.owed > 0
                            ? "owed-amount"
                            : "owed-amount owed-zero"
                        }
                      >
                        {money(client.owed, client.owedCurrency)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDetailsId(client.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(client)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteClient(client)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {error && (
        <div className="client-toast" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add client modal */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add client</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Add a new billing contact and start creating invoices.
                </p>
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setAddOpen(false)}
              >
                Close
              </button>
            </div>
            <form className="form-page" onSubmit={handleAddSubmit}>
              <ClientFormFields form={addForm} onChange={setAddForm} />
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setAddOpen(false)}
                >
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

      {/* Edit client modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit client</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Update contact details for {editing.company || editing.name}.
                </p>
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setEditing(null)}
              >
                Close
              </button>
            </div>
            <form className="form-page" onSubmit={handleEditSubmit}>
              <ClientFormFields form={editForm} onChange={setEditForm} />
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client details modal */}
      {detailsClient && (
        <div className="modal-backdrop" onClick={() => setDetailsId(null)}>
          <div
            className="modal-card modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>{detailsClient.company || detailsClient.name}</h3>
                {detailsClient.company && (
                  <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                    {detailsClient.name}
                  </p>
                )}
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setDetailsId(null)}
              >
                Close
              </button>
            </div>

            <div className="details-stats">
              <div className="details-stat">
                <span className="details-stat-label">Invoices</span>
                <span className="details-stat-value">
                  {detailsClient.invoiceCount}
                </span>
              </div>
              <div className="details-stat">
                <span className="details-stat-label">Outstanding</span>
                <span
                  className="details-stat-value"
                  style={
                    detailsClient.owed > 0
                      ? { color: "var(--warn)" }
                      : undefined
                  }
                >
                  {money(detailsClient.owed, detailsClient.owedCurrency)}
                </span>
              </div>
            </div>

            <div className="details-contact">
              <h4>Contact</h4>
              <dl className="details-list">
                <div>
                  <dt>Email</dt>
                  <dd>{detailsClient.email || "—"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{detailsClient.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>
                    {detailsClient.address ? (
                      <span style={{ whiteSpace: "pre-wrap" }}>
                        {detailsClient.address}
                      </span>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="details-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => createInvoiceFor(detailsClient)}
              >
                + Create invoice
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDetailsId(null);
                  openEdit(detailsClient);
                }}
              >
                Edit details
              </button>
            </div>

            <div className="details-invoices">
              <h4>
                Invoices{" "}
                <span className="muted-count">
                  ({detailsClient.invoices.length})
                </span>
              </h4>
              {detailsClient.invoices.length === 0 ? (
                <div className="empty" style={{ padding: "18px 0" }}>
                  No invoices for this client yet.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="details-invoice-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsClient.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td>
                            <button
                              type="button"
                              className="invoice-link"
                              onClick={() =>
                                router.push(`/invoices/${invoice.id}`)
                              }
                            >
                              {invoice.number}
                            </button>
                          </td>
                          <td>
                            {new Date(invoice.issueDate).toLocaleDateString()}
                          </td>
                          <td>
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td>{money(invoice.total, invoice.currency)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  router.push(`/invoices/${invoice.id}/edit`)
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteInvoice(invoice)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type FormShape = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

function ClientFormFields({
  form,
  onChange,
}: {
  form: FormShape;
  onChange: (next: FormShape) => void;
}) {
  function set(field: keyof FormShape, value: string) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div className="form-grid">
      <div className="field">
        <label>Contact name</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Company</label>
        <input
          value={form.company}
          onChange={(e) => set("company", e.target.value)}
        />
      </div>
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="field">
        <label>Phone</label>
        <input
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
      </div>
      <div className="field full">
        <label>Address</label>
        <textarea
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>
    </div>
  );
}
