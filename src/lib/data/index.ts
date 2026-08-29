// Data access layer.
//
// Today this reads from committed seed JSON (src/data/seed) which was
// populated by a verified research/ingestion pass — see docs/DATA_SOURCES.md
// for provenance. Every exported function here has the exact shape it would
// have against a real Postgres/Supabase database (see
// supabase/migrations/0001_init.sql): swapping the implementation to query
// Supabase instead of seed JSON requires no changes anywhere else in the app.

import managersRaw from "@/data/seed/managers.json";
import fundsRaw from "@/data/seed/funds.json";
import dailyMetricsRaw from "@/data/seed/daily-metrics.json";
import navHistoryRaw from "@/data/seed/nav-history.json";
import distributionsRaw from "@/data/seed/distributions.json";
import holdingsRaw from "@/data/seed/holdings.json";

import type {
  Manager,
  Fund,
  FundDailyMetrics,
  FundNavHistoryPoint,
  FundDistribution,
  FundHolding,
  FundView,
} from "../types";

const managers = managersRaw as unknown as Manager[];
const funds = fundsRaw as unknown as Fund[];
const dailyMetrics = dailyMetricsRaw as unknown as FundDailyMetrics[];
const navHistory = navHistoryRaw as unknown as FundNavHistoryPoint[];
const distributions = distributionsRaw as unknown as FundDistribution[];
const holdings = holdingsRaw as unknown as FundHolding[];

// ---- Managers --------------------------------------------------------------

export function getManagers(): Manager[] {
  return managers;
}

export function getManagerBySlug(slug: string): Manager | null {
  return managers.find((m) => m.slug === slug) ?? null;
}

export function getFundCountByManager(slug: string): number {
  return funds.filter((f) => f.manager_slug === slug && f.status === "active").length;
}

// ---- Funds -------------------------------------------------------------

export function getFunds(): Fund[] {
  return funds;
}

export function getActiveFunds(): Fund[] {
  return funds.filter((f) => f.status === "active");
}

export function getFundByTicker(ticker: string): Fund | null {
  return funds.find((f) => f.ticker.toUpperCase() === ticker.toUpperCase()) ?? null;
}

export function getFundsByManager(slug: string): Fund[] {
  return funds.filter((f) => f.manager_slug === slug);
}

export function getLatestMetrics(ticker: string): FundDailyMetrics | null {
  const rows = dailyMetrics
    .filter((m) => m.fund_ticker === ticker)
    .sort((a, b) => b.as_of_date.localeCompare(a.as_of_date));
  return rows[0] ?? null;
}

export function getAllLatestMetrics(): Map<string, FundDailyMetrics> {
  const map = new Map<string, FundDailyMetrics>();
  for (const m of dailyMetrics) {
    const existing = map.get(m.fund_ticker);
    if (!existing || m.as_of_date > existing.as_of_date) map.set(m.fund_ticker, m);
  }
  return map;
}

export function getNavHistory(ticker: string): FundNavHistoryPoint[] {
  return navHistory
    .filter((p) => p.fund_ticker === ticker)
    .sort((a, b) => a.as_of_date.localeCompare(b.as_of_date));
}

export function getDistributions(ticker: string): FundDistribution[] {
  return distributions
    .filter((d) => d.fund_ticker === ticker)
    .sort((a, b) => b.ex_date.localeCompare(a.ex_date));
}

export function getHoldings(ticker: string): FundHolding[] {
  const rows = holdings.filter((h) => h.fund_ticker === ticker);
  if (rows.length === 0) return [];
  const latestDate = rows.reduce((max, r) => (r.as_of_date > max ? r.as_of_date : max), rows[0].as_of_date);
  return rows.filter((r) => r.as_of_date === latestDate).sort((a, b) => (b.weight_pct ?? 0) - (a.weight_pct ?? 0));
}

export function getAvgRocPct(ticker: string, lookback = 8): number | null {
  const rows = getDistributions(ticker)
    .filter((d) => d.return_of_capital_pct != null)
    .slice(0, lookback);
  if (rows.length === 0) return null;
  return rows.reduce((s, d) => s + (d.return_of_capital_pct as number), 0) / rows.length;
}

export function getFundView(ticker: string): FundView | null {
  const fund = getFundByTicker(ticker);
  if (!fund) return null;
  const manager = getManagerBySlug(fund.manager_slug);
  if (!manager) return null;
  return {
    fund,
    manager,
    metrics: getLatestMetrics(fund.ticker),
    ratings: null, // computed on demand by lib/ratings, not stored redundantly here
    navHistory: getNavHistory(fund.ticker),
    distributions: getDistributions(fund.ticker),
    holdings: getHoldings(fund.ticker),
  };
}

// ---- Search --------------------------------------------------------------

export function searchFunds(query: string): Fund[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return funds.filter((f) => {
    const manager = getManagerBySlug(f.manager_slug);
    return (
      f.ticker.toLowerCase().includes(q) ||
      f.fund_name.toLowerCase().includes(q) ||
      (manager?.name.toLowerCase().includes(q) ?? false) ||
      (f.underlying?.toLowerCase().includes(q) ?? false) ||
      f.strategy_category.toLowerCase().includes(q.replace(/\s+/g, "_"))
    );
  });
}

// ---- Data freshness -------------------------------------------------------

export function getDataAsOfDate(): string | null {
  const dates = dailyMetrics.map((m) => m.as_of_date);
  if (dates.length === 0) return null;
  return dates.sort().reverse()[0];
}
