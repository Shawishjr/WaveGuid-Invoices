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
        Export PDF
      </a>
      <a className="btn btn-secondary" href={`/invoices/${id}/edit`}>
        Edit invoice
      </a>
      <button className="btn btn-danger" onClick={remove} disabled={busy}>
        {busy ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
