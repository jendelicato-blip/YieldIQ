import { getActiveFunds, getDataAsOfDate } from "@/lib/data";
import { computeFundRatings, type ComputedFundRatings } from "@/lib/ratings/compute";

let cache: ComputedFundRatings[] | null = null;

export function getAllComputedRatings(): ComputedFundRatings[] {
  if (cache) return cache;
  const funds = getActiveFunds();
  cache = funds
    .map((f) => computeFundRatings(f.ticker))
    .filter((r): r is ComputedFundRatings => r !== null);
  return cache;
}

function headlineYield(r: ComputedFundRatings): number | null {
  return r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;
}

function totalReturnFor(r: ComputedFundRatings, period: "6M" | "1Y"): number | null {
  const p = r.periodReturns.find((p) => p.period === period);
  return p?.totalReturnReinvestedPct ?? p?.totalReturnPct ?? null;
}

export function rankBy(
  key:
    | "yield"
    | "nav_growth"
    | "total_return"
    | "total_return_6m"
    | "income_quality"
    | "risk_low"
    | "yieldiq_score"
    | "newest"
    | "liquidity",
  limit = 10,
  filter?: (r: ComputedFundRatings) => boolean,
): ComputedFundRatings[] {
  let rows = getAllComputedRatings();
  if (filter) rows = rows.filter(filter);

  switch (key) {
    case "yield":
      rows = rows.filter((r) => headlineYield(r) != null);
      rows.sort((a, b) => (headlineYield(b) as number) - (headlineYield(a) as number));
      break;
    case "nav_growth":
      rows = rows.filter((r) => r.navGrowth.score != null);
      rows.sort((a, b) => (b.navGrowth.score as number) - (a.navGrowth.score as number));
      break;
    case "total_return": {
      rows = rows.filter((r) => totalReturnFor(r, "1Y") != null);
      rows.sort((a, b) => (totalReturnFor(b, "1Y") as number) - (totalReturnFor(a, "1Y") as number));
      break;
    }
    case "total_return_6m": {
      rows = rows.filter((r) => totalReturnFor(r, "6M") != null);
      rows.sort((a, b) => (totalReturnFor(b, "6M") as number) - (totalReturnFor(a, "6M") as number));
      break;
    }
    case "income_quality":
      rows = rows.filter((r) => r.incomeQuality.score != null);
      rows.sort((a, b) => (b.incomeQuality.score as number) - (a.incomeQuality.score as number));
      break;
    case "risk_low":
      rows = rows.filter((r) => r.risk.score != null);
      rows.sort((a, b) => (a.risk.score as number) - (b.risk.score as number));
      break;
    case "yieldiq_score":
      rows = rows.filter((r) => r.yieldIqScore.score != null);
      rows.sort((a, b) => (b.yieldIqScore.score as number) - (a.yieldIqScore.score as number));
      break;
    case "liquidity":
      rows = rows.filter((r) => r.metrics?.aum_usd != null);
      rows.sort((a, b) => (b.metrics?.aum_usd as number) - (a.metrics?.aum_usd as number));
      break;
    case "newest":
      rows = rows.filter((r) => r.fund.inception_date != null);
      rows.sort((a, b) => (b.fund.inception_date as string).localeCompare(a.fund.inception_date as string));
      break;
  }
  return rows.slice(0, limit);
}

export function getDataFreshness() {
  return getDataAsOfDate();
}
