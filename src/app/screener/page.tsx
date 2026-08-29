import { Suspense } from "react";
import { getActiveFunds, getManagers } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import FilterBar from "@/components/fund/FilterBar";
import ScreenerTable from "@/components/fund/ScreenerTable";
import InvestorWarning from "@/components/ui/InvestorWarning";

export default async function ScreenerPage({ searchParams }: PageProps<"/screener">) {
  const sp = await searchParams;
  const managerFilter = typeof sp.manager === "string" ? sp.manager : "";
  const strategyFilter = typeof sp.strategy === "string" ? sp.strategy : "";
  const frequencyFilter = typeof sp.frequency === "string" ? sp.frequency : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "yield";
  const minYield = typeof sp.minYield === "string" ? parseFloat(sp.minYield) : null;
  const maxRisk = typeof sp.maxRisk === "string" ? parseFloat(sp.maxRisk) : null;

  let funds = getActiveFunds();
  if (managerFilter) funds = funds.filter((f) => f.manager_slug === managerFilter);
  if (strategyFilter) funds = funds.filter((f) => f.strategy_category === strategyFilter);
  if (frequencyFilter) funds = funds.filter((f) => f.distribution_frequency === frequencyFilter);

  let rows = funds.map((f) => computeFundRatings(f.ticker)).filter((r) => r !== null);

  if (minYield != null && !Number.isNaN(minYield)) {
    rows = rows.filter((r) => {
      const y = r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct;
      return y != null && y >= minYield;
    });
  }
  if (maxRisk != null && !Number.isNaN(maxRisk)) {
    rows = rows.filter((r) => r.risk.score != null && r.risk.score <= maxRisk);
  }

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
      default:
        return r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;
    }
  };
  rows.sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });

  const managers = getManagers().map((m) => ({ slug: m.slug, name: m.name }));
  const strategies = Array.from(new Set(getActiveFunds().map((f) => f.strategy_category))).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">High-Yield Screener</h1>
      <p className="mt-1 text-sm text-muted">{rows.length} funds match your filters.</p>

      <div className="mt-4">
        <Suspense fallback={null}>
          <FilterBar managers={managers} strategies={strategies} />
        </Suspense>
      </div>

      <form className="mt-3 flex flex-wrap items-center gap-3 text-sm" action="/screener">
        <input type="hidden" name="manager" value={managerFilter} />
        <input type="hidden" name="strategy" value={strategyFilter} />
        <input type="hidden" name="frequency" value={frequencyFilter} />
        <input type="hidden" name="sort" value={sort} />
        <label className="flex items-center gap-1.5">
          Min yield %
          <input name="minYield" defaultValue={sp.minYield as string} type="number" step="any" className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5" />
        </label>
        <label className="flex items-center gap-1.5">
          Max risk (1-10)
          <input name="maxRisk" defaultValue={sp.maxRisk as string} type="number" step="any" min="1" max="10" className="w-20 rounded-lg border border-border bg-surface-2 px-2 py-1.5" />
        </label>
        <button type="submit" className="rounded-lg border border-accent px-3 py-1.5 text-xs font-semibold text-accent">
          Apply
        </button>
      </form>

      <div className="mt-4">
        <InvestorWarning compact />
      </div>

      <div className="mt-6">
        <ScreenerTable rows={rows} />
      </div>
    </div>
  );
}
