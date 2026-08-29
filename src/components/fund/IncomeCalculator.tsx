"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { ComputedFundRatings } from "@/lib/ratings/compute";

const AMOUNTS = [5000, 10000, 25000, 50000, 100000];

export default function IncomeCalculator({
  rows,
  cadenceLabel,
  latestDistributionByTicker,
}: {
  rows: ComputedFundRatings[];
  cadenceLabel: "week" | "month";
  latestDistributionByTicker: Record<string, number | null>;
}) {
  const [amount, setAmount] = useState(10000);
  const [ticker, setTicker] = useState(rows[0]?.fund.ticker ?? "");

  const selected = rows.find((r) => r.fund.ticker === ticker) ?? rows[0];
  const price = selected?.metrics?.price ?? null;

  // Use the most recent verified per-share distribution amount (not a forecast)
  // to estimate how many payments $amount of shares would have received.
  const perShareAmount = selected ? latestDistributionByTicker[selected.fund.ticker] ?? null : null;

  const shares = price != null && price > 0 ? amount / price : null;
  const estPerPayment = shares != null && perShareAmount != null ? shares * perShareAmount : null;

  return (
    <div className="card p-4">
      <p className="font-semibold">
        If I invest $X, approximately how much has this fund historically distributed per {cadenceLabel}?
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted">Fund</label>
          <select value={ticker} onChange={(e) => setTicker(e.target.value)} className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            {rows.map((r) => (
              <option key={r.fund.ticker} value={r.fund.ticker}>
                {r.fund.ticker}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted">Investment amount</label>
          <select value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
            {AMOUNTS.map((a) => (
              <option key={a} value={a}>
                {formatCurrency(a, 0)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-surface-2 p-4">
        {estPerPayment != null ? (
          <>
            <p className="tabular text-2xl font-bold text-accent">{formatCurrency(estPerPayment)}</p>
            <p className="text-xs text-muted">
              Estimated per {cadenceLabel}, based on the most recent verified distribution of{" "}
              {formatCurrency(perShareAmount, 4)}/share and a current price of {formatCurrency(price)}.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Insufficient verified data to estimate this fund.</p>
        )}
        <p className="mt-2 text-[11px] text-caution">
          This is an estimate based on the single most recent historical distribution, not a
          projection or guarantee. Future distributions can change or stop entirely.
        </p>
      </div>
    </div>
  );
}
