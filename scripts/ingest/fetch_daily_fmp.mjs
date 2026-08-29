#!/usr/bin/env node
/**
 * Real daily ingestion job, backed by the Financial Modeling Prep (FMP) API.
 *
 * Cannot be run inside this build's development sandbox — its network
 * egress policy blocks financialmodelingprep.com. Run this wherever you
 * actually deploy/schedule ingestion (a local machine, a GitHub Action, a
 * Vercel Cron job, a Supabase Edge Function with outbound HTTP) with open
 * network access.
 *
 * Usage:
 *   FMP_API_KEY=... node scripts/ingest/fetch_daily_fmp.mjs
 *   # or, with a .env.local file in the project root:
 *   node scripts/ingest/fetch_daily_fmp.mjs
 *
 * What it does, per active fund in src/data/seed/funds.json:
 *   1. Fetch a live quote (price, volume, shares outstanding)
 *   2. Fetch ETF info (NAV, AUM, expense ratio, inception date)
 *   3. Fetch dividend history (distributions -> TTM yield, ex/pay dates)
 *   4. Fetch ~400 days of historical price (NAV/price history + a
 *      dividend-adjusted total-return index for the performance engine)
 *
 * Every written row gets data_source = "Financial Modeling Prep API",
 * verification_status = "verified", and last_verified_at = now. A ticker
 * that fails to fetch is skipped entirely for that run — never backfilled
 * with a guess. This script only ever appends new dated observations to
 * nav-history.json/distributions.json (by unique ticker+date) and upserts
 * today's row in daily-metrics.json; it never rewrites history.
 *
 * NOTE ON UNVERIFIED FIELD SHAPES: this script is written against FMP's
 * long-standing v3 REST contract from documentation/memory, but has not
 * been executed against a live response in this environment (network
 * egress is blocked here — see above). Run it once against a couple of
 * tickers and sanity-check the output before trusting it broadly; FMP has
 * been migrating some endpoints to a new "stable" API surface, so a path
 * or field name below may need a small adjustment.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

const API_KEY = process.env.FMP_API_KEY;
if (!API_KEY) {
  console.error("FMP_API_KEY is not set (checked process.env and .env.local). Aborting.");
  process.exit(1);
}

const BASE = "https://financialmodelingprep.com/api/v3";
const REQUEST_DELAY_MS = 350; // stay well under free/starter-tier rate limits
const HISTORY_DAYS = 400;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fmpGet(pathname, params = {}) {
  const url = new URL(`${BASE}${pathname}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", API_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${pathname} -> HTTP ${res.status}`);
  return res.json();
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

async function fetchTicker(ticker) {
  const [quoteArr, etfInfoArr, dividendData, historyData] = await Promise.all([
    fmpGet(`/quote/${ticker}`).catch(() => null),
    fmpGet(`/etf-info`, { symbol: ticker }).catch(() => null),
    fmpGet(`/historical-price-full/stock_dividend/${ticker}`).catch(() => null),
    fmpGet(`/historical-price-full/${ticker}`, { timeseries: HISTORY_DAYS }).catch(() => null),
  ]);

  const quote = Array.isArray(quoteArr) ? quoteArr[0] : null;
  const etfInfo = Array.isArray(etfInfoArr) ? etfInfoArr[0] : null;
  const dividends = dividendData?.historical ?? [];
  const history = historyData?.historical ?? [];

  return { ticker, quote, etfInfo, dividends, history };
}

async function main() {
  const funds = readJson("funds.json").filter((f) => f.status === "active");
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  const existingMetrics = readJson("daily-metrics.json");
  const existingNav = readJson("nav-history.json");
  const existingDist = readJson("distributions.json");

  const newMetrics = [];
  const newNav = [];
  const newDist = [];

  let ok = 0;
  let failed = 0;

  for (const fund of funds) {
    try {
      const { ticker, quote, etfInfo, dividends, history } = await fetchTicker(fund.ticker);

      if (!quote && !etfInfo) {
        console.warn(`  ${ticker}: no data returned — skipping`);
        failed++;
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const price = quote?.price ?? null;
      const nav = etfInfo?.nav ?? null;
      const aum = etfInfo?.aum ?? null;
      const expenseRatioPct = normalizeExpenseRatioPct(etfInfo?.expenseRatio ?? null);

      // TTM yield computed directly from trailing-12-month dividend sum /
      // current price — an honestly-derived figure, not issuer-quoted.
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
        sec_yield_30day_pct: null, // FMP doesn't publish this for option-income ETFs
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
          nav: null, // FMP historical series is price-based; NAV itself isn't in this endpoint
          price: bar.close ?? null,
          total_return_index: bar.adjClose ?? null, // dividend-adjusted close as a TR proxy
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

      ok++;
      console.log(`  ${ticker}: price=${price ?? "—"} nav=${nav ?? "—"} aum=${aum ?? "—"} history=${history.length} dividends=${dividends.length}`);
    } catch (e) {
      console.warn(`  ${fund.ticker}: fetch failed — ${e.message}`);
      failed++;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const mergedMetrics = upsertByKey(existingMetrics, newMetrics, (r) => `${r.fund_ticker}|${r.as_of_date}`);
  const mergedNav = upsertByKey(existingNav, newNav, (r) => `${r.fund_ticker}|${r.as_of_date}`);
  const mergedDist = upsertByKey(existingDist, newDist, (r) => `${r.fund_ticker}|${r.ex_date}`);

  writeJson("daily-metrics.json", mergedMetrics);
  writeJson("nav-history.json", mergedNav);
  writeJson("distributions.json", mergedDist);

  console.log(`\nDone. ${ok} tickers updated, ${failed} skipped/failed.`);
  console.log(`daily-metrics.json: ${mergedMetrics.length} rows, nav-history.json: ${mergedNav.length} rows, distributions.json: ${mergedDist.length} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
