// Tax analysis engine.
//
// Two hard rules, mirroring the rest of YieldIQ:
//   1. Never estimate or invent a tax classification. getFundTaxProfile()
//      returns null the moment no distribution carries reported
//      classification data — the UI must render "Tax classification
//      unavailable," never a guessed split.
//   2. Never provide personalized tax advice. Every function here computes
//      conceptual, educational figures only (see computeTaxImpactExample and
//      computeAdjustedBasis) and every surface that uses them carries the
//      standard disclaimer from TAX_DISCLAIMER below.

import { getDistributions } from "./data";
import type { NavAnalysis } from "./performance";
import type { FundDistribution, FundTaxProfile } from "./types";

export const TAX_DISCLAIMER =
  "YieldIQ provides educational information and does not provide tax, legal, or investment advice. Tax treatment varies by investor, account type, jurisdiction, and individual circumstances. Fund distributions may be reclassified after year-end. Always rely on your final tax documents and consult a qualified tax professional for advice regarding your situation.";

export interface TaxCategoryRow {
  key: "roc" | "ordinary_income" | "qualified_dividend" | "capital_gains" | "other";
  label: string;
  pct: number | null;
}

/**
 * The fund-level "TAX BREAKDOWN" profile — derived from the most recent
 * distribution that has ANY reported classification field. Distributions
 * without classification data are ignored for this purpose (they simply
 * haven't been characterized yet, which is common intra-year).
 */
export function getFundTaxProfile(ticker: string): FundTaxProfile | null {
  return deriveTaxProfile(ticker, getDistributions(ticker));
}

/**
 * Pure variant of getFundTaxProfile — takes an already-loaded distributions
 * array (sorted newest ex_date first) instead of re-querying the data layer.
 * Use this from components that already received `distributions` as a prop.
 */
export function deriveTaxProfile(ticker: string, distributions: FundDistribution[]): FundTaxProfile | null {
  const classified = distributions.find(
    (d) =>
      d.return_of_capital_pct != null ||
      d.ordinary_income_pct != null ||
      d.qualified_dividend_pct != null ||
      d.capital_gains_pct != null ||
      d.short_term_capital_gains_pct != null ||
      d.long_term_capital_gains_pct != null ||
      d.other_pct != null,
  );
  if (!classified) return null;

  return {
    fund_ticker: ticker,
    as_of_ex_date: classified.ex_date,
    roc_pct: classified.return_of_capital_pct,
    ordinary_income_pct: classified.ordinary_income_pct,
    qualified_dividend_pct: classified.qualified_dividend_pct,
    short_term_capital_gains_pct: classified.short_term_capital_gains_pct,
    long_term_capital_gains_pct: classified.long_term_capital_gains_pct,
    capital_gains_pct:
      classified.capital_gains_pct ??
      (classified.short_term_capital_gains_pct != null || classified.long_term_capital_gains_pct != null
        ? (classified.short_term_capital_gains_pct ?? 0) + (classified.long_term_capital_gains_pct ?? 0)
        : null),
    other_pct: classified.other_pct,
    classification_status: classified.classification_status,
    tax_year: classified.tax_year,
    classification_source: classified.classification_source,
    data_source: classified.data_source,
    verification_status: classified.verification_status,
  };
}

export function taxProfileToRows(profile: FundTaxProfile): TaxCategoryRow[] {
  return [
    { key: "roc", label: "Return of Capital", pct: profile.roc_pct },
    { key: "ordinary_income", label: "Ordinary Income", pct: profile.ordinary_income_pct },
    { key: "qualified_dividend", label: "Qualified Dividend Income", pct: profile.qualified_dividend_pct },
    { key: "capital_gains", label: "Capital Gains", pct: profile.capital_gains_pct },
    { key: "other", label: "Other", pct: profile.other_pct },
  ];
}

