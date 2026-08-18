"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, roundMoney, VAT_RATE } from "@/lib/invoices";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email?: string | null;
  phone?: string | null;
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
  defaultClientId?: string;
  invoice?: {
    id: string;
    number: string;
    status: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    notes: string | null;
    subject: string | null;
    taxRate: number;
    vatAmount?: number;
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

export function InvoiceForm({ clients, templates, defaultTemplateId, defaultClientId, invoice }: InvoiceFormProps) {
  const router = useRouter();

  const presetClient = !invoice && defaultClientId
    ? clients.find((c) => c.id === defaultClientId)
    : undefined;
  const initialClient = invoice
    ? clients.find((c) => c.id === invoice.clientId)
    : presetClient;
  const initialClientName = initialClient
    ? initialClient.company || initialClient.name
    : "";

  const [clientName, setClientName] = useState(initialClientName);
  const [clientEmail, setClientEmail] = useState(initialClient?.email || "");
  const [clientPhone, setClientPhone] = useState(initialClient?.phone || "");
  const [selectedClientId, setSelectedClientId] = useState(
    invoice?.clientId || presetClient?.id || ""
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
  const [includeVat, setIncludeVat] = useState(
    invoice?.vatAmount ? invoice.vatAmount > 0 : false
  );
  const [templateId, setTemplateId] = useState<string>(
    invoice?.templateId || defaultTemplateId || ""
  );
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [subject, setSubject] = useState(invoice?.subject || "");
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
    const vatAmount = includeVat ? roundMoney((subtotal * VAT_RATE) / 100) : 0;
    return {
      subtotal,
      vatAmount,
      total: subtotal + vatAmount,
    };
  }, [items, includeVat]);

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
    setClientEmail(client.email || "");
    setClientPhone(client.phone || "");
    setShowSuggestions(false);
    setActiveSuggestion(-1);
  }

  function handleClientBlur() {
    setTimeout(() => {
      setShowSuggestions(false);
      if (exactMatch && !selectedClientId) {
        setSelectedClientId(exactMatch.id);
        if (!clientEmail.trim()) setClientEmail(exactMatch.email || "");
        if (!clientPhone.trim()) setClientPhone(exactMatch.phone || "");
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

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleItemDrop(targetIndex: number) {
    setItems((prev) => {
      if (dragIndex === null || dragIndex === targetIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
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
      clientEmail: clientEmail.trim(),
      clientPhone: clientPhone.trim(),
      status,
      issueDate,
      dueDate,
      currency,
      taxRate: 0,
      includeVat,
      templateId: templateId || null,
      notes,
      subject: subject.trim() || null,
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
            <label htmlFor="clientEmail">Client email</label>
            <input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="invoice will be emailed here"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="clientPhone">Client phone</label>
            <input
              id="clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+249 9… (WhatsApp)"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What is this invoice about?"
            />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="partly_paid">Partly paid</option>
              <option value="fully_paid">Fully paid</option>
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
              <option value="SDG">SDG</option>
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
          <div className="field field-vat">
            <label htmlFor="includeVat" className="vat-label">
              <input
                id="includeVat"
                type="checkbox"
                checked={includeVat}
                onChange={(e) => setIncludeVat(e.target.checked)}
              />
              Include VAT ({VAT_RATE}%)
            </label>
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
                <th className="items-grip-col" aria-label="Reorder" />
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={index}
                  className={dragIndex === index ? "is-dragging" : ""}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleItemDrop(index)}
                >
                  <td className="items-grip-col">
                    <span
                      className="items-grip"
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragEnd={() => setDragIndex(null)}
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.6" />
                        <circle cx="15" cy="6" r="1.6" />
                        <circle cx="9" cy="12" r="1.6" />
                        <circle cx="15" cy="12" r="1.6" />
                        <circle cx="9" cy="18" r="1.6" />
                        <circle cx="15" cy="18" r="1.6" />
                      </svg>
                    </span>
                  </td>
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
                      min="1"
                      step="1"
                      inputMode="numeric"
                      required
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          updateItem(index, { quantity: val });
                        }
                      }}
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
                    <div className="item-row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                        aria-label="Move up"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                        aria-label="Move down"
                        title="Move down"
                      >
                        ↓
                      </button>
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
                    </div>
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
            {includeVat && (
              <div>
                <span>VAT ({VAT_RATE}%)</span>
                <span>{formatMoney(totals.vatAmount, currency)}</span>
              </div>
            )}
            <div className="grand">
              <span>Grand total</span>
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
