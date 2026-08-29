"use client";

import { useMemo, useState } from "react";
import { usePortfolio } from "@/lib/client-store";
import { getActiveFunds } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import { formatCurrency, formatPct, formatSignedPct } from "@/lib/format";
import InvestorWarning from "@/components/ui/InvestorWarning";
import { computeAdjustedBasis, estimateRocReceived, TAX_DISCLAIMER } from "@/lib/tax";

export default function PortfolioPage() {
  const { holdings, add, remove } = usePortfolio();
  const funds = useMemo(() => getActiveFunds().sort((a, b) => a.ticker.localeCompare(b.ticker)), []);

  const [ticker, setTicker] = useState(funds[0]?.ticker ?? "");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const sharesNum = parseFloat(shares);
    const costNum = parseFloat(avgCost);
    if (!ticker || !Number.isFinite(sharesNum) || sharesNum <= 0 || !Number.isFinite(costNum) || costNum <= 0) return;
    add({ ticker, shares: sharesNum, avg_cost: costNum });
    setShares("");
    setAvgCost("");
  }

  const rows = holdings.map((h) => {
    const r = computeFundRatings(h.ticker);
    const price = r?.metrics?.price ?? null;
    const yieldPct = r?.metrics?.ttm_yield_pct ?? r?.metrics?.distribution_yield_pct ?? null;
    const currentValue = price != null ? price * h.shares : null;
    const costBasis = h.avg_cost * h.shares;
    const unrealizedGainLoss = currentValue != null ? currentValue - costBasis : null;
    const yieldOnCost = yieldPct != null ? (yieldPct * price!) / h.avg_cost : null; // approx using current distribution rate on cost basis
    const estAnnualIncome = yieldPct != null && currentValue != null ? (yieldPct / 100) * currentValue : null;
    const rocReceived = estimateRocReceived(h.ticker, h.shares);
    const basis = computeAdjustedBasis(costBasis, rocReceived);
    return { holding: h, ratings: r, price, yieldPct, currentValue, costBasis, unrealizedGainLoss, yieldOnCost, estAnnualIncome, basis };
  });

  const totalValue = rows.reduce((s, r) => s + (r.currentValue ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0);
  const totalAnnualIncome = rows.reduce((s, r) => s + (r.estAnnualIncome ?? 0), 0);
  const weightedYield = totalValue > 0 ? (totalAnnualIncome / totalValue) * 100 : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <p className="mt-1 text-sm text-muted">Saved on this device. Nothing here is sent anywhere.</p>

      <div className="mt-4">
        <InvestorWarning compact />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Value" value={formatCurrency(totalValue)} />
        <Stat label="Est. Annual Income" value={formatCurrency(totalAnnualIncome)} />
        <Stat label="Est. Monthly Income" value={formatCurrency(totalAnnualIncome / 12)} />
        <Stat label="Est. Weekly Income" value={formatCurrency(totalAnnualIncome / 52)} />
        <Stat label="Weighted Yield" value={formatPct(weightedYield)} />
        <Stat
          label="Unrealized Gain/Loss"
          value={formatCurrency(totalValue - totalCost)}
        />
      </div>

      <form onSubmit={onAdd} className="card mt-8 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="block text-xs text-muted">Ticker</label>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            {funds.map((f) => (
              <option key={f.ticker} value={f.ticker}>
                {f.ticker}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted">Shares</label>
          <input value={shares} onChange={(e) => setShares(e.target.value)} type="number" min="0" step="any" className="mt-1 w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-muted">Avg. Cost / Share</label>
          <input value={avgCost} onChange={(e) => setAvgCost(e.target.value)} type="number" min="0" step="any" className="mt-1 w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#06110c]">
          Add Holding
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">No holdings added yet.</div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Ticker</th>
                <th className="pb-2 text-right font-medium">Shares</th>
                <th className="pb-2 text-right font-medium">Avg Cost</th>
                <th className="pb-2 text-right font-medium">Current Value</th>
                <th className="pb-2 text-right font-medium">Yield on Cost</th>
                <th className="pb-2 text-right font-medium">Current Yield</th>
                <th className="pb-2 text-right font-medium">Unrealized G/L</th>
                <th className="pb-2 text-right font-medium">Est. Annual Income</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.holding.id} className="border-t border-border">
                  <td className="py-2 font-semibold">{r.holding.ticker}</td>
                  <td className="tabular py-2 text-right">{r.holding.shares}</td>
                  <td className="tabular py-2 text-right">{formatCurrency(r.holding.avg_cost)}</td>
                  <td className="tabular py-2 text-right">{r.currentValue != null ? formatCurrency(r.currentValue) : "Data unavailable"}</td>
                  <td className="tabular py-2 text-right">{r.yieldOnCost != null ? formatPct(r.yieldOnCost) : "—"}</td>
                  <td className="tabular py-2 text-right">{formatPct(r.yieldPct)}</td>
                  <td className="tabular py-2 text-right">
                    {r.unrealizedGainLoss != null ? (
                      <span className={r.unrealizedGainLoss >= 0 ? "text-positive" : "text-negative"}>
                        {formatSignedPct((r.unrealizedGainLoss / r.costBasis) * 100)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="tabular py-2 text-right">{r.estAnnualIncome != null ? formatCurrency(r.estAnnualIncome) : "—"}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => remove(r.holding.id)} className="text-xs text-muted hover:text-negative">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold">Tax Basis (Estimated)</h2>
          <p className="mt-1 text-xs text-muted">
            ROC Received reflects reported Return of Capital across the distributions YieldIQ
            has on record for each ticker, not necessarily your full holding period — actual
            tax basis depends on your individual transactions and tax circumstances. Use your
            official brokerage records and tax documents for tax reporting.
          </p>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-3 py-2.5 font-medium">Ticker</th>
                  <th className="px-3 py-2.5 text-right font-medium">Original Cost Basis</th>
                  <th className="px-3 py-2.5 text-right font-medium">ROC Received</th>
                  <th className="px-3 py-2.5 text-right font-medium">Est. Adjusted Basis</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.holding.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{r.holding.ticker}</td>
                    <td className="tabular px-3 py-2 text-right">{formatCurrency(r.basis.originalCost)}</td>
                    <td className="tabular px-3 py-2 text-right">
                      {r.basis.rocReceived > 0 ? formatCurrency(r.basis.rocReceived) : "Not yet reported"}
                    </td>
                    <td className="tabular px-3 py-2 text-right font-semibold">{formatCurrency(r.basis.adjustedBasis)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted">{TAX_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="tabular text-lg font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
