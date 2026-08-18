"use client";

import { useState } from "react";
import { formatDate } from "@/lib/invoices";

export function CurrencyRateForm({
  initialRate,
  updatedAt,
}: {
  initialRate: number;
  updatedAt: string;
}) {
  const [rate, setRate] = useState(String(initialRate));
  const [savedRate, setSavedRate] = useState(initialRate);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [usdAmount, setUsdAmount] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parsedRate = Number(rate);
  const rateValid = Number.isFinite(parsedRate) && parsedRate > 0;
  const parsedUsd = Number(usdAmount);
  const usdValid = Number.isFinite(parsedUsd);
  const sdgFromUsd = rateValid && usdValid ? parsedUsd * parsedRate : null;
  const usdFromSdg =
    rateValid && usdValid && parsedUsd !== 0 ? parsedUsd / parsedRate : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    if (!rateValid) {
      setError("Enter a valid positive rate.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/currency-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToSdg: parsedRate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to update the rate."
        );
        return;
      }
      setSavedRate(data.usdToSdg);
      setSavedAt(data.updatedAt);
      setSuccess(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>USD → SDG</h3>
      </div>

      {error && (
        <div className="client-toast" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <form className="form-page" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="usd-to-sdg">1 USD =</label>
            <input
              id="usd-to-sdg"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>SDG (Sudanese Pound)</label>
            <input value="1" readOnly disabled />
          </div>
          <div className="field full">
            <label>Last updated</label>
            <input value={formatDate(savedAt)} readOnly disabled />
          </div>
        </div>

        <div
          className="field full"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 16,
            background: "var(--surface-2)",
          }}
        >
          <label htmlFor="usd-amount">Quick converter</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              id="usd-amount"
              type="number"
              inputMode="decimal"
              step="any"
              value={usdAmount}
              onChange={(event) => setUsdAmount(event.target.value)}
              style={{ maxWidth: 160 }}
            />
            <strong>USD</strong>
            <span aria-hidden>⇄</span>
            <strong
              style={{
                minWidth: 160,
                display: "inline-block",
                color: rateValid ? "var(--ink)" : "var(--muted)",
              }}
            >
              {sdgFromUsd !== null
                ? `${sdgFromUsd.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })} SDG`
                : "—"}
            </strong>
          </div>
          {usdFromSdg !== null && parsedUsd !== 0 && (
            <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              {usdAmount} SDG ={" "}
              {usdFromSdg.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              USD (1 USD = {parsedRate.toLocaleString()} SDG)
            </p>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
          }}
        >
          {success && (
            <span style={{ color: "var(--success)", fontSize: "0.9rem" }}>
              Rate saved — 1 USD = {savedRate.toLocaleString()} SDG
            </span>
          )}
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving || !rateValid}
          >
            {saving ? "Saving…" : "Save rate"}
          </button>
        </div>
      </form>
    </section>
  );
}
