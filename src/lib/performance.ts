// Performance engine.
//
// The single most important rule this file enforces: PRICE RETURN and TOTAL
// RETURN are never conflated. A fund can distribute a huge amount of income
// while its share price (and total return) falls — this module makes that
// visible instead of hiding it behind one blended "return" figure.
//
// Every function returns `null` (rendered as "Insufficient history" by the
// UI) rather than guessing when the underlying NAV/price series doesn't
// cover the requested period. Nothing here is ever estimated.

import type { FundDistribution, FundNavHistoryPoint, FundReportedReturn, ReportedReturnPeriod } from "./types";

export type PerformancePeriod =
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "3Y"
  | "5Y"
  | "SI"; // Since Inception

export const PERIOD_LABELS: Record<PerformancePeriod, string> = {
  "1W": "1 Week",
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
  YTD: "YTD",
  "1Y": "1 Year",
  "3Y": "3 Years",
  "5Y": "5 Years",
  SI: "Since Inception",
};

export interface PeriodReturn {
  period: PerformancePeriod;
  priceReturnPct: number | null;
  distributionReturnPct: number | null;
  totalReturnPct: number | null; // price return + distributions, not reinvested
  totalReturnReinvestedPct: number | null; // using total_return_index if available
  insufficientHistory: boolean;
  // "computed": derived in-house from YieldIQ's own accumulated daily NAV/
  // price history. "reported": no such history yet, so this period's
  // figures were substituted from a fund's own published trailing-return
  // table (see mergeWithReportedReturns) — always shown labeled as such,
  // never presented as if YieldIQ computed it.
  source: "computed" | "reported";
  reportedSourceName?: string | null;
  reportedSourceUrl?: string | null;
}

function daysForPeriod(period: PerformancePeriod, asOf: Date): number | null {
  switch (period) {
    case "1W":
      return 7;
    case "1M":
      return 30;
    case "3M":
      return 91;
    case "6M":
      return 182;
    case "1Y":
      return 365;
    case "3Y":
      return 365 * 3;
    case "5Y":
      return 365 * 5;
    case "YTD": {
      const jan1 = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));
      return Math.round((asOf.getTime() - jan1.getTime()) / 86_400_000);
    }
    case "SI":
      return null; // resolved against inception in computePeriodReturn
  }
}

function findNearestOnOrBefore(
  series: FundNavHistoryPoint[],
  targetDate: Date,
): FundNavHistoryPoint | null {
  let best: FundNavHistoryPoint | null = null;
  for (const point of series) {
    const d = new Date(point.as_of_date + "T00:00:00Z");
    if (d.getTime() <= targetDate.getTime()) {
      if (!best || d.getTime() > new Date(best.as_of_date + "T00:00:00Z").getTime()) {
        best = point;
      }
    }
  }
  return best;
}

/**
 * Compute price/distribution/total return for one period from raw NAV/price
 * history + distribution history. Requires at least two verified price
 * points spanning the period; otherwise returns nulls with
 * insufficientHistory = true.
 */
export function computePeriodReturn(
  period: PerformancePeriod,
  navHistory: FundNavHistoryPoint[],
  distributions: FundDistribution[],
  inceptionDate: string | null,
): PeriodReturn {
  const verified = navHistory
    .filter((p) => p.price != null && p.verification_status !== "unavailable")
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));

  const empty: PeriodReturn = {
    period,
    priceReturnPct: null,
    distributionReturnPct: null,
    totalReturnPct: null,
    totalReturnReinvestedPct: null,
    insufficientHistory: true,
    source: "computed",
  };

  if (verified.length < 2) return empty;

  const latest = verified[verified.length - 1];
  const latestDate = new Date(latest.as_of_date + "T00:00:00Z");

  let startDate: Date;
  if (period === "SI") {
    if (!inceptionDate) return empty;
    startDate = new Date(inceptionDate + "T00:00:00Z");
  } else {
    const days = daysForPeriod(period, latestDate);
    if (days == null) return empty;
    startDate = new Date(latestDate.getTime() - days * 86_400_000);
  }

  // Don't allow "1Y" etc. to silently resolve to a fund's inception price
  // when it hasn't existed that long — that would misrepresent a partial
  // period as a full one.
  if (inceptionDate) {
    const inception = new Date(inceptionDate + "T00:00:00Z");
    if (startDate.getTime() < inception.getTime() && period !== "SI") {
      return empty;
    }
  }

  const startPoint = findNearestOnOrBefore(verified, startDate);
  if (!startPoint || startPoint.price == null || latest.price == null) return empty;
  // Guard against "nearest on/before" resolving to a point far outside a
  // reasonable tolerance window (e.g. a data gap) for short periods.
  const startPointDate = new Date(startPoint.as_of_date + "T00:00:00Z");
  const toleranceDays = period === "1W" ? 4 : period === "1M" ? 10 : 20;
  if (
    period !== "SI" &&
    Math.abs((startDate.getTime() - startPointDate.getTime()) / 86_400_000) > toleranceDays
  ) {
    return empty;
  }

  const priceReturnPct = ((latest.price - startPoint.price) / startPoint.price) * 100;

  const distributionsInPeriod = distributions.filter((d) => {
    const exDate = new Date(d.ex_date + "T00:00:00Z");
    return (
      exDate.getTime() > startPointDate.getTime() &&
      exDate.getTime() <= latestDate.getTime() &&
      d.verification_status !== "unavailable"
    );
  });
  const distributionSum = distributionsInPeriod.reduce((sum, d) => sum + d.amount_per_share, 0);
  const distributionReturnPct = (distributionSum / startPoint.price) * 100;

  const totalReturnPct = priceReturnPct + distributionReturnPct;

  // Reinvested total return, only if we have a verified total-return index
  // series (accounts for compounding, not just simple summation).
  let totalReturnReinvestedPct: number | null = null;
  if (latest.total_return_index != null && startPoint.total_return_index != null) {
    totalReturnReinvestedPct =
      ((latest.total_return_index - startPoint.total_return_index) /
        startPoint.total_return_index) *
      100;
  }

  return {
    period,
    priceReturnPct,
    distributionReturnPct,
    totalReturnPct,
    totalReturnReinvestedPct,
    insufficientHistory: false,
    source: "computed",
  };
}

