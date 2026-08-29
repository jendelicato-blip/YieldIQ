import { notFound } from "next/navigation";
import Link from "next/link";
import { getDistributions, getFundByTicker, getFunds, getHoldings, getManagerBySlug, getNavHistory } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import { formatCurrency, formatPct, STRATEGY_LABELS } from "@/lib/format";
import { FrequencyBadge, ReturnValue, VerificationBadge } from "@/components/ui/Badges";
import StarRating from "@/components/ui/StarRating";
import FundTabs from "@/components/fund/FundTabs";
import WatchlistButton from "@/components/fund/WatchlistButton";

export function generateStaticParams() {
  return getFunds().map((f) => ({ ticker: f.ticker }));
}

export default async function FundDetailPage({ params }: PageProps<"/funds/[ticker]">) {
  const { ticker } = await params;
  const fund = getFundByTicker(ticker);
  if (!fund) notFound();
  const manager = getManagerBySlug(fund.manager_slug);
  if (!manager) notFound();

  const ratings = computeFundRatings(fund.ticker);
  if (!ratings) notFound();

  const distributions = getDistributions(fund.ticker);
  const holdings = getHoldings(fund.ticker);
  const navHistory = getNavHistory(fund.ticker);
  const m = ratings.metrics;
  const oneYear = ratings.periodReturns.find((p) => p.period === "1Y");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href={`/managers/${manager.slug}`} className="text-xs text-muted hover:text-accent">
        ← {manager.name}
      </Link>

      {fund.status !== "active" && (
        <div className="mt-3 rounded-lg border border-caution/30 bg-caution/10 px-3 py-2 text-sm text-caution">
          Status: {fund.status.replace(/_/g, " ").toUpperCase()}
          {fund.status_note ? ` — ${fund.status_note}` : ""}
        </div>
      )}
      {fund.status === "active" && fund.status_note && (
        <div className="mt-3 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">
          {fund.status_note}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold">{fund.ticker}</h1>
            <FrequencyBadge frequency={fund.distribution_frequency} />
          </div>
          <p className="mt-1 text-muted">{fund.fund_name}</p>
          <p className="text-xs text-muted">
            {manager.name} · {STRATEGY_LABELS[fund.strategy_category]}
          </p>
        </div>
        <WatchlistButton ticker={fund.ticker} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-6">
        <div>
          <p className="tabular text-4xl font-extrabold">
            {m?.price != null ? formatCurrency(m.price) : "Data unavailable"}
          </p>
          <p className="text-xs text-muted">{m ? `as of ${m.as_of_date}` : "no verified price yet"}</p>
        </div>
        <div>
          <p className="tabular text-2xl font-bold text-accent">
            {formatPct(m?.distribution_yield_pct ?? m?.ttm_yield_pct ?? null)}
          </p>
          <p className="text-xs text-muted">Distribution Yield</p>
        </div>
        {m?.data_source && (
          <div className="ml-auto text-right text-xs text-muted">
            <VerificationBadge status={m.verification_status} />
            <p className="mt-1">
              Source: {m.data_source}
              {m.source_url && (
                <>
                  {" · "}
                  <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    view
                  </a>
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <RatingPill label="NAV Growth" stars={ratings.navGrowth.stars} />
        <RatingPill label="Income Quality" stars={ratings.incomeQuality.stars} />
        <RatingPill label="Risk" value={ratings.risk.score != null ? `${ratings.risk.score.toFixed(1)}/10` : null} sub={ratings.risk.label ?? undefined} />
      </div>

      {oneYear && !oneYear.insufficientHistory && (
        <div className="mt-4 card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">1-Year Snapshot</p>
          <div className="mt-2 flex flex-wrap gap-6 text-sm">
            <span>
              Price Return: <ReturnValue value={oneYear.priceReturnPct} />
            </span>
            <span>
              Income Distributed: <ReturnValue value={oneYear.distributionReturnPct} />
            </span>
            <span>
              Total Return: <ReturnValue value={oneYear.totalReturnReinvestedPct ?? oneYear.totalReturnPct} />
            </span>
          </div>
        </div>
      )}

      <div className="mt-8">
        <FundTabs fund={fund} ratings={ratings} distributions={distributions} holdings={holdings} navHistory={navHistory} />
      </div>
    </div>
  );
}

function RatingPill({ label, stars, value, sub }: { label: string; stars?: number | null; value?: string | null; sub?: string }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 flex justify-center">
        {stars !== undefined ? <StarRating value={stars} size={13} showValue={false} /> : <span className="tabular font-bold">{value ?? "N/A"}</span>}
      </div>
      {sub && <p className="mt-0.5 text-[10px] text-muted">{sub}</p>}
    </div>
  );
}
