#!/usr/bin/env node
/**
 * YieldIQ update engine, backed by the Financial Modeling Prep (FMP) API.
 *
 * Cannot be run inside this build's development sandbox — its network
 * egress policy blocks financialmodelingprep.com. Run this wherever you
 * actually deploy/schedule ingestion (a local machine, a GitHub Action, a
 * self-hosted server) with open network access.
 *
 * Exports `runUpdate({ triggeredBy })`, used by both:
 *   - This file's CLI entry (`node scripts/ingest/fetch_daily_fmp.mjs`),
 *     invoked by the weekly GitHub Action (.github/workflows/weekly-data-update.yml)
 *     with triggeredBy "automatic".
 *   - src/app/api/update-data/route.ts, the manual "↻ UPDATE DATA" button's
 *     backend, with triggeredBy "manual".
 *
 * Per active fund in src/data/seed/funds.json, fetches: a live quote, ETF
 * info (NAV/AUM/expense ratio), dividend history, and ~400 days of
 * historical price. Every fetched row gets data_source = "Financial
 * Modeling Prep API", verification_status = "verified", and
 * last_verified_at = now.
 *
 * CHANGE DETECTION: every run diffs freshly-fetched values against the
 * previously stored values and emits a ChangeEvent (see
 * src/lib/ingest/types.ts) for anything that actually moved — these events
 * are the ONLY source of the "23 funds updated / 7 distribution changes /
 * 4 NAV alerts" style summary the UI shows. A category with no real
 * detection source yet (new-fund discovery, strategy changes, ticker
 * changes, closures) always emits zero events rather than a guess — see
 * the NOT YET IMPLEMENTED markers below.
 *
 * NO DATA LOSS: a ticker that fails to fetch keeps its previously stored
 * rows untouched (upsertByKey only overwrites keys present in the new
 * fetch) and is recorded in `errors`, never silently dropped or replaced
 * with a guess.
 *
 * NOTE ON UNVERIFIED FIELD SHAPES: written against FMP's long-standing v3
 * REST contract from documentation/memory; hasn't been exercised against a
 * live response in this repo's history (network egress is blocked in the
 * dev sandbox — see above). Sanity-check the first live run's output.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SEED = path.join(ROOT, "src/data/seed");

// Minimal .env.local loader (no dependency on the `dotenv` package).
function loadDotEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvLocal();

const BASE = "https://financialmodelingprep.com/api/v3";
const REQUEST_DELAY_MS = 350; // stay well under free/starter-tier rate limits
const HISTORY_DAYS = 400;
const FRESHNESS_SKIP_MS = 5 * 60 * 1000; // don't re-fetch a ticker verified <5min ago
const YIELD_CHANGE_THRESHOLD_PP = 0.5; // percentage points
const EXPENSE_RATIO_CHANGE_THRESHOLD_PP = 0.01;
const AUM_CHANGE_THRESHOLD_PCT = 10;
const NAV_ALERT_1M_THRESHOLD_PCT = 5;
const NAV_ALERT_3M_THRESHOLD_PCT = 10;
const NAV_ALERT_MAX_DRAWDOWN_THRESHOLD_PCT = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(SEED, file), "utf8"));
}
function writeJson(file, data) {
  writeFileSync(path.join(SEED, file), JSON.stringify(data, null, 2) + "\n");
}

// Some ETF expense ratios come back as a fraction (0.0035) and some as a
// percent (0.35) depending on FMP endpoint/version — normalize defensively
// rather than guessing a single convention.
function normalizeExpenseRatioPct(raw) {
  if (raw == null) return null;
  return raw < 1 ? raw * 100 : raw;
}

function upsertByKey(existing, incoming, keyFn) {
  const map = new Map(existing.map((row) => [keyFn(row), row]));
  for (const row of incoming) map.set(keyFn(row), row);
  return Array.from(map.values());
}

function latestMetricsFor(existingMetrics, ticker) {
  const rows = existingMetrics.filter((r) => r.fund_ticker === ticker).sort((a, b) => b.as_of_date.localeCompare(a.as_of_date));
  return rows[0] ?? null;
}

function latestDistributionFor(existingDist, ticker) {
  const rows = existingDist.filter((r) => r.fund_ticker === ticker).sort((a, b) => b.ex_date.localeCompare(a.ex_date));
  return rows[0] ?? null;
}

function makeEvent(partial) {
  return {
    id: crypto.randomUUID(),
    direction: null,
    field: null,
    previous_value: null,
    new_value: null,
    absolute_change: null,
    percent_change: null,
    effective_date: null,
    reason: null,
    extra: null,
    source_name: "Financial Modeling Prep API",
    source_url: null,
    verification_status: "verified",
    detected_at: new Date().toISOString(),
    manager_name: null,
    ...partial,
  };
}

async function fmpGet(apiKey, pathname, params = {}) {
  const url = new URL(`${BASE}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
  return res.json();
}

async function fetchTicker(apiKey, ticker) {
  const [quoteArr, etfInfoArr, dividendData, historyData] = await Promise.all([
    fmpGet(apiKey, `/quote/${ticker}`).catch(() => null),
    fmpGet(apiKey, `/etf-info`, { symbol: ticker }).catch(() => null),
    fmpGet(apiKey, `/historical-price-full/stock_dividend/${ticker}`).catch(() => null),
    fmpGet(apiKey, `/historical-price-full/${ticker}`, { timeseries: HISTORY_DAYS }).catch(() => null),
  ]);

  const quote = Array.isArray(quoteArr) ? quoteArr[0] : null;
  const etfInfo = Array.isArray(etfInfoArr) ? etfInfoArr[0] : null;
  const dividends = dividendData?.historical ?? [];
  const history = historyData?.historical ?? [];

  return { ticker, quote, etfInfo, dividends, history };
}

// history bars from FMP are newest-first; return ascending-by-date.
function ascendingByDate(bars) {
  return [...bars].sort((a, b) => a.date.localeCompare(b.date));
}

function findNavAlert({ ticker, fundName, managerName, history }) {
  const bars = ascendingByDate(history).filter((b) => b.close != null);
  if (bars.length < 5) return null;
  const latest = bars[bars.length - 1];
  const now = new Date(latest.date + "T00:00:00Z");

  function priceNearDaysAgo(days) {
    const target = new Date(now.getTime() - days * 86_400_000);
    let best = null;
    for (const b of bars) {
      const d = new Date(b.date + "T00:00:00Z");
      if (d.getTime() <= target.getTime()) {
        if (!best || d.getTime() > new Date(best.date + "T00:00:00Z").getTime()) best = b;
      }
    }
    return best;
  }

  const oneMonthBar = priceNearDaysAgo(30);
  const threeMonthBar = priceNearDaysAgo(91);
  const oneMonthPct = oneMonthBar ? ((latest.close - oneMonthBar.close) / oneMonthBar.close) * 100 : null;
  const threeMonthPct = threeMonthBar ? ((latest.close - threeMonthBar.close) / threeMonthBar.close) * 100 : null;

  let peak = bars[0].close;
  let maxDrawdownPct = 0;
  for (const b of bars) {
    if (b.close > peak) peak = b.close;
    const dd = ((b.close - peak) / peak) * 100;
    if (dd < maxDrawdownPct) maxDrawdownPct = dd;
  }

  const triggered =
    (oneMonthPct != null && Math.abs(oneMonthPct) >= NAV_ALERT_1M_THRESHOLD_PCT) ||
    (threeMonthPct != null && Math.abs(threeMonthPct) >= NAV_ALERT_3M_THRESHOLD_PCT) ||
    maxDrawdownPct <= -NAV_ALERT_MAX_DRAWDOWN_THRESHOLD_PCT;
  if (!triggered) return null;

  const reasons = [];
  if (oneMonthPct != null && oneMonthPct <= -NAV_ALERT_1M_THRESHOLD_PCT) reasons.push("Significant recent NAV decline.");
  if (oneMonthPct != null && oneMonthPct >= NAV_ALERT_1M_THRESHOLD_PCT) reasons.push("Significant recent NAV increase.");
  if (maxDrawdownPct <= -NAV_ALERT_MAX_DRAWDOWN_THRESHOLD_PCT) reasons.push(`Fund is in a drawdown of ${maxDrawdownPct.toFixed(1)}% from its recent peak.`);

  return makeEvent({
    category: "nav_alert",
    ticker,
    fund_name: fundName,
    manager_name: managerName,
    direction: (oneMonthPct ?? 0) < 0 ? "decrease" : "increase",
    field: "NAV",
    previous_value: oneMonthBar?.close ?? null,
    new_value: latest.close,
    percent_change: oneMonthPct,
    reason: reasons.join(" ") || "Notable NAV movement detected.",
    extra: {
      one_month_nav_pct: oneMonthPct != null ? Number(oneMonthPct.toFixed(2)) : null,
      three_month_nav_pct: threeMonthPct != null ? Number(threeMonthPct.toFixed(2)) : null,
      max_drawdown_pct: Number(maxDrawdownPct.toFixed(2)),
    },
    source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
  });
}

export async function runUpdate({ triggeredBy = "manual" } = {}) {
  const apiKey = process.env.FMP_API_KEY;
  const funds = readJson("funds.json").filter((f) => f.status === "active");
  const managers = readJson("managers.json");
  const managerName = (slug) => managers.find((m) => m.slug === slug)?.name ?? null;

  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const existingMetrics = readJson("daily-metrics.json");
  const existingNav = readJson("nav-history.json");
  const existingDist = readJson("distributions.json");

  const newMetrics = [];
  const newNav = [];
  const newDist = [];
  const changes = [];
  const errors = [];

  if (!apiKey) {
    errors.push({ ticker: "*", message: "FMP_API_KEY is not set — no tickers could be checked." });
  }

  for (const fund of funds) {
    const ticker = fund.ticker;
    const fName = fund.fund_name;
    const mName = managerName(fund.manager_slug);
    const prevMetrics = latestMetricsFor(existingMetrics, ticker);
    const prevDist = latestDistributionFor(existingDist, ticker);

    if (!apiKey) continue;

    // Freshness skip: avoid re-hitting FMP for a ticker verified moments ago.
    if (prevMetrics?.last_verified_at) {
      const age = Date.now() - new Date(prevMetrics.last_verified_at).getTime();
      if (age < FRESHNESS_SKIP_MS) {
        continue;
      }
    }

    try {
      const { quote, etfInfo, dividends, history } = await fetchTicker(apiKey, ticker);

      if (!quote && !etfInfo) {
        errors.push({ ticker, message: "No data returned from Financial Modeling Prep for this ticker." });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const price = quote?.price ?? null;
      const nav = etfInfo?.nav ?? null;
      const aum = etfInfo?.aum ?? null;
      const expenseRatioPct = normalizeExpenseRatioPct(etfInfo?.expenseRatio ?? null);

      const cutoff = new Date();
      cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
      const ttmDividends = dividends.filter((d) => new Date(d.date) >= cutoff);
      const ttmSum = ttmDividends.reduce((s, d) => s + (d.adjDividend ?? d.dividend ?? 0), 0);
      const ttmYieldPct = price && ttmDividends.length > 0 ? (ttmSum / price) * 100 : null;

      newMetrics.push({
        fund_ticker: ticker,
        as_of_date: today,
        price,
        nav,
        distribution_yield_pct: ttmYieldPct,
        forward_distribution_yield_pct: null,
        ttm_yield_pct: ttmYieldPct,
        sec_yield_30day_pct: null,
        expense_ratio_pct: expenseRatioPct,
        aum_usd: aum,
        shares_outstanding: quote?.sharesOutstanding ?? null,
        avg_daily_volume: quote?.avgVolume ?? null,
        bid_ask_spread_pct: null,
        data_source: "Financial Modeling Prep API",
        source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
        verification_status: "verified",
        last_verified_at: nowIso,
      });

      for (const bar of history) {
        newNav.push({
          fund_ticker: ticker,
          as_of_date: bar.date,
          nav: null,
          price: bar.close ?? null,
          total_return_index: bar.adjClose ?? null,
          verification_status: "verified",
        });
      }

      for (const d of dividends) {
        if (!d.date) continue;
        newDist.push({
          fund_ticker: ticker,
          ex_date: d.date,
          record_date: d.recordDate || null,
          pay_date: d.paymentDate || null,
          amount_per_share: d.adjDividend ?? d.dividend,
          implied_yield_pct: null,
          return_of_capital_pct: null, // FMP dividend history doesn't include 19a-1 tax classification
          ordinary_income_pct: null,
          qualified_dividend_pct: null,
          capital_gains_pct: null,
          short_term_capital_gains_pct: null,
          long_term_capital_gains_pct: null,
          other_pct: null,
          classification_status: null,
          tax_year: null,
          classification_source: null,
          data_source: "Financial Modeling Prep API",
          verification_status: "verified",
        });
      }

      // ---- Change detection (real diffs only) ----

      // Yield change
      if (prevMetrics?.ttm_yield_pct != null && ttmYieldPct != null) {
        const diff = ttmYieldPct - prevMetrics.ttm_yield_pct;
        if (Math.abs(diff) >= YIELD_CHANGE_THRESHOLD_PP) {
          changes.push(
            makeEvent({
              category: "yield_change",
              ticker,
              fund_name: fName,
              manager_name: mName,
              direction: diff > 0 ? "increase" : "decrease",
              field: "TTM Yield",
              previous_value: prevMetrics.ttm_yield_pct,
              new_value: ttmYieldPct,
              absolute_change: Number(diff.toFixed(2)),
              source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
            }),
          );
        }
      }

      // Distribution change (a genuinely new ex-date vs. what we had, with a prior amount to compare)
      const newestDividend = [...dividends].sort((a, b) => b.date.localeCompare(a.date))[0];
      if (newestDividend && prevDist && newestDividend.date > prevDist.ex_date) {
        const prevAmount = prevDist.amount_per_share;
        const newAmount = newestDividend.adjDividend ?? newestDividend.dividend;
        if (prevAmount != null && newAmount != null && prevAmount !== 0) {
          const pct = ((newAmount - prevAmount) / prevAmount) * 100;
          changes.push(
            makeEvent({
              category: "distribution_change",
              ticker,
              fund_name: fName,
              manager_name: mName,
              direction: newAmount > prevAmount ? "increase" : newAmount < prevAmount ? "decrease" : "neutral",
              field: "Distribution",
              previous_value: prevAmount,
              new_value: newAmount,
              percent_change: Number(pct.toFixed(2)),
              effective_date: newestDividend.date,
              extra: { pay_date: newestDividend.paymentDate || null },
              source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
            }),
          );
        }
      }

      // Expense ratio change
      if (prevMetrics?.expense_ratio_pct != null && expenseRatioPct != null) {
        const diff = expenseRatioPct - prevMetrics.expense_ratio_pct;
        if (Math.abs(diff) >= EXPENSE_RATIO_CHANGE_THRESHOLD_PP) {
          changes.push(
            makeEvent({
              category: "fund_updated",
              ticker,
              fund_name: fName,
              manager_name: mName,
              direction: diff > 0 ? "increase" : "decrease",
              field: "Expense Ratio",
              previous_value: prevMetrics.expense_ratio_pct,
              new_value: expenseRatioPct,
              absolute_change: Number(diff.toFixed(2)),
              source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
            }),
          );
        }
      }

      // AUM change
      if (prevMetrics?.aum_usd != null && aum != null && prevMetrics.aum_usd !== 0) {
        const pct = ((aum - prevMetrics.aum_usd) / prevMetrics.aum_usd) * 100;
        if (Math.abs(pct) >= AUM_CHANGE_THRESHOLD_PCT) {
          changes.push(
            makeEvent({
              category: "fund_updated",
              ticker,
              fund_name: fName,
              manager_name: mName,
              direction: pct > 0 ? "increase" : "decrease",
              field: "AUM",
              previous_value: prevMetrics.aum_usd,
              new_value: aum,
              percent_change: Number(pct.toFixed(2)),
              source_url: `https://financialmodelingprep.com/financial-summary/${ticker}`,
            }),
          );
        }
      }

      // NAV alert
      const navAlert = findNavAlert({ ticker, fundName: fName, managerName: mName, history });
      if (navAlert) changes.push(navAlert);

      // NOT YET IMPLEMENTED: new-fund discovery, tax/ROC updates (FMP has no
      // 19a-1 classification feed), strategy changes, ticker changes, and
      // fund closures all require a data source YieldIQ doesn't have wired
      // up yet. They intentionally never fire from this function — adding
      // them means adding a real source, never inferring one.

      console.log(`  ${ticker}: price=${price ?? "—"} nav=${nav ?? "—"} aum=${aum ?? "—"} history=${history.length} dividends=${dividends.length}`);
    } catch (e) {
      errors.push({ ticker, message: e.message });
      console.warn(`  ${ticker}: fetch failed — ${e.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const mergedMetrics = upsertByKey(existingMetrics, newMetrics, (r) => `${r.fund_ticker}|${r.as_of_date}`);
  const mergedNav = upsertByKey(existingNav, newNav, (r) => `${r.fund_ticker}|${r.as_of_date}`);
  const mergedDist = upsertByKey(existingDist, newDist, (r) => `${r.fund_ticker}|${r.ex_date}`);

  writeJson("daily-metrics.json", mergedMetrics);
  writeJson("nav-history.json", mergedNav);
  writeJson("distributions.json", mergedDist);

  const fundsAttempted = apiKey ? funds.length : 0;
  const criticalFailureRate = fundsAttempted > 0 ? errors.length / fundsAttempted : apiKey ? 0 : 1;
  const status = !apiKey || criticalFailureRate >= 0.5 ? "failed" : errors.length > 0 ? "partial" : "complete";

  const entry = {
    id: crypto.randomUUID(),
    date: today,
    timestamp: nowIso,
    update_type: triggeredBy,
    status,
    funds_scanned: funds.length,
    changes,
    errors,
  };

  const history = readJson("update-history.json");
  history.push(entry);
  writeJson("update-history.json", history);

  console.log(`\nUpdate ${status}. ${funds.length} funds scanned, ${new Set(changes.map((c) => c.ticker)).size} funds changed, ${errors.length} errors.`);
  return entry;
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const triggeredBy = process.env.UPDATE_TRIGGER === "automatic" ? "automatic" : "manual";
  runUpdate({ triggeredBy })
    .then((entry) => {
      if (!process.env.FMP_API_KEY) {
        console.error("FMP_API_KEY is not set (checked process.env and .env.local).");
        process.exit(1);
      }
      process.exit(entry.status === "failed" ? 1 : 0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
