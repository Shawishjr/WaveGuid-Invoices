"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/invoices";

type Client = {
  id: string;
  name: string;
  company: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
};

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceFormProps = {
  clients: Client[];
  templates: TemplateOption[];
  defaultTemplateId?: string | null;
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
    templateId?: string | null;
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

export function InvoiceForm({ clients, templates, defaultTemplateId, invoice }: InvoiceFormProps) {
  const router = useRouter();

  const initialClient = invoice
    ? clients.find((c) => c.id === invoice.clientId)
    : undefined;
  const initialClientName = initialClient
    ? initialClient.company || initialClient.name
    : "";

  const [clientName, setClientName] = useState(initialClientName);
  const [selectedClientId, setSelectedClientId] = useState(
    invoice?.clientId || ""
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState(invoice?.status || "draft");
  const [issueDate, setIssueDate] = useState(toInputDate(invoice?.issueDate));
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ? toInputDate(invoice.dueDate) : defaultDueDate()
  );
  const [currency, setCurrency] = useState(invoice?.currency || "USD");
  const [taxRate, setTaxRate] = useState(invoice?.taxRate ?? 0);
  const [templateId, setTemplateId] = useState<string>(
    invoice?.templateId || defaultTemplateId || ""
  );
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

  const suggestions = useMemo(() => {
    if (!clientName.trim()) return [];
    const query = clientName.toLowerCase().trim();
    return clients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.company && c.company.toLowerCase().includes(query))
      )
      .slice(0, 6);
  }, [clientName, clients]);

  const exactMatch = useMemo(() => {
    if (!clientName.trim()) return null;
    const query = clientName.toLowerCase().trim();
    return (
      clients.find(
        (c) =>
          c.name.toLowerCase() === query ||
          (c.company && c.company.toLowerCase() === query)
      ) || null
    );
  }, [clientName, clients]);

  function handleClientNameChange(value: string) {
    setClientName(value);
    setSelectedClientId("");
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  }

  function selectClient(client: Client) {
    setClientName(client.company || client.name);
    setSelectedClientId(client.id);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  }

  function handleClientBlur() {
    setTimeout(() => {
      setShowSuggestions(false);
      if (exactMatch && !selectedClientId) {
        setSelectedClientId(exactMatch.id);
      }
    }, 150);
  }

  function handleClientKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectClient(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  }

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let payloadClientId = selectedClientId;
    let payloadClientName: string | undefined;

    if (!payloadClientId) {
      if (exactMatch) {
        payloadClientId = exactMatch.id;
      } else if (clientName.trim()) {
        payloadClientName = clientName.trim();
      } else {
        setError("Please enter a client name.");
        setSaving(false);
        return;
      }
    }

    const payload = {
      clientId: payloadClientId || undefined,
      clientName: payloadClientName,
      status,
      issueDate,
      dueDate,
      currency,
      taxRate: Number(taxRate),
      templateId: templateId || null,
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

  return (
    <form className="form-page" onSubmit={onSubmit}>
      <section className="panel" style={{ padding: 20 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="clientName">Client</label>
            <div className="autocomplete">
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => handleClientNameChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={handleClientBlur}
                onKeyDown={handleClientKeyDown}
                placeholder="Type a client name…"
                required
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-list" ref={suggestionsRef}>
                  {suggestions.map((client, index) => (
                    <div
                      key={client.id}
                      className={`autocomplete-item${
                        index === activeSuggestion ? " active" : ""
                      }`}
                      onMouseDown={() => selectClient(client)}
                      onMouseEnter={() => setActiveSuggestion(index)}
                    >
                      <span className="autocomplete-primary">
                        {client.company || client.name}
                      </span>
                      {client.company && (
                        <span className="autocomplete-secondary">
                          {client.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showSuggestions &&
                suggestions.length === 0 &&
                clientName.trim() &&
                !exactMatch && (
                  <div className="autocomplete-list">
                    <div className="autocomplete-item new-client-hint">
                      <span className="autocomplete-primary">
                        + Create &ldquo;{clientName.trim()}&rdquo; as new client
                      </span>
                    </div>
                  </div>
                )}
            </div>
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
            <label htmlFor="templateId">PDF template</label>
            <select
              id="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Default layout</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
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
