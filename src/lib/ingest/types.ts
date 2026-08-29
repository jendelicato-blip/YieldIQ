// Types shared between the update engine (scripts/ingest/fetch_daily_fmp.mjs,
// which runs in both the CLI/GitHub Action context and the /api/update-data
// route) and the UI that renders update results.
//
// Design rule: ChangeEvent is the ONLY source of truth for what changed.
// Every summary count shown in the UI (funds_updated, distribution_changes,
// etc.) is derived by filtering this array — never stored redundantly —
// so the numbers can never drift from the detail behind them.

import type { VerificationStatus } from "../types";

export type ChangeCategory =
  | "new_fund"
  | "distribution_change"
  | "nav_alert"
  | "yield_change"
  | "tax_update"
  | "strategy_change"
  | "ticker_change"
  | "fund_closure"
  | "fund_updated"; // generic field change (expense ratio, AUM, price) not covered above

export const CHANGE_CATEGORY_LABELS: Record<ChangeCategory, string> = {
  new_fund: "New Funds Discovered",
  distribution_change: "Distribution Changes",
  nav_alert: "NAV Alerts",
  yield_change: "Yield Changes",
  tax_update: "Tax / ROC Updates",
  strategy_change: "Strategy Changes",
  ticker_change: "Ticker / Name Changes",
  fund_closure: "Fund Closures",
  fund_updated: "Other Field Updates",
};

export const CHANGE_CATEGORY_LABELS_SINGULAR: Record<ChangeCategory, string> = {
  new_fund: "New Fund Discovered",
  distribution_change: "Distribution Change",
  nav_alert: "NAV Alert",
  yield_change: "Yield Change",
  tax_update: "Tax / ROC Update",
  strategy_change: "Strategy Change",
  ticker_change: "Ticker / Name Change",
  fund_closure: "Fund Closure",
  fund_updated: "Other Field Update",
};

export const CHANGE_CATEGORY_ICONS: Record<ChangeCategory, string> = {
  new_fund: "🆕",
  distribution_change: "💰",
  nav_alert: "🔴",
  yield_change: "📈",
  tax_update: "🧾",
  strategy_change: "🔄",
  ticker_change: "🔤",
  fund_closure: "🔴",
  fund_updated: "🔧",
};

export interface ChangeEvent {
  id: string;
  category: ChangeCategory;
  ticker: string;
  fund_name: string;
  manager_name: string | null;
  direction: "increase" | "decrease" | "neutral" | null;
  field: string | null; // e.g. "Distribution", "Yield (TTM)", "NAV", "Expense Ratio"
  previous_value: string | number | null;
  new_value: string | number | null;
  absolute_change: string | number | null;
  percent_change: number | null;
  effective_date: string | null;
  reason: string | null;
  // Category-specific extra fields (new-fund profile, NAV-alert drawdown
  // figures, closure dates, etc.) that don't fit the generic diff shape.
  extra: Record<string, string | number | null> | null;
  source_name: string | null;
  source_url: string | null;
  verification_status: VerificationStatus;
  detected_at: string; // ISO timestamp
}

export type UpdateRunStatus = "complete" | "partial" | "failed";
export type UpdateTriggerType = "manual" | "automatic";

export interface UpdateErrorEntry {
  ticker: string;
  message: string;
}

export interface UpdateHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO
  update_type: UpdateTriggerType;
  status: UpdateRunStatus;
  funds_scanned: number;
  changes: ChangeEvent[];
  errors: UpdateErrorEntry[];
}

export interface UpdateStatus {
  last: UpdateHistoryEntry | null;
  nextAutomaticDue: string | null; // ISO date, null if no automatic run has ever completed
  isAutomaticOverdue: boolean;
}

export function fundsUpdatedCount(changes: ChangeEvent[]): number {
  return new Set(changes.map((c) => c.ticker)).size;
}

export function countByCategory(changes: ChangeEvent[], category: ChangeCategory): number {
  return changes.filter((c) => c.category === category).length;
}
