"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  formatMoney,
  invoiceStatuses,
  roundMoney,
  STATUS_LABELS,
} from "@/lib/invoices";
import { PAYMENT_METHODS } from "@/lib/payments";

type Props = {
  id: string;
  status: string;
  currency: string;
  total: number;
  paidAmount: number;
};

const MENU_WIDTH = 224;

export function InvoiceRowActions({
  id,
  status,
  currency,
  total,
  paidAmount,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    date: "",
    method: "",
    note: "",
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const remaining = Math.max(0, roundMoney(total - paidAmount));

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    function close() {
      setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuOpen]);

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estHeight = 360;
    const openUpward = rect.bottom + estHeight > window.innerHeight;
    const top = openUpward
      ? Math.max(8, rect.top - estHeight - 6)
      : rect.bottom + 6;
    const left = Math.max(
      8,
      Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
    );
    setMenuPos({ top, left });
    setMenuOpen(true);
  }

  async function changeStatus(next: string) {
    if (next === status) {
      setMenuOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(
          (data && typeof data.error === "string" && data.error) ||
            "Failed to change status. Please try again."
        );
        setBusy(false);
        return;
      }
      setMenuOpen(false);
      setBusy(false);
      router.refresh();
    } catch {
      alert("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function openPaymentModal() {
    setMenuOpen(false);
    setPayError(null);
    setPayForm({
      amount: remaining > 0 ? remaining.toFixed(2) : "",
      date: new Date().toISOString().slice(0, 10),
      method: "",
      note: "",
    });
    setPayOpen(true);
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaySaving(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payForm.amount),
          date: payForm.date,
          method: payForm.method || null,
          note: payForm.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(
          (data && typeof data.error === "string" && data.error) ||
            "Could not save payment. Check the amount and date."
        );
        setPaySaving(false);
        return;
      }
      setPayOpen(false);
      setPaySaving(false);
      router.refresh();
    } catch {
      setPayError("Network error. Please try again.");
      setPaySaving(false);
    }
  }

  async function remove() {
    setMenuOpen(false);
    if (!confirm("Delete this invoice permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete invoice. Please try again.");
        setBusy(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="row-menu">
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn row-menu-trigger"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Invoice actions"
        title="Invoice actions"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {menuOpen && menuPos && (
        <div
          ref={menuRef}
          className="row-menu-dropdown"
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        >
          <Link
            href={`/invoices/${id}/edit`}
            className="row-menu-item"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
          >
            <span aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            <span>Edit invoice</span>
          </Link>

          <button
            type="button"
            className="row-menu-item"
            role="menuitem"
            onClick={openPaymentModal}
          >
            <span aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
            <span>Add payment</span>
          </button>

          <div className="row-menu-sep" />
          <div className="row-menu-label">Change status</div>

          {invoiceStatuses.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              className="row-menu-item"
              onClick={() => changeStatus(s)}
              disabled={busy}
            >
              <span className="row-menu-check" aria-hidden>
                {s === status && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span>{STATUS_LABELS[s]}</span>
            </button>
          ))}

          <div className="row-menu-sep" />

          <button
            type="button"
            role="menuitem"
            className="row-menu-item row-menu-danger"
            onClick={remove}
            disabled={busy}
          >
            <span aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </span>
            <span>{busy ? "Working…" : "Delete invoice"}</span>
          </button>
        </div>
      )}

      {payOpen && (
        <div className="modal-backdrop" onClick={() => setPayOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Record payment</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  {remaining > 0
                    ? `${formatMoney(remaining, currency)} remaining on this invoice.`
                    : `Invoice total: ${formatMoney(total, currency)}`}
                </p>
              </div>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setPayOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="form-page" onSubmit={submitPayment}>
              <div className="form-grid">
                <div className="field">
                  <label>Amount ({currency})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={payForm.amount}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={payForm.date}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="field">
                  <label>Method</label>
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, method: e.target.value }))
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
                <div className="field full">
                  <label>Note</label>
                  <input
                    type="text"
                    value={payForm.note}
                    onChange={(e) =>
                      setPayForm((f) => ({ ...f, note: e.target.value }))
                    }
                    placeholder="Optional — e.g. upfront 50%"
                  />
                </div>
              </div>

              {payError && <p className="error">{payError}</p>}

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => setPayOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={paySaving}
                >
                  {paySaving ? "Saving…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