export const TAX_CATEGORY_EXPLAINERS: Record<TaxCategoryRow["key"], string> = {
  roc: "Generally means this portion is treated as a return of your own invested capital rather than current taxable income. It's typically not immediately taxable when received in a taxable account, but it generally reduces your tax basis — which can increase a future taxable gain when you sell.",
  ordinary_income: "Generally taxable as ordinary income in a taxable brokerage account, unless the fund reports a different final classification. Common sources include interest, non-qualified dividends, and certain option-related income.",
  qualified_dividend: "May receive preferential federal tax rates if IRS holding-period and other requirements are satisfied. Not every dividend a fund pays qualifies — this is the portion the fund has specifically reported as qualified.",
  capital_gains: "Gains the fund realized and distributed to shareholders. Short-term gains (held ≤1 year) and long-term gains (held >1 year) generally receive different federal tax treatment — see the breakdown below when reported separately.",
  other: "A residual category for amounts the fund reports outside the standard ROC / ordinary income / qualified dividend / capital gains buckets — check the fund's official tax documents for specifics.",
};

// ---- ROC warning system ---------------------------------------------------

export type RocWarningLevel = "none" | "high_roc" | "high_roc_nav_decline";

export interface RocWarning {
  level: RocWarningLevel;
  avgRocPct: number | null;
}

/**
 * Mirrors the NAV Decay Alert's spirit but is scoped specifically to the tax
 * framing: high ROC alone is a "go investigate" flag, not a verdict. Combined
 * with a substantial NAV decline it's escalated — still never an automatic
 * "unsafe" label.
 */
export function computeRocWarning(avgRocPct: number | null, nav: NavAnalysis): RocWarning {
  if (avgRocPct == null) return { level: "none", avgRocPct: null };
  if (avgRocPct < 50) return { level: "none", avgRocPct };

  const substantialNavDecline = nav.navCagrPct != null && nav.navCagrPct < -10;
  if (substantialNavDecline) return { level: "high_roc_nav_decline", avgRocPct };
  return { level: "high_roc", avgRocPct };
}

// ---- Tax basis tracking (educational, not a books-and-records system) ----

export interface AdjustedBasisResult {
  originalCost: number;
  rocReceived: number;
  adjustedBasis: number;
}

export function computeAdjustedBasis(originalCost: number, rocReceived: number): AdjustedBasisResult {
  return {
    originalCost,
    rocReceived,
    adjustedBasis: Math.max(originalCost - rocReceived, 0),
  };
}

/**
 * Best-effort, portfolio-page estimate of ROC dollars received on a holding:
 * sums amount_per_share * (roc_pct/100) * shares across every distribution
 * that has a reported ROC percentage, for as far back as YieldIQ has data —
 * not necessarily the investor's full holding period (we don't track a
 * purchase date). Callers must show this caveat alongside the number.
 */
export function estimateRocReceived(ticker: string, shares: number): number {
  const distributions = getDistributions(ticker);
  return distributions.reduce((sum, d) => {
    if (d.return_of_capital_pct == null) return sum;
    return sum + d.amount_per_share * (d.return_of_capital_pct / 100) * shares;
  }, 0);
}

// ---- Educational "tax impact" calculator ----------------------------------

export interface TaxImpactBreakdown {
  distributionAmount: number;
  rocFraction: number; // 0-1
  rocAmount: number;
  taxableAmount: number;
}

export function computeTaxImpactExample(distributionAmount: number, rocFraction: number): TaxImpactBreakdown {
  const clamped = Math.max(0, Math.min(1, rocFraction));
  const rocAmount = distributionAmount * clamped;
  return {
    distributionAmount,
    rocFraction: clamped,
    rocAmount,
    taxableAmount: distributionAmount - rocAmount,
  };
}

// ---- Fund comparison / screener tax-efficiency proxy ----------------------

/**
 * A mechanical sort key only — never surfaced as a value judgment. Ranks by
 * reported qualified-dividend percentage, the most commonly cited objective
 * proxy for tax efficiency in a taxable account. Individual tax situations
 * vary; this is not a recommendation.
 */
export function taxEfficiencySortValue(profile: FundTaxProfile | null): number | null {
  return profile?.qualified_dividend_pct ?? null;
}
