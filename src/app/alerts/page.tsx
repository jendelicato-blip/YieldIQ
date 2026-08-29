"use client";

import { useState } from "react";
import { useAlerts } from "@/lib/client-store";
import { getActiveFunds } from "@/lib/data";
import type { AlertType } from "@/lib/types";

const ALERT_LABELS: Record<AlertType, string> = {
  yield_above: "Yield goes above threshold",
  yield_below: "Yield falls below threshold",
  nav_drop_pct: "NAV falls more than threshold %",
  price_drop_pct: "Price drops more than threshold %",
  distribution_change: "Distribution amount changes",
  distribution_announced: "A new distribution is announced",
  roc_above: "Return of Capital exceeds threshold %",
  nav_rating_change: "NAV Growth rating changes",
};

const NEEDS_THRESHOLD: AlertType[] = ["yield_above", "yield_below", "nav_drop_pct", "price_drop_pct", "roc_above"];

export default function AlertsPage() {
  const { alerts, add, remove, toggleActive } = useAlerts();
  const funds = getActiveFunds().sort((a, b) => a.ticker.localeCompare(b.ticker));

  const [ticker, setTicker] = useState<string>("");
  const [type, setType] = useState<AlertType>("yield_above");
  const [threshold, setThreshold] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    add({
      ticker: ticker || null,
      alert_type: type,
      threshold: NEEDS_THRESHOLD.includes(type) && threshold ? parseFloat(threshold) : null,
    });
    setThreshold("");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Alerts</h1>
      <p className="mt-1 text-sm text-muted">
        Saved on this device. In production, alerts are evaluated by the daily ingestion job
        (see <code className="text-xs">docs/ARCHITECTURE.md</code>) and delivered by push/email.
      </p>

      <form onSubmit={onAdd} className="card mt-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="block text-xs text-muted">Fund (optional — leave blank for &ldquo;any fund&rdquo;)</label>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            <option value="">Any fund</option>
            {funds.map((f) => (
              <option key={f.ticker} value={f.ticker}>
                {f.ticker}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted">Condition</label>
          <select value={type} onChange={(e) => setType(e.target.value as AlertType)} className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            {Object.entries(ALERT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {NEEDS_THRESHOLD.includes(type) && (
          <div>
            <label className="block text-xs text-muted">Threshold (%)</label>
            <input value={threshold} onChange={(e) => setThreshold(e.target.value)} type="number" step="any" className="mt-1 w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
          </div>
        )}
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06110c]">
          Create Alert
        </button>
      </form>

      {alerts.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">No alerts set up yet.</div>
      ) : (
        <div className="card mt-6 divide-y divide-border">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <span className="font-semibold">{a.ticker ?? "Any fund"}</span>
                <span className="text-muted"> — {ALERT_LABELS[a.alert_type]}{a.threshold != null ? ` (${a.threshold}%)` : ""}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggleActive(a.id)} className={`text-xs font-semibold ${a.active ? "text-accent" : "text-muted"}`}>
                  {a.active ? "Active" : "Paused"}
                </button>
                <button onClick={() => remove(a.id)} className="text-xs text-muted hover:text-negative">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
