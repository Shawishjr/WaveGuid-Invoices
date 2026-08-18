"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/invoices";
import { PAYMENT_METHODS, PROOF_MIME_TYPES } from "@/lib/payments";

type PaymentRow = {
  id: string;
  amount: number;
  date: string;
  method: string | null;
  note: string | null;
  proofMime: string | null;
  proofName: string | null;
  invoice: {
    id: string;
    number: string;
    currency: string;
    clientName: string;
  };
};

type Props = {
  payments: PaymentRow[];
  totalCollected: number;
};

type EditForm = {
  amount: string;
  date: string;
  method: string;
  note: string;
  proofData: string | null; // null = unchanged, "" = remove, data URL = new
  proofName: string | null;
  proofMime: string | null;
};

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

function toInputDate(value: string) {
  return value.slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PaymentsTable({ payments, totalCollected }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [previewing, setPreviewing] = useState<PaymentRow | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency = payments[0]?.invoice.currency ?? "USD";

  function openEdit(payment: PaymentRow) {
    setEditing(payment);
    setForm({
      amount: String(payment.amount),
      date: toInputDate(payment.date),
      method: payment.method || "",
      note: payment.note || "",
      proofData: null,
      proofName: payment.proofName,
      proofMime: payment.proofMime,
    });
    setError(null);
  }

  function closeModal() {
    setEditing(null);
    setForm(null);
    setError(null);
  }

  function handleProofFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !form) return;
    if (!(PROOF_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Only pictures (PNG, JPEG, WebP, GIF) and PDF files are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError("File is too large — maximum 3 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) =>
        f
          ? {
              ...f,
              proofData: String(reader.result),
              proofName: file.name,
              proofMime: file.type,
            }
          : f
      );
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function removeProof() {
    setForm((f) =>
      f ? { ...f, proofData: editing?.proofName ? "" : null, proofName: null, proofMime: null } : f
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        amount: Number(form.amount),
        date: form.date,
        method: form.method || null,
        note: form.note || null,
        proofData: form.proofData ?? undefined,
        proofName: form.proofData && form.proofData !== "" ? form.proofName : undefined,
      };
      const res = await fetch(`/api/payments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not save payment. Check the amount and date."
        );
        setSaving(false);
        return;
      }
      closeModal();
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete(payment: PaymentRow) {
    if (
      !window.confirm(
        `Delete the payment of ${formatMoney(payment.amount, payment.invoice.currency)} on invoice ${payment.invoice.number}?`
      )
    )
      return;
    setError(null);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to delete payment.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  const isPdf = (mime: string | null) => mime === "application/pdf";

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <h3>{payments.length} payments</h3>
          <span className="payments-progress-remaining">
            {formatMoney(totalCollected, currency)} collected
          </span>
        </div>

        <div className="table-wrap">
          {payments.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              No payments recorded yet. Open an invoice to record a payment.
            </div>
          ) : (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transfer receipt</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <Link className="invoice-link" href={`/invoices/${payment.invoice.id}`}>
                        {payment.invoice.number}
                      </Link>
                    </td>
                    <td>{payment.invoice.clientName}</td>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <strong>
                        {formatMoney(payment.amount, payment.invoice.currency)}
                      </strong>
                    </td>
                    <td>{payment.method || "—"}</td>
                    <td>
                      {payment.proofMime ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPreviewing(payment)}
                          title="Preview receipt"
                        >
                          {isPdf(payment.proofMime) ? "View PDF" : "View picture"}
                        </button>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(payment)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(payment)}
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

      {error && !editing && (
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

      {/* Preview-only receipt viewer */}
      {previewing && (
        <div className="modal-backdrop" onClick={() => setPreviewing(null)}>
          <div
            className="modal-card modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Transfer receipt</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {previewing.invoice.number} — {previewing.invoice.clientName}
                  {previewing.proofName ? ` · ${previewing.proofName}` : ""}
                </p>
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setPreviewing(null)}
              >
                Close
              </button>
            </div>
            <div className="proof-preview">
              {isPdf(previewing.proofMime) ? (
                <iframe
                  src={`/api/payments/${previewing.id}/proof`}
                  title="Receipt PDF"
                  className="proof-frame"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/payments/${previewing.id}/proof`}
                  alt="Receipt"
                  className="proof-image"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit payment modal */}
      {editing && form && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit payment</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Invoice {editing.invoice.number} — {editing.invoice.clientName}
                </p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="form-page" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Amount ({editing.invoice.currency})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, amount: e.target.value } : f))
                    }
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, date: e.target.value } : f))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>Method</label>
                  <select
                    value={form.method}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, method: e.target.value } : f))
                    }
                  >
                    <option value="">Not specified</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Note</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, note: e.target.value } : f))
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="field full">
                  <label>Transfer receipt (picture or PDF, max 3 MB)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                    onChange={handleProofFile}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {(form.proofName || editing.proofName) && (
                      <>
                        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                          {form.proofData && form.proofData !== ""
                            ? "New file ready to upload"
                            : `Attached: ${editing.proofName}`}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={removeProof}
                        >
                          Remove receipt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {error && <p className="error">{error}</p>}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" type="button" onClick={closeModal}>
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
    </>
  );
}
