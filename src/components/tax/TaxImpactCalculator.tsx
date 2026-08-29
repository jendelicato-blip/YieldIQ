"use client";

import { useMemo, useState } from "react";
import { computeTaxImpactExample } from "@/lib/tax";
import { formatCurrency, formatPct } from "@/lib/format";

const PRESETS = [
  { label: "100% Ordinary Income", rocFraction: 0 },
  { label: "50% ROC / 50% Ordinary Income", rocFraction: 0.5 },
  { label: "100% ROC", rocFraction: 1 },
  { label: "Custom / other reported classification", rocFraction: null as number | null },
];

export default function TaxImpactCalculator() {
  const [investment, setInvestment] = useState(25000);
  const [distributionRatePct, setDistributionRatePct] = useState(20);
  const [presetIndex, setPresetIndex] = useState(0);
  const [customRocPct, setCustomRocPct] = useState(50);

  const distributionAmount = (investment * distributionRatePct) / 100;
  const rocFraction =
    PRESETS[presetIndex].rocFraction ?? customRocPct / 100;
  const result = useMemo(
    () => computeTaxImpactExample(distributionAmount, rocFraction),
    [distributionAmount, rocFraction],
  );

  return (
    <div className="card p-4">
      <p className="font-semibold">Tax Impact Example</p>
      <p className="mt-1 text-xs text-muted">
        An educational example only — not a personalized tax calculation. Real fund
        distributions are classified by the fund itself, not chosen by you.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted">Investment</label>
          <input
            type="number"
            min="0"
            step="any"
            value={investment}
            onChange={(e) => setInvestment(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted">Annual Distribution Rate</label>
          <input
            type="number"
            min="0"
            max="200"
            step="any"
            value={distributionRatePct}
            onChange={(e) => setDistributionRatePct(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted">
        Distribution: <span className="tabular font-semibold text-foreground">{formatCurrency(distributionAmount)}</span>
      </p>

      <div className="mt-4">
        <label className="block text-xs text-muted">Classification mix</label>
        <select
          value={presetIndex}
          onChange={(e) => setPresetIndex(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm sm:w-auto"
        >
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
        {PRESETS[presetIndex].rocFraction === null && (
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={customRocPct}
              onChange={(e) => setCustomRocPct(Number(e.target.value))}
              className="flex-1"
            />
            <span className="tabular w-14 text-right text-sm">{customRocPct}% ROC</span>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-surface-2 p-4 text-sm">
        <p className="font-semibold">
          {formatCurrency(result.distributionAmount)} distribution, {formatPct(result.rocFraction * 100, 0)} ROC
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Generally not immediately taxable (ROC — basis reduction)</p>
            <p className="tabular text-lg font-bold text-info">{formatCurrency(result.rocAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Potentially taxable as current income</p>
            <p className="tabular text-lg font-bold text-caution">{formatCurrency(result.taxableAmount)}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        These are conceptual educational examples, not personalized tax calculations. Actual
        classification is determined by the fund and may include ordinary income, qualified
        dividends, and capital gains in addition to or instead of ROC.
      </p>
    </div>
  );
}
