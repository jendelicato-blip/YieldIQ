import { Suspense } from "react";
import { getActiveFunds } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import { formatCompactUsd, formatDate, formatPct } from "@/lib/format";
import ComparePicker from "@/components/fund/ComparePicker";

interface Row {
  label: string;
  get: (r: NonNullable<ReturnType<typeof computeFundRatings>>) => number | null;
  higherIsBetter: boolean;
  format: (v: number | null) => string;
}

const ROWS: Row[] = [
  { label: "Yield", get: (r) => r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null, higherIsBetter: true, format: (v) => formatPct(v) },
  { label: "SEC Yield", get: (r) => r.metrics?.sec_yield_30day_pct ?? null, higherIsBetter: true, format: (v) => (v != null ? formatPct(v) : "Not published") },
  { label: "Expense Ratio", get: (r) => r.metrics?.expense_ratio_pct ?? null, higherIsBetter: false, format: (v) => formatPct(v, 2) },
  { label: "AUM", get: (r) => r.metrics?.aum_usd ?? null, higherIsBetter: true, format: (v) => formatCompactUsd(v) },
  { label: "1Y Total Return", get: (r) => r.periodReturns.find((p) => p.period === "1Y")?.totalReturnReinvestedPct ?? r.periodReturns.find((p) => p.period === "1Y")?.totalReturnPct ?? null, higherIsBetter: true, format: (v) => (v != null ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "Insufficient history") },
  { label: "Max Drawdown", get: (r) => r.navAnalysis.maxDrawdownPct, higherIsBetter: true, format: (v) => (v != null ? `${v.toFixed(2)}%` : "Insufficient history") },
  { label: "Volatility (ann.)", get: (r) => r.navAnalysis.volatilityAnnualizedPct, higherIsBetter: false, format: (v) => (v != null ? formatPct(v) : "Insufficient history") },
  { label: "NAV Growth Score", get: (r) => r.navGrowth.score, higherIsBetter: true, format: (v) => (v != null ? v.toFixed(1) : "N/A") },
  { label: "Income Quality", get: (r) => r.incomeQuality.score, higherIsBetter: true, format: (v) => (v != null ? v.toFixed(1) : "N/A") },
  { label: "Risk Score", get: (r) => r.risk.score, higherIsBetter: false, format: (v) => (v != null ? `${v.toFixed(1)} / 10` : "N/A") },
  { label: "Avg. Return of Capital", get: (r) => r.avgRocPct, higherIsBetter: false, format: (v) => (v != null ? formatPct(v, 0) : "Not yet reported") },
  { label: "YieldIQ Score", get: (r) => r.yieldIqScore.score, higherIsBetter: true, format: (v) => (v != null ? v.toFixed(1) : "N/A") },
];

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const tickers = (typeof sp.t === "string" ? sp.t.split(",") : []).filter(Boolean).slice(0, 5);
  const rows = tickers.map((t) => computeFundRatings(t)).filter((r) => r !== null);
  const allFunds = getActiveFunds().sort((a, b) => a.ticker.localeCompare(b.ticker));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Compare Funds</h1>
      <p className="mt-1 text-sm text-muted">Select up to 5 funds. The strongest value in each row is highlighted.</p>

      <div className="mt-4">
        <Suspense fallback={null}>
          <ComparePicker allFunds={allFunds} selected={tickers} />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-sm text-muted">Add funds above to compare them.</div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Metric</th>
                {rows.map((r) => (
                  <th key={r!.fund.ticker} className="px-3 py-2.5 text-right font-medium text-foreground">
                    {r!.fund.ticker}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-3 pb-2 text-left font-normal">Distribution Frequency</th>
                {rows.map((r) => (
                  <th key={r!.fund.ticker} className="px-3 pb-2 text-right font-normal uppercase">
                    {r!.fund.distribution_frequency}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const values = rows.map((r) => row.get(r!));
                const numeric = values.filter((v): v is number => v != null);
                const best = numeric.length
                  ? row.higherIsBetter
                    ? Math.max(...numeric)
                    : Math.min(...numeric)
                  : null;
                return (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5 text-xs text-muted">{row.label}</td>
                    {values.map((v, i) => (
                      <td
                        key={rows[i]!.fund.ticker}
                        className={`tabular px-3 py-2.5 text-right ${
                          v != null && best != null && v === best ? "font-bold text-accent" : ""
                        }`}
                      >
                        {row.format(v)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <td className="px-3 py-2.5 text-xs text-muted">Inception</td>
                {rows.map((r) => (
                  <td key={r!.fund.ticker} className="px-3 py-2.5 text-right text-xs">
                    {formatDate(r!.fund.inception_date)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
