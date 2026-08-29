import { getActiveFunds, getDistributions } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import ScreenerTable from "@/components/fund/ScreenerTable";
import IncomeCalculator from "@/components/fund/IncomeCalculator";
import InvestorWarning from "@/components/ui/InvestorWarning";

export default function MonthlyIncomePage() {
  const funds = getActiveFunds().filter((f) => f.distribution_frequency === "monthly");
  const rows = funds
    .map((f) => computeFundRatings(f.ticker))
    .filter((r) => r !== null)
    .sort((a, b) => {
      const av = a.metrics?.ttm_yield_pct ?? a.metrics?.distribution_yield_pct ?? -1;
      const bv = b.metrics?.ttm_yield_pct ?? b.metrics?.distribution_yield_pct ?? -1;
      return bv - av;
    });

  const latestDistributionByTicker: Record<string, number | null> = {};
  for (const f of funds) {
    latestDistributionByTicker[f.ticker] = getDistributions(f.ticker)[0]?.amount_per_share ?? null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Monthly Income</h1>
      <p className="mt-1 text-sm text-muted">{rows.length} funds distribute monthly, ranked by yield.</p>

      <div className="mt-4">
        <InvestorWarning />
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <IncomeCalculator rows={rows} cadenceLabel="month" latestDistributionByTicker={latestDistributionByTicker} />
        </div>
      )}

      <div className="mt-6">
        <ScreenerTable rows={rows} />
      </div>
    </div>
  );
}
