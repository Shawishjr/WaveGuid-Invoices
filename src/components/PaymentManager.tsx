"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/invoices";
import { PAYMENT_METHODS, PROOF_MIME_TYPES } from "@/lib/payments";

type Payment = {
  id: string;
  amount: number;
  date: string;
  method: string | null;
  note: string | null;
  proofMime?: string | null;
  proofName?: string | null;
};

type Props = {
  invoiceId: string;
  currency: string;
  total: number;
  paidAmount: number;
  payments: Payment[];
};

type FormShape = {
  amount: string;
  date: string;
  method: string;
  note: string;
  proofData: string | null; // null = none, "" = remove existing, data URL = new file
  proofName: string | null;
  proofMime: string | null;
};

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

function toInputDate(value: string) {
  return value.slice(0, 10);
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const emptyForm: FormShape = {
  amount: "",
  date: "",
  method: "",
  note: "",
  proofData: null,
  proofName: null,
  proofMime: null,
};

export function PaymentManager({
  invoiceId,
  currency,
  total,
  paidAmount,
  payments,
}: Props) {
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [previewing, setPreviewing] = useState<Payment | null>(null);
  const [form, setForm] = useState<FormShape>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(
    () => Math.max(0, Math.round((total - paidAmount) * 100) / 100),
    [total, paidAmount]
  );
  const progress = total > 0 ? Math.min(100, (paidAmount / total) * 100) : 0;
  const fullyPaid = remaining <= 0.005;

  function openAdd() {
    setForm({ ...emptyForm, date: todayInput() });
    setError(null);
    setAdding(true);
  }

  function openEdit(payment: Payment) {
    setEditing(payment);
    setForm({
      amount: String(payment.amount),
      date: toInputDate(payment.date),
      method: payment.method || "",
      note: payment.note || "",
      proofData: null,
      proofName: payment.proofName || null,
      proofMime: payment.proofMime || null,
    });
    setError(null);
  }

  function handleProofFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
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
      f
        ? {
            ...f,
            proofData: editing?.proofMime ? "" : null,
            proofName: null,
            proofMime: null,
          }
        : f
    );
  }

  function closeModal() {
    setAdding(false);
    setEditing(null);
    setError(null);
  }

  function fillAmount(fraction: number) {
    const base = editing
      ? remaining + findEditingAmount()
      : remaining;
    const value = Math.round(base * fraction * 100) / 100;
    setForm((f) => ({ ...f, amount: value ? value.toFixed(2) : "" }));
  }

  function findEditingAmount() {
    if (!editing) return 0;
    return payments
      .filter((p) => p.id === editing.id)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        amount: Number(form.amount),
        date: form.date,
        method: form.method || null,
        note: form.note || null,
        proofData: form.proofData ?? undefined,
        proofName:
          form.proofData && form.proofData !== "" ? form.proofName : undefined,
      };
      const res = await fetch(
        editing ? `/api/payments/${editing.id}` : `/api/invoices/${invoiceId}/payments`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
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

  async function handleDelete(payment: Payment) {
    if (!window.confirm(`Delete the payment of ${formatMoney(payment.amount, currency)}?`))
      return;
    setError(null);
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: "DELETE",
      });
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

  const modalOpen = adding || editing !== null;

  return (
    <section className="panel" style={{ marginBottom: 24 }}>
      <div className="panel-header">
        <h3>Payments</h3>
        {!fullyPaid && (
          <button className="btn btn-primary" type="button" onClick={openAdd}>
            + Record payment
          </button>
        )}
      </div>

      <div className="payments-progress">
        <div className="payments-progress-row">
          <span className="payments-progress-label">
            Paid {formatMoney(paidAmount, currency)} of {formatMoney(total, currency)}
          </span>
          <span
            className={`payments-progress-remaining${fullyPaid ? " is-zero" : ""}`}
          >
            {fullyPaid
              ? "Fully paid"
              : `${formatMoney(remaining, currency)} remaining`}
          </span>
        </div>
        <div className="payments-progress-track">
          <div
            className="payments-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="empty" style={{ padding: 18 }}>
          No payments recorded yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Note</th>
                  <th>Receipt</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <strong>{formatMoney(payment.amount, currency)}</strong>
                    </td>
                    <td>{payment.method || "—"}</td>
                    <td className="payments-note-cell">{payment.note || "—"}</td>
                    <td>
                      {payment.proofMime ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPreviewing(payment)}
                          title="Preview receipt"
                        >
                          {payment.proofMime === "application/pdf"
                            ? "View PDF"
                            : "View picture"}
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
        </div>
      )}

      {error && !modalOpen && (
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

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editing ? "Edit payment" : "Record payment"}</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {editing
                    ? "Update the amount, date, or method."
                    : `${formatMoney(remaining, currency)} remaining on this invoice.`}
                </p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="form-page" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field">
                  <label>Amount ({currency})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                  <div className="quick-amounts">
                    <button type="button" className="chip" onClick={() => fillAmount(0.25)}>
                      25%
                    </button>
                    <button type="button" className="chip" onClick={() => fillAmount(0.5)}>
                      50%
                    </button>
                    <button type="button" className="chip" onClick={() => fillAmount(1)}>
                      {editing ? "All" : "Full amount"}
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Method</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field full">
                  <label>Note</label>
                  <input
                    type="text"
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Optional — e.g. upfront 50%"
                  />
                </div>
                <div className="field full">
                  <label>
                    Transfer receipt (picture or PDF, max 3 MB)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                    onChange={handleProofFile}
                  />
                  {(form.proofName || editing?.proofName) && (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {form.proofData
                          ? "New file ready to upload"
                          : `Attached: ${editing?.proofName}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={removeProof}
                      >
                        Remove receipt
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="error">{error}</p>}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editing ? "Save changes" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview-only receipt viewer */}
      {previewing && (
        <div className="modal-backdrop" onClick={() => setPreviewing(null)}>
          <div className="modal-card modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Transfer receipt</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {formatMoney(previewing.amount, currency)} ·{" "}
                  {formatDate(previewing.date)}
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
              {previewing.proofMime === "application/pdf" ? (
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
    </section>
  );
}
