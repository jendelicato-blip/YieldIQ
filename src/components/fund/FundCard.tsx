import Link from "next/link";
import type { ComputedFundRatings } from "@/lib/ratings/compute";
import { getManagerBySlug } from "@/lib/data";
import { formatPct } from "@/lib/format";
import { FrequencyBadge } from "@/components/ui/Badges";
import StarRating from "@/components/ui/StarRating";

export default function FundCard({ r }: { r: ComputedFundRatings }) {
  const manager = getManagerBySlug(r.fund.manager_slug);
  const yieldPct = r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;

  return (
    <Link
      href={`/funds/${r.fund.ticker}`}
      className="card group block p-4 transition-colors hover:border-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">{r.fund.ticker}</span>
            <FrequencyBadge frequency={r.fund.distribution_frequency} />
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{r.fund.fund_name}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">{manager?.name}</p>
        </div>
        <div className="text-right">
          <p className="tabular text-xl font-bold text-foreground">
            {r.metrics?.price != null ? `$${r.metrics.price.toFixed(2)}` : "—"}
          </p>
          <p className="tabular text-xs text-muted">
            {r.metrics ? `as of ${r.metrics.as_of_date}` : "no data"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Yield</p>
          <p className="tabular mt-0.5 text-sm font-bold text-accent">{formatPct(yieldPct)}</p>
        </div>
        <div className="rounded-lg bg-surface-2 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">NAV Growth</p>
          <p className="mt-0.5 text-sm font-bold">
            {r.navGrowth.stars != null ? r.navGrowth.stars.toFixed(1) + "★" : "N/A"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-2 px-2 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted">Risk</p>
          <p className="tabular mt-0.5 text-sm font-bold">
            {r.risk.score != null ? r.risk.score.toFixed(1) + "/10" : "N/A"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StarRating value={r.incomeQuality.stars} size={13} showValue={false} />
        <span className="text-xs text-muted">Income Quality</span>
      </div>
    </Link>
  );
}
