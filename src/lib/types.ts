// Core domain types. These mirror supabase/migrations/0001_init.sql 1:1 so the
// data layer (lib/data) can be swapped from seed JSON to real Postgres without
// touching any UI code.

export type VerificationStatus =
  | "verified"
  | "partially_verified"
  | "stale"
  | "unavailable";

export type FundStatus =
  | "active"
  | "closed"
  | "liquidated"
  | "merged"
  | "ticker_changed";

export type DistributionFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "irregular"
  | "unknown";

export type StrategyCategory =
  | "single_stock_option_income"
  | "crypto_option_income"
  | "diversified_option_income"
  | "index_covered_call"
  | "yieldboost_synthetic"
  | "zero_dte_income"
  | "weekly_pay"
  | "leveraged_option_income"
  | "convertible_income"
  | "volatility_income"
  | "traditional_dividend"
  | "enhanced_income"
  | "other";

export interface Manager {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  founded_year: number | null;
  headquarters: string | null;
  primary_strategies: string[];
  notes: string | null;
  logo_initial?: string;
  verification_status: VerificationStatus;
}

export interface Fund {
  id: string;
  ticker: string;
  fund_name: string;
  manager_slug: string;
  strategy_category: StrategyCategory;
  underlying: string | null;
  strategy_summary: string | null;
  strategy_tradeoff: string | null;
  strategy_advanced: string | null;
  distribution_frequency: DistributionFrequency;
  exchange: string | null;
  inception_date: string | null; // YYYY-MM-DD
  status: FundStatus;
  status_note: string | null;
  prior_ticker: string | null;
  verification_status: VerificationStatus;
}

export interface FundDailyMetrics {
  fund_ticker: string;
  as_of_date: string;
  price: number | null;
  nav: number | null;
  distribution_yield_pct: number | null;
  forward_distribution_yield_pct: number | null;
  ttm_yield_pct: number | null;
  sec_yield_30day_pct: number | null;
  expense_ratio_pct: number | null;
  aum_usd: number | null;
  shares_outstanding: number | null;
  avg_daily_volume: number | null;
  bid_ask_spread_pct: number | null;
  data_source: string | null;
  source_url: string | null;
  verification_status: VerificationStatus;
  last_verified_at: string | null;
}

export interface FundNavHistoryPoint {
  fund_ticker: string;
  as_of_date: string;
  nav: number | null;
  price: number | null;
  total_return_index: number | null;
  verification_status: VerificationStatus;
}

export type TaxClassificationStatus = "final" | "estimated";

export interface FundDistribution {
  fund_ticker: string;
  ex_date: string;
  record_date: string | null;
  pay_date: string | null;
  amount_per_share: number;
  implied_yield_pct: number | null;
  return_of_capital_pct: number | null;
  ordinary_income_pct: number | null;
  qualified_dividend_pct: number | null;
  capital_gains_pct: number | null;
  short_term_capital_gains_pct: number | null;
  long_term_capital_gains_pct: number | null;
  other_pct: number | null;
  classification_status: TaxClassificationStatus | null;
  tax_year: number | null;
  classification_source: string | null;
  data_source: string | null;
  verification_status: VerificationStatus;
}

// Aggregated, fund-level tax profile — derived from the most recent
// distribution that carries a reported classification. Never fabricated:
// getFundTaxProfile() returns null when no fund distribution has been
// classified yet, and the UI renders "Tax classification unavailable."
export interface FundTaxProfile {
  fund_ticker: string;
  as_of_ex_date: string;
  roc_pct: number | null;
  ordinary_income_pct: number | null;
  qualified_dividend_pct: number | null;
  short_term_capital_gains_pct: number | null;
  long_term_capital_gains_pct: number | null;
  capital_gains_pct: number | null;
  other_pct: number | null;
  classification_status: TaxClassificationStatus | null;
  tax_year: number | null;
  classification_source: string | null;
  data_source: string | null;
  verification_status: VerificationStatus;
}

export interface FundHolding {
  fund_ticker: string;
  as_of_date: string;
  holding_name: string;
  weight_pct: number | null;
  exposure_type: string | null;
  data_source: string | null;
  verification_status: VerificationStatus;
}

export interface FundRatings {
  fund_ticker: string;
  as_of_date: string;
  nav_growth_score: number | null; // 0-100
  nav_growth_stars: number | null; // 1-5
  income_quality_score: number | null; // 0-100
  risk_score: number | null; // 1-10
  yield_rating_stars: number | null; // 1-5
  distribution_sustainability_stars: number | null; // 1-5
  liquidity_rating_stars: number | null; // 1-5
  yieldiq_score: number | null; // 0-100
  methodology_version: string;
  inputs_snapshot: Record<string, unknown>;
  insufficient_history: boolean;
}

export interface DailyChangeEvent {
  event_date: string;
  fund_ticker: string | null;
  event_type:
    | "yield_change"
    | "nav_move"
    | "new_distribution"
    | "new_fund"
    | "distribution_change"
    | "roc_update";
  description: string;
  magnitude: number | null;
}

// ---- Client-side (localStorage-backed) user data -----------------------

export interface WatchlistItem {
  ticker: string;
  added_at: string;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  shares: number;
  avg_cost: number;
}

export type AlertType =
  | "yield_above"
  | "yield_below"
  | "nav_drop_pct"
  | "price_drop_pct"
  | "distribution_change"
  | "distribution_announced"
  | "roc_above"
  | "nav_rating_change";

export interface Alert {
  id: string;
  ticker: string | null;
  alert_type: AlertType;
  threshold: number | null;
  active: boolean;
  created_at: string;
}

// ---- Composite view model used throughout the UI ------------------------

export interface FundView {
  fund: Fund;
  manager: Manager;
  metrics: FundDailyMetrics | null;
  ratings: FundRatings | null;
  navHistory: FundNavHistoryPoint[];
  distributions: FundDistribution[];
  holdings: FundHolding[];
}