export function computeAllPeriodReturns(
  navHistory: FundNavHistoryPoint[],
  distributions: FundDistribution[],
  inceptionDate: string | null,
): PeriodReturn[] {
  const periods: PerformancePeriod[] = ["1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "SI"];
  return periods.map((p) => computePeriodReturn(p, navHistory, distributions, inceptionDate));
}

// Maps a computed-engine period to the reported-return schema's period keys
// (which don't include "1W" — fact sheets essentially never publish that).
const REPORTED_PERIOD_MAP: Partial<Record<PerformancePeriod, ReportedReturnPeriod>> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  "3Y": "3Y",
  "5Y": "5Y",
  SI: "SI",
};

/**
 * Fills in periods where YieldIQ's own accumulated history is insufficient
 * with a fund's own reported trailing return, if one was verified. Never
 * overwrites a real computed figure — reported data is strictly a fallback
 * for gaps, and every substituted period is tagged source: "reported" so
 * the UI can attribute it distinctly from YieldIQ's own calculation.
 */
export function mergeWithReportedReturns(
  computed: PeriodReturn[],
  reported: FundReportedReturn[],
): PeriodReturn[] {
  return computed.map((c) => {
    if (!c.insufficientHistory) return c;
    const reportedPeriod = REPORTED_PERIOD_MAP[c.period];
    if (!reportedPeriod) return c;
    const match = reported.find((r) => r.period === reportedPeriod);
    if (!match || (match.price_return_pct == null && match.total_return_pct == null)) return c;

    return {
      period: c.period,
      priceReturnPct: match.price_return_pct,
      distributionReturnPct: null, // not separable from a single reported total-return figure
      totalReturnPct: match.total_return_pct,
      totalReturnReinvestedPct: match.total_return_pct,
      insufficientHistory: false,
      source: "reported",
      reportedSourceName: match.source_name,
      reportedSourceUrl: match.source_url,
    };
  });
}

// ---- NAV analysis ---------------------------------------------------------

export interface NavAnalysis {
  currentNav: number | null;
  navCagrPct: number | null; // over full available history
  maxDrawdownPct: number | null;
  currentDrawdownPct: number | null;
  volatilityAnnualizedPct: number | null; // stdev of period-over-period % changes, annualized
  insufficientHistory: boolean;
}

export function computeNavAnalysis(navHistory: FundNavHistoryPoint[]): NavAnalysis {
  const verified = navHistory
    .filter((p) => p.nav != null && p.verification_status !== "unavailable")
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));

  if (verified.length < 2) {
    return {
      currentNav: verified[0]?.nav ?? null,
      navCagrPct: null,
      maxDrawdownPct: null,
      currentDrawdownPct: null,
      volatilityAnnualizedPct: null,
      insufficientHistory: true,
    };
  }

  const navs = verified.map((p) => p.nav as number);
  const first = navs[0];
  const last = navs[navs.length - 1];

  const firstDate = new Date(verified[0].as_of_date + "T00:00:00Z");
  const lastDate = new Date(verified[verified.length - 1].as_of_date + "T00:00:00Z");
  const years = Math.max((lastDate.getTime() - firstDate.getTime()) / (365.25 * 86_400_000), 1 / 365);
  const navCagrPct = (Math.pow(last / first, 1 / years) - 1) * 100;

  let peak = navs[0];
  let maxDrawdownPct = 0;
  for (const n of navs) {
    if (n > peak) peak = n;
    const dd = ((n - peak) / peak) * 100;
    if (dd < maxDrawdownPct) maxDrawdownPct = dd;
  }
  const runningPeak = Math.max(...navs);
  const currentDrawdownPct = ((last - runningPeak) / runningPeak) * 100;

  const periodReturns: number[] = [];
  for (let i = 1; i < navs.length; i++) {
    periodReturns.push((navs[i] - navs[i - 1]) / navs[i - 1]);
  }
  const mean = periodReturns.reduce((s, r) => s + r, 0) / periodReturns.length;
  const variance =
    periodReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(periodReturns.length - 1, 1);
  const stdev = Math.sqrt(variance);
  // Assume roughly weekly-spaced observations if unknown; annualize with sqrt(52).
  const volatilityAnnualizedPct = stdev * Math.sqrt(52) * 100;

  return {
    currentNav: last,
    navCagrPct,
    maxDrawdownPct,
    currentDrawdownPct,
    volatilityAnnualizedPct,
    insufficientHistory: verified.length < 8,
  };
}
