"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InvoiceActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this invoice permanently?")) return;
    setBusy(true);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
    router.refresh();
  }

  return (
    <div className="nav-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <a className="btn btn-primary" href={`/api/invoices/${id}/pdf`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12" />
          <path d="M8 9l4 4 4-4" />
          <path d="M5 19h14" />
        </svg>
        Export PDF
      </a>
      <a className="btn btn-secondary" href={`/invoices/${id}/edit`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit invoice
      </a>
      <button className="btn btn-danger" onClick={remove} disabled={busy}>
        {busy ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        )}
        {busy ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
