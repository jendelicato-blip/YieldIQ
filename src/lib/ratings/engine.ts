// YieldIQ transparent rating engine.
//
// Every score below is a documented, deterministic function of verified
// inputs — never a hand-set number. Weights are exported as constants so the
// UI's "Why this rating?" panel and docs/RATINGS.md describe the exact same
// math the app actually runs. See docs/RATINGS.md for the plain-English
// writeup of each formula.
//
// Design rule: if a required input is missing (unverified / no history), the
// component is EXCLUDED and its weight is redistributed among the remaining
// available components — never defaulted to a guessed value. If too few
// components are available, the whole rating comes back `null` with
// `insufficientHistory: true`, which the UI renders as "Insufficient
// history" rather than a number.

import type { Fund, FundDailyMetrics, FundDistribution, StrategyCategory } from "../types";
import type { NavAnalysis } from "../performance";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

interface WeightedComponent {
  key: string;
  value: number | null; // 0-100 already-normalized score, or null if unavailable
  weight: number; // relative weight, any positive number
}

interface WeightedResult {
  score: number | null; // 0-100
  confidencePct: number; // fraction of total weight that was available, 0-100
  components: { key: string; value: number | null; weight: number; usedWeight: number }[];
}

const MIN_CONFIDENCE_PCT = 40;

