import { Suspense } from "react";
import { getActiveFunds, getManagers, searchFunds } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import FundCard from "@/components/fund/FundCard";
import FilterBar from "@/components/fund/FilterBar";
import InvestorWarning from "@/components/ui/InvestorWarning";
import Link from "next/link";
import { getFundTaxProfile, taxEfficiencySortValue } from "@/lib/tax";

const TICKER_CORRECTIONS: Record<string, string[]> = {
  GIPQ: ["GPIQ"],
  GIPX: ["GPIX"],
};

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const managerFilter = typeof sp.manager === "string" ? sp.manager : "";
  const strategyFilter = typeof sp.strategy === "string" ? sp.strategy : "";
  const frequencyFilter = typeof sp.frequency === "string" ? sp.frequency : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "yield";

  let funds = q ? searchFunds(q) : getActiveFunds();
  funds = funds.filter((f) => f.status === "active");
  if (managerFilter) funds = funds.filter((f) => f.manager_slug === managerFilter);
  if (strategyFilter) funds = funds.filter((f) => f.strategy_category === strategyFilter);
  if (frequencyFilter) funds = funds.filter((f) => f.distribution_frequency === frequencyFilter);

  const ratings = funds.map((f) => computeFundRatings(f.ticker)).filter((r) => r !== null);

  const valueFor = (r: NonNullable<ReturnType<typeof computeFundRatings>>) => {
    switch (sort) {
      case "nav_growth":
        return r.navGrowth.score;
      case "total_return":
        return r.periodReturns.find((p) => p.period === "1Y")?.totalReturnReinvestedPct ?? null;
      case "income_quality":
        return r.incomeQuality.score;
      case "risk_low":
        return r.risk.score != null ? -r.risk.score : null;
      case "newest":
        return r.fund.inception_date ? new Date(r.fund.inception_date).getTime() : null;
      case "ticker":
        return null;
      case "roc_high":
        return getFundTaxProfile(r.fund.ticker)?.roc_pct ?? null;
      case "qualified_high":
        return getFundTaxProfile(r.fund.ticker)?.qualified_dividend_pct ?? null;
      case "ordinary_low": {
        const v = getFundTaxProfile(r.fund.ticker)?.ordinary_income_pct;
        return v != null ? -v : null;
      }
      case "tax_efficient":
        return taxEfficiencySortValue(getFundTaxProfile(r.fund.ticker));
      default:
        return r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;
    }
  };

  if (sort === "ticker") {
    ratings.sort((a, b) => a.fund.ticker.localeCompare(b.fund.ticker));
  } else {
    ratings.sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }

  const managers = getManagers().map((m) => ({ slug: m.slug, name: m.name }));
  const strategies = Array.from(new Set(getActiveFunds().map((f) => f.strategy_category))).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Explore Funds</h1>
      <p className="mt-1 text-sm text-muted">
        {q ? (
          <>
            {ratings.length} result{ratings.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </>
        ) : (
          `${ratings.length} active income funds`
        )}
      </p>

      {TICKER_CORRECTIONS[q.toUpperCase()] && (
        <div className="mt-3 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">
          &ldquo;{q.toUpperCase()}&rdquo; is not a real, currently-listed ticker. Did you mean{" "}
          {TICKER_CORRECTIONS[q.toUpperCase()].map((t, i) => (
            <span key={t}>
              {i > 0 && ", "}
              <Link href={`/funds/${t}`} className="font-semibold underline">
                {t}
              </Link>
            </span>
          ))}
          ?
        </div>
      )}

      <div className="mt-4">
        <Suspense fallback={null}>
          <FilterBar managers={managers} strategies={strategies} />
        </Suspense>
      </div>

      <div className="mt-4">
        <InvestorWarning compact />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ratings.map((r) => (
          <FundCard key={r.fund.ticker} r={r} />
        ))}
      </div>

      {ratings.length === 0 && (
        <div className="card mt-6 p-8 text-center text-sm text-muted">
          No funds match these filters yet.
        </div>
      )}
    </div>
  );
}
