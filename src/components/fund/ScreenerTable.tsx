import Link from "next/link";
import type { ComputedFundRatings } from "@/lib/ratings/compute";
import { getManagerBySlug } from "@/lib/data";
import { formatCompactUsd, formatPct } from "@/lib/format";
import { ReturnValue, FrequencyBadge } from "@/components/ui/Badges";

export default function ScreenerTable({ rows }: { rows: ComputedFundRatings[] }) {
  if (rows.length === 0) {
    return <div className="card p-8 text-center text-sm text-muted">No funds match these filters.</div>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-3 py-2.5 font-medium">Ticker</th>
            <th className="px-3 py-2.5 font-medium">Manager</th>
            <th className="px-3 py-2.5 font-medium">Freq.</th>
            <th className="px-3 py-2.5 text-right font-medium">Yield</th>
            <th className="px-3 py-2.5 text-right font-medium">1Y Total Return</th>
            <th className="px-3 py-2.5 text-right font-medium">NAV Growth</th>
            <th className="px-3 py-2.5 text-right font-medium">Income Quality</th>
            <th className="px-3 py-2.5 text-right font-medium">Risk</th>
            <th className="px-3 py-2.5 text-right font-medium">Expense</th>
            <th className="px-3 py-2.5 text-right font-medium">AUM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const manager = getManagerBySlug(r.fund.manager_slug);
            const oneYear = r.periodReturns.find((p) => p.period === "1Y");
            const yieldPct = r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;
            return (
              <tr key={r.fund.ticker} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-3 py-2.5">
                  <Link href={`/funds/${r.fund.ticker}`} className="font-semibold text-foreground hover:text-accent">
                    {r.fund.ticker}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">{manager?.name}</td>
                <td className="px-3 py-2.5">
                  <FrequencyBadge frequency={r.fund.distribution_frequency} />
                </td>
                <td className="tabular px-3 py-2.5 text-right font-semibold text-accent">{formatPct(yieldPct)}</td>
                <td className="px-3 py-2.5 text-right">
                  <ReturnValue value={oneYear?.totalReturnReinvestedPct ?? oneYear?.totalReturnPct ?? null} />
                </td>
                <td className="tabular px-3 py-2.5 text-right">{r.navGrowth.score != null ? r.navGrowth.score.toFixed(0) : "N/A"}</td>
                <td className="tabular px-3 py-2.5 text-right">{r.incomeQuality.score != null ? r.incomeQuality.score.toFixed(0) : "N/A"}</td>
                <td className="tabular px-3 py-2.5 text-right">{r.risk.score != null ? r.risk.score.toFixed(1) : "N/A"}</td>
                <td className="tabular px-3 py-2.5 text-right">{formatPct(r.metrics?.expense_ratio_pct ?? null, 2)}</td>
                <td className="tabular px-3 py-2.5 text-right">{formatCompactUsd(r.metrics?.aum_usd ?? null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
