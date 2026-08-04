"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/invoices";

type Client = {
  id: string;
  name: string;
  company: string | null;
};

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceFormProps = {
  clients: Client[];
  invoice?: {
    id: string;
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes: string | null;
    taxRate: number;
    clientId: string;
    items: Item[];
  };
};

const emptyItem: Item = { description: "", quantity: 1, unitPrice: 0 };

function toInputDate(value?: string) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function InvoiceForm({ clients, invoice }: InvoiceFormProps) {
  const router = useRouter();
  const [clientId, setClientId] = useState(invoice?.clientId || clients[0]?.id || "");
  const [status, setStatus] = useState(invoice?.status || "draft");
  const [issueDate, setIssueDate] = useState(toInputDate(invoice?.issueDate));
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? toInputDate(invoice.dueDate) : defaultDueDate()
  );
  const [currency, setCurrency] = useState(invoice?.currency || "USD");
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 0);
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [items, setItems] = useState<Item[]>(
    invoice?.items?.length ? invoice.items : [{ ...emptyItem }]
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );
    const taxAmount = (subtotal * Number(taxRate)) / 100;
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [items, taxRate]);

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      clientId,
      status,
      issueDate,
      dueDate,
      currency,
      taxRate: Number(taxRate),
      notes,
      number: invoice?.number,
      items: items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    try {
      const res = await fetch(
        invoice ? `/api/invoices/${invoice.id}` : "/api/invoices",
        {
          method: invoice ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError("Could not save invoice. Check required fields.");
        setSaving(false);
        return;
      }

      router.push(`/invoices/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setSaving(false);
    }
  }

  if (clients.length === 0) {
    return (
      <div className="panel">
        <div className="empty">
          Add a client before creating an invoice.{" "}
          <a href="/clients">Go to clients →</a>
        </div>
      </div>
    );
  }

  return (
    <form className="form-page" onSubmit={onSubmit}>
      <section className="panel" style={{ padding: 20 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="clientId">Client</label>
            <select
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="issueDate">Issue date</label>
            <input
              id="issueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="dueDate">Due date</label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="taxRate">Tax rate (%)</label>
            <input
              id="taxRate"
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <div className="field full">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you note, bank details…"
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Line items</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
          >
            Add item
          </button>
        </div>
        <div className="table-wrap">
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{ minWidth: 220 }}>
                    <input
                      required
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, { description: e.target.value })
                      }
                      placeholder="Service or product"
                    />
                  </td>
                  <td style={{ width: 100 }}>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, { quantity: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td style={{ width: 140 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    {formatMoney(
                      Number(item.quantity) * Number(item.unitPrice),
                      currency
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            <div>
              <span>Tax</span>
              <span>{formatMoney(totals.taxAmount, currency)}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{formatMoney(totals.total, currency)}</span>
            </div>
          </div>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="nav-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : invoice ? "Update invoice" : "Create invoice"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