function weightedScore(components: WeightedComponent[]): WeightedResult {
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const available = components.filter((c) => c.value != null);
  const availableWeight = available.reduce((s, c) => s + c.weight, 0);
  const confidencePct = totalWeight > 0 ? (availableWeight / totalWeight) * 100 : 0;

  if (availableWeight === 0 || confidencePct < MIN_CONFIDENCE_PCT) {
    return {
      score: null,
      confidencePct,
      components: components.map((c) => ({ ...c, usedWeight: 0 })),
    };
  }

  const score =
    available.reduce((s, c) => s + (c.value as number) * c.weight, 0) / availableWeight;

  return {
    score,
    confidencePct,
    components: components.map((c) => ({
      ...c,
      usedWeight: c.value != null ? c.weight / availableWeight : 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// Static strategy-risk classification. This is identity/classification data
// (which strategies use leverage, single names, crypto, 0DTE mechanics) —
// not a fabricated daily figure — so it can be applied even to brand-new
// funds with no price history yet.
// ---------------------------------------------------------------------------
export const STRATEGY_COMPLEXITY_RISK: Record<StrategyCategory, number> = {
  // 0-10, higher = structurally riskier / more complex
  traditional_dividend: 2,
  index_covered_call: 3.5,
  enhanced_income: 4.5,
  convertible_income: 4.5,
  diversified_option_income: 5.5,
  yieldboost_synthetic: 6,
  weekly_pay: 6,
  volatility_income: 7,
  single_stock_option_income: 7.5,
  leveraged_option_income: 9,
  zero_dte_income: 8.5,
  crypto_option_income: 9.5,
  other: 5,
};

export const STRATEGY_STABILITY_SCORE: Record<StrategyCategory, number> = {
  // 0-100, higher = structurally more stable distribution profile
  traditional_dividend: 90,
  index_covered_call: 75,
  enhanced_income: 65,
  convertible_income: 65,
  diversified_option_income: 55,
  yieldboost_synthetic: 45,
  weekly_pay: 45,
  volatility_income: 35,
  single_stock_option_income: 35,
  zero_dte_income: 25,
  leveraged_option_income: 20,
  crypto_option_income: 20,
  other: 50,
};

// ---------------------------------------------------------------------------
// NAV Growth Rating — explicitly NOT a function of yield. Pure NAV
// performance, trend, drawdown, and stability.
// Weights: trend 40% / drawdown 25% / volatility 20% / current-drawdown (stability) 15%
// ---------------------------------------------------------------------------
export const NAV_GROWTH_WEIGHTS = { trend: 0.4, drawdown: 0.25, volatility: 0.2, stability: 0.15 };

export interface NavGrowthResult {
  score: number | null;
  stars: number | null;
  confidencePct: number;
  insufficientHistory: boolean;
  breakdown: WeightedResult["components"];
}

export function computeNavGrowthRating(nav: NavAnalysis): NavGrowthResult {
  if (nav.insufficientHistory) {
    return { score: null, stars: null, confidencePct: 0, insufficientHistory: true, breakdown: [] };
  }

  const trendScore =
    nav.navCagrPct != null ? clamp(50 + nav.navCagrPct * 2.5, 0, 100) : null;
  const drawdownScore =
    nav.maxDrawdownPct != null ? clamp(100 + nav.maxDrawdownPct * 1.4, 0, 100) : null;
  const volatilityScore =
    nav.volatilityAnnualizedPct != null
      ? clamp(100 - nav.volatilityAnnualizedPct * 1.5, 0, 100)
      : null;
  const stabilityScore =
    nav.currentDrawdownPct != null ? clamp(100 + nav.currentDrawdownPct * 1.2, 0, 100) : null;

  const result = weightedScore([
    { key: "NAV trend (CAGR)", value: trendScore, weight: NAV_GROWTH_WEIGHTS.trend },
    { key: "Maximum drawdown", value: drawdownScore, weight: NAV_GROWTH_WEIGHTS.drawdown },
    { key: "NAV volatility", value: volatilityScore, weight: NAV_GROWTH_WEIGHTS.volatility },
    { key: "Current vs. peak NAV (stability)", value: stabilityScore, weight: NAV_GROWTH_WEIGHTS.stability },
  ]);

  return {
    score: result.score,
    stars: result.score != null ? clamp(result.score / 20, 0, 5) : null,
    confidencePct: result.confidencePct,
    insufficientHistory: result.score == null,
    breakdown: result.components,
  };
}

// ---------------------------------------------------------------------------
// Risk Score (1-10, higher = riskier). Combines structural strategy risk
// (always available) with volatility, drawdown, liquidity and fund age when
// verified data exists.
// ---------------------------------------------------------------------------
export const RISK_WEIGHTS = {
  strategy: 0.3,
  volatility: 0.2,
  drawdown: 0.2,
  liquidity: 0.15,
  age: 0.15,
};

export interface RiskResult {
  score: number | null; // 1-10
  label: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" | null;
  confidencePct: number;
  breakdown: WeightedResult["components"];
}

export function computeRiskScore(
  fund: Pick<Fund, "strategy_category" | "inception_date">,
  nav: NavAnalysis,
  metrics: FundDailyMetrics | null,
): RiskResult {
  const strategyValue = STRATEGY_COMPLEXITY_RISK[fund.strategy_category] * 10; // to 0-100 scale

  const volatilityValue =
    nav.volatilityAnnualizedPct != null ? clamp(nav.volatilityAnnualizedPct * 1.8, 0, 100) : null;
  const drawdownValue =
    nav.maxDrawdownPct != null ? clamp(Math.abs(nav.maxDrawdownPct) * 1.6, 0, 100) : null;

  let liquidityValue: number | null = null;
  if (metrics?.aum_usd != null) {
    if (metrics.aum_usd < 25_000_000) liquidityValue = 90;
    else if (metrics.aum_usd < 100_000_000) liquidityValue = 65;
    else if (metrics.aum_usd < 500_000_000) liquidityValue = 40;
    else if (metrics.aum_usd < 2_000_000_000) liquidityValue = 20;
    else liquidityValue = 10;
  }

  let ageValue: number | null = null;
  if (fund.inception_date) {
    const ageYears =
      (Date.now() - new Date(fund.inception_date).getTime()) / (365.25 * 86_400_000);
    if (ageYears < 1) ageValue = 85;
    else if (ageYears < 2) ageValue = 60;
    else if (ageYears < 5) ageValue = 35;
    else ageValue = 15;
  }

  const result = weightedScore([
    { key: "Strategy complexity / leverage / concentration", value: strategyValue, weight: RISK_WEIGHTS.strategy },
    { key: "NAV volatility", value: volatilityValue, weight: RISK_WEIGHTS.volatility },
    { key: "Maximum drawdown", value: drawdownValue, weight: RISK_WEIGHTS.drawdown },
    { key: "Liquidity (AUM)", value: liquidityValue, weight: RISK_WEIGHTS.liquidity },
    { key: "Fund age", value: ageValue, weight: RISK_WEIGHTS.age },
  ]);

  const score = result.score != null ? clamp(result.score / 10, 1, 10) : null;
  let label: RiskResult["label"] = null;
  if (score != null) {
    if (score < 3.5) label = "LOW";
    else if (score < 6) label = "MODERATE";
    else if (score < 8) label = "HIGH";
    else label = "VERY HIGH";
  }

  return { score, label, confidencePct: result.confidencePct, breakdown: result.components };
}

// ---------------------------------------------------------------------------
// Distribution Sustainability (1-5 stars)
// ---------------------------------------------------------------------------
export const SUSTAINABILITY_WEIGHTS = {
  consistency: 0.3,
  totalReturn: 0.25,
  navTrend: 0.2,
  roc: 0.15,
  strategyStability: 0.1,
};

export interface SustainabilityResult {
  score: number | null;
  stars: number | null;
  confidencePct: number;
  breakdown: WeightedResult["components"];
}

export function computeDistributionSustainability(
  fund: Pick<Fund, "strategy_category">,
  distributions: FundDistribution[],
  nav: NavAnalysis,
  totalReturn1YPct: number | null,
  avgRocPct: number | null,
): SustainabilityResult {
  const verifiedDist = distributions.filter((d) => d.verification_status !== "unavailable");

  let consistencyValue: number | null = null;
  if (verifiedDist.length >= 4) {
    const amounts = verifiedDist.map((d) => d.amount_per_share);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    consistencyValue = clamp(100 - cv * 120, 0, 100);
  }

  const totalReturnValue = totalReturn1YPct != null ? clamp(50 + totalReturn1YPct * 1.2, 0, 100) : null;
  const navTrendValue = nav.navCagrPct != null ? clamp(50 + nav.navCagrPct * 2.5, 0, 100) : null;
  const rocValue = avgRocPct != null ? clamp(100 - avgRocPct * 0.6, 0, 100) : null;
  const strategyStabilityValue = STRATEGY_STABILITY_SCORE[fund.strategy_category];

  const result = weightedScore([
    { key: "Distribution consistency", value: consistencyValue, weight: SUSTAINABILITY_WEIGHTS.consistency },
    { key: "Total return (1Y)", value: totalReturnValue, weight: SUSTAINABILITY_WEIGHTS.totalReturn },
    { key: "NAV trend", value: navTrendValue, weight: SUSTAINABILITY_WEIGHTS.navTrend },
    { key: "Return of Capital level", value: rocValue, weight: SUSTAINABILITY_WEIGHTS.roc },
    { key: "Strategy stability profile", value: strategyStabilityValue, weight: SUSTAINABILITY_WEIGHTS.strategyStability },
  ]);

  return {
    score: result.score,
    stars: result.score != null ? clamp(result.score / 20, 0, 5) : null,
    confidencePct: result.confidencePct,
    breakdown: result.components,
  };
}

// ---------------------------------------------------------------------------
// Income Quality Score (0-100)
// ---------------------------------------------------------------------------
export const INCOME_QUALITY_WEIGHTS = {
  distributionConsistency: 0.15,
  navPreservation: 0.2,
  totalReturn: 0.2,
  rocPrudence: 0.1,
  volatility: 0.1,
  sustainability: 0.1,
  strategyRisk: 0.1,
  liquidity: 0.05,
};

export interface IncomeQualityResult {
  score: number | null;
  stars: number | null;
  confidencePct: number;
  breakdown: WeightedResult["components"];
}

export function computeIncomeQualityScore(params: {
  navGrowth: NavGrowthResult;
  risk: RiskResult;
  sustainability: SustainabilityResult;
  totalReturn1YPct: number | null;
  avgRocPct: number | null;
  distributionCount: number;
  metrics: FundDailyMetrics | null;
}): IncomeQualityResult {
  const { navGrowth, risk, sustainability, totalReturn1YPct, avgRocPct, distributionCount, metrics } = params;

  const distributionConsistencyValue =
    distributionCount >= 4
      ? (sustainability.breakdown.find((c) => c.key === "Distribution consistency")?.value ?? null)
      : null;
  const navPreservationValue = navGrowth.score;
  const totalReturnValue = totalReturn1YPct != null ? clamp(50 + totalReturn1YPct * 1.2, 0, 100) : null;
  const rocPrudenceValue = avgRocPct != null ? clamp(100 - avgRocPct * 0.6, 0, 100) : null;
  const volatilityValue =
    risk.breakdown.find((c) => c.key === "NAV volatility")?.value != null
      ? 100 - (risk.breakdown.find((c) => c.key === "NAV volatility")!.value as number)
      : null;
  const sustainabilityValue = sustainability.score;
  const strategyRiskValue = risk.score != null ? clamp((10 - risk.score) * 10, 0, 100) : null;
  const liquidityValue =
    metrics?.aum_usd != null ? clamp(Math.log10(Math.max(metrics.aum_usd, 1)) * 11 - 55, 0, 100) : null;

  const result = weightedScore([
    { key: "Distribution consistency", value: distributionConsistencyValue, weight: INCOME_QUALITY_WEIGHTS.distributionConsistency },
    { key: "NAV preservation", value: navPreservationValue, weight: INCOME_QUALITY_WEIGHTS.navPreservation },
    { key: "Total return", value: totalReturnValue, weight: INCOME_QUALITY_WEIGHTS.totalReturn },
    { key: "Return of Capital prudence", value: rocPrudenceValue, weight: INCOME_QUALITY_WEIGHTS.rocPrudence },
    { key: "Volatility (inverse)", value: volatilityValue, weight: INCOME_QUALITY_WEIGHTS.volatility },
    { key: "Distribution sustainability", value: sustainabilityValue, weight: INCOME_QUALITY_WEIGHTS.sustainability },
    { key: "Strategy risk (inverse)", value: strategyRiskValue, weight: INCOME_QUALITY_WEIGHTS.strategyRisk },
    { key: "Liquidity / fund size", value: liquidityValue, weight: INCOME_QUALITY_WEIGHTS.liquidity },
  ]);

  return {
    score: result.score,
    stars: result.score != null ? clamp(result.score / 20, 0, 5) : null,
    confidencePct: result.confidencePct,
    breakdown: result.components,
  };
}

// ---------------------------------------------------------------------------
// Yield Rating (1-5 stars) — purely a percentile rank of headline yield
// among verified peers. Deliberately decoupled from quality; the UI must
// always pair this with "high yield does not necessarily mean high return."
// ---------------------------------------------------------------------------
export function computeYieldRating(
  yieldPct: number | null,
  peerYields: number[],
): { stars: number | null; percentile: number | null } {
  if (yieldPct == null || peerYields.length < 5) return { stars: null, percentile: null };
  const below = peerYields.filter((y) => y <= yieldPct).length;
  const percentile = (below / peerYields.length) * 100;
  const stars = clamp(1 + (percentile / 100) * 4, 1, 5);
  return { stars, percentile };
}

// ---------------------------------------------------------------------------
// Liquidity Rating (1-5 stars)
// ---------------------------------------------------------------------------
export function computeLiquidityRating(metrics: FundDailyMetrics | null): {
  stars: number | null;
  flagSmallFund: boolean;
} {
  if (!metrics?.aum_usd) return { stars: null, flagSmallFund: false };
  let stars: number;
  if (metrics.aum_usd >= 2_000_000_000) stars = 5;
  else if (metrics.aum_usd >= 500_000_000) stars = 4;
  else if (metrics.aum_usd >= 100_000_000) stars = 3;
  else if (metrics.aum_usd >= 25_000_000) stars = 2;
  else stars = 1;
  return { stars, flagSmallFund: metrics.aum_usd < 50_000_000 };
}

// ---------------------------------------------------------------------------
// YIELDIQ SCORE (0-100) — the primary composite ranking.
// Weights per product spec: NAV Preservation 25% / Total Return 20% /
// Income Quality 15% / Distribution Sustainability 10% / Risk 10% /
// Yield 5% / Expense Ratio 5% / Liquidity 5% / Fund Age 5%.
// ---------------------------------------------------------------------------
export const YIELDIQ_SCORE_WEIGHTS = {
  navPreservation: 0.25,
  totalReturn: 0.2,
  incomeQuality: 0.15,
  sustainability: 0.1,
  risk: 0.1,
  yield: 0.05,
  expenseRatio: 0.05,
  liquidity: 0.05,
  fundAge: 0.05,
};

export interface YieldIqScoreResult {
  score: number | null;
  confidencePct: number;
  breakdown: WeightedResult["components"];
}

export function computeYieldIqScore(params: {
  navGrowth: NavGrowthResult;
  totalReturn1YPct: number | null;
  incomeQuality: IncomeQualityResult;
  sustainability: SustainabilityResult;
  risk: RiskResult;
  yieldPercentile: number | null;
  metrics: FundDailyMetrics | null;
  fund: Pick<Fund, "inception_date">;
}): YieldIqScoreResult {
  const { navGrowth, totalReturn1YPct, incomeQuality, sustainability, risk, yieldPercentile, metrics, fund } = params;

  const totalReturnValue = totalReturn1YPct != null ? clamp(50 + totalReturn1YPct * 1.2, 0, 100) : null;
  const riskValue = risk.score != null ? clamp((10 - risk.score) * 10, 0, 100) : null;
  const expenseValue =
    metrics?.expense_ratio_pct != null ? clamp(100 - metrics.expense_ratio_pct * 25, 0, 100) : null;
  const liquidityValue =
    metrics?.aum_usd != null ? clamp(Math.log10(Math.max(metrics.aum_usd, 1)) * 11 - 55, 0, 100) : null;

  let ageValue: number | null = null;
  if (fund.inception_date) {
    const ageYears = (Date.now() - new Date(fund.inception_date).getTime()) / (365.25 * 86_400_000);
    ageValue = clamp(ageYears * 20, 0, 100);
  }

  const result = weightedScore([
    { key: "NAV Preservation", value: navGrowth.score, weight: YIELDIQ_SCORE_WEIGHTS.navPreservation },
    { key: "Total Return", value: totalReturnValue, weight: YIELDIQ_SCORE_WEIGHTS.totalReturn },
    { key: "Income Quality", value: incomeQuality.score, weight: YIELDIQ_SCORE_WEIGHTS.incomeQuality },
    { key: "Distribution Sustainability", value: sustainability.score, weight: YIELDIQ_SCORE_WEIGHTS.sustainability },
    { key: "Risk (inverse)", value: riskValue, weight: YIELDIQ_SCORE_WEIGHTS.risk },
    { key: "Yield (percentile)", value: yieldPercentile, weight: YIELDIQ_SCORE_WEIGHTS.yield },
    { key: "Expense Ratio (inverse)", value: expenseValue, weight: YIELDIQ_SCORE_WEIGHTS.expenseRatio },
    { key: "Liquidity", value: liquidityValue, weight: YIELDIQ_SCORE_WEIGHTS.liquidity },
    { key: "Fund Age / Track Record", value: ageValue, weight: YIELDIQ_SCORE_WEIGHTS.fundAge },
  ]);

  return { score: result.score, confidencePct: result.confidencePct, breakdown: result.components };
}

// ---------------------------------------------------------------------------
// NAV Decay Alert
// ---------------------------------------------------------------------------
export type NavDecayLevel = "LOW" | "MODERATE" | "HIGH" | null;

export function computeNavDecayAlert(params: {
  nav: NavAnalysis;
  totalReturn1YPct: number | null;
  priceReturn1YPct: number | null;
  avgRocPct: number | null;
}): { level: NavDecayLevel; reasons: string[] } {
  const { nav, totalReturn1YPct, priceReturn1YPct, avgRocPct } = params;
  if (nav.insufficientHistory && avgRocPct == null) return { level: null, reasons: [] };

  const reasons: string[] = [];
  let riskPoints = 0;

  if (nav.maxDrawdownPct != null && nav.maxDrawdownPct < -25) {
    riskPoints += 2;
    reasons.push(`NAV has drawn down ${nav.maxDrawdownPct.toFixed(1)}% from its historical peak.`);
  } else if (nav.maxDrawdownPct != null && nav.maxDrawdownPct < -10) {
    riskPoints += 1;
    reasons.push(`NAV has drawn down ${nav.maxDrawdownPct.toFixed(1)}% from its historical peak.`);
  }

  if (priceReturn1YPct != null && totalReturn1YPct != null && priceReturn1YPct < -10 && totalReturn1YPct < 5) {
    riskPoints += 2;
    reasons.push("Price return has been sharply negative while total return trails what the distributions alone would suggest.");
  }

  if (avgRocPct != null && avgRocPct > 50) {
    riskPoints += 2;
    reasons.push(`${avgRocPct.toFixed(0)}% of recent distributions have been classified as Return of Capital.`);
  } else if (avgRocPct != null && avgRocPct > 25) {
    riskPoints += 1;
    reasons.push(`${avgRocPct.toFixed(0)}% of recent distributions have been classified as Return of Capital.`);
  }

  if (nav.navCagrPct != null && nav.navCagrPct < -15) {
    riskPoints += 2;
    reasons.push(`NAV has declined at roughly ${nav.navCagrPct.toFixed(1)}% annualized.`);
  }

  let level: NavDecayLevel = "LOW";
  if (riskPoints >= 5) level = "HIGH";
  else if (riskPoints >= 2) level = "MODERATE";

  return { level, reasons };
}
