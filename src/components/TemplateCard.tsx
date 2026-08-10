"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  name: string;
  elementCount: number;
  invoiceCount: number;
  isDefault: boolean;
};

export function TemplateCard({ id, name, elementCount, invoiceCount, isDefault }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function makeDefault() {
    setBusy(true);
    await fetch("/api/templates/default", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Delete "${name}"? Invoices using it will fall back to the default template.`)) return;
    setBusy(true);
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="template-card">
      <div className="template-card-head">
        <div>
          <h3>{name}</h3>
          <p className="muted">
            {elementCount} elements · {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}
          </p>
        </div>
        {isDefault && <span className="badge-default">Default</span>}
      </div>

      <a
        className="template-thumb"
        href={`/api/templates/${id}/preview`}
        target="_blank"
        rel="noreferrer"
        title="Preview PDF"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v5h5" />
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        </svg>
        <span>Preview PDF</span>
      </a>

      <div className="template-card-actions">
        <a className="btn btn-primary btn-sm" href={`/templates/${id}/edit`}>Edit</a>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={makeDefault}
          disabled={busy || isDefault}
        >
          Set default
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
    </div>
  );
}
