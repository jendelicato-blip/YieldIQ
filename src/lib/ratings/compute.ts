// Orchestrates the rating engine (engine.ts) + performance engine against a
// single fund's data, producing everything a fund card or fund detail page
// needs in one call. This is the one place page components should call into
// — it guarantees every page uses identical math.

import { getActiveFunds, getAvgRocPct, getDistributions, getFundByTicker, getLatestMetrics, getManagerBySlug, getNavHistory } from "@/lib/data";
import { computeAllPeriodReturns, computeNavAnalysis } from "@/lib/performance";
import {
  computeDistributionSustainability,
  computeIncomeQualityScore,
  computeLiquidityRating,
  computeNavDecayAlert,
  computeNavGrowthRating,
  computeRiskScore,
  computeYieldIqScore,
  computeYieldRating,
} from "@/lib/ratings/engine";
import type { Fund, FundDailyMetrics } from "@/lib/types";

export interface ComputedFundRatings {
  fund: Fund;
  metrics: FundDailyMetrics | null;
  navAnalysis: ReturnType<typeof computeNavAnalysis>;
  periodReturns: ReturnType<typeof computeAllPeriodReturns>;
  navGrowth: ReturnType<typeof computeNavGrowthRating>;
  risk: ReturnType<typeof computeRiskScore>;
  sustainability: ReturnType<typeof computeDistributionSustainability>;
  incomeQuality: ReturnType<typeof computeIncomeQualityScore>;
  liquidity: ReturnType<typeof computeLiquidityRating>;
  navDecay: ReturnType<typeof computeNavDecayAlert>;
  avgRocPct: number | null;
  yieldPercentile: number | null;
  yieldStars: number | null;
  yieldIqScore: ReturnType<typeof computeYieldIqScore>;
}

let peerYieldCache: number[] | null = null;

function getPeerYields(): number[] {
  if (peerYieldCache) return peerYieldCache;
  const funds = getActiveFunds();
  const yields: number[] = [];
  for (const f of funds) {
    const m = getLatestMetrics(f.ticker);
    const y = m?.ttm_yield_pct ?? m?.distribution_yield_pct;
    if (y != null) yields.push(y);
  }
  peerYieldCache = yields;
  return yields;
}

export function computeFundRatings(ticker: string): ComputedFundRatings | null {
  const fund = getFundByTicker(ticker);
  if (!fund) return null;
  const manager = getManagerBySlug(fund.manager_slug);
  if (!manager) return null;

  const metrics = getLatestMetrics(ticker);
  const navHistory = getNavHistory(ticker);
  const distributions = getDistributions(ticker);
  const avgRocPct = getAvgRocPct(ticker);

  const navAnalysis = computeNavAnalysis(navHistory);
  const periodReturns = computeAllPeriodReturns(navHistory, distributions, fund.inception_date);
  const oneYear = periodReturns.find((p) => p.period === "1Y") ?? null;
  const totalReturn1YPct = oneYear?.totalReturnReinvestedPct ?? oneYear?.totalReturnPct ?? null;
  const priceReturn1YPct = oneYear?.priceReturnPct ?? null;

  const navGrowth = computeNavGrowthRating(navAnalysis);
  const risk = computeRiskScore(fund, navAnalysis, metrics);
  const sustainability = computeDistributionSustainability(fund, distributions, navAnalysis, totalReturn1YPct, avgRocPct);
  const incomeQuality = computeIncomeQualityScore({
    navGrowth,
    risk,
    sustainability,
    totalReturn1YPct,
    avgRocPct,
    distributionCount: distributions.length,
    metrics,
  });
  const liquidity = computeLiquidityRating(metrics);
  const navDecay = computeNavDecayAlert({ nav: navAnalysis, totalReturn1YPct, priceReturn1YPct, avgRocPct });

  const headlineYield = metrics?.ttm_yield_pct ?? metrics?.distribution_yield_pct ?? null;
  const { stars: yieldStars, percentile: yieldPercentile } = computeYieldRating(headlineYield, getPeerYields());

  const yieldIqScore = computeYieldIqScore({
    navGrowth,
    totalReturn1YPct,
    incomeQuality,
    sustainability,
    risk,
    yieldPercentile,
    metrics,
    fund,
  });

  return {
    fund,
    metrics,
    navAnalysis,
    periodReturns,
    navGrowth,
    risk,
    sustainability,
    incomeQuality,
    liquidity,
    navDecay,
    avgRocPct,
    yieldPercentile,
    yieldStars,
    yieldIqScore,
  };
}
