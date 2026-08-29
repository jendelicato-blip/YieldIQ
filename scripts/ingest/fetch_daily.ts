/**
 * Reference skeleton for the daily ingestion job described in
 * docs/ARCHITECTURE.md. This is NOT wired up to a live market-data API in
 * this build — it documents the exact shape a production job should take so
 * it can be dropped in against Supabase + a real data provider without
 * redesigning anything else.
 *
 * Intended invocation: a scheduled Supabase Edge Function (or external cron)
 * running once per trading day after market close.
 */

import { createClient } from "@supabase/supabase-js";

interface ProviderQuote {
  ticker: string;
  asOfDate: string;
  price: number | null;
  nav: number | null;
  distributionYieldPct: number | null;
  secYield30dPct: number | null;
  expenseRatioPct: number | null;
  aumUsd: number | null;
  avgDailyVolume: number | null;
  sourceName: string;
  sourceUrl?: string;
}

// Replace with a real provider client (issuer API, licensed market-data
// vendor, or an authenticated fact-sheet scraper with change detection).
async function fetchQuote(ticker: string): Promise<ProviderQuote | null> {
  throw new Error(`fetchQuote(${ticker}) not implemented — wire up a real data provider here.`);
}

function isPlausibleDelta(prev: number | null, next: number | null, maxRelativeChange = 0.5): boolean {
  if (prev == null || next == null) return true;
  if (prev === 0) return true;
  return Math.abs(next - prev) / Math.abs(prev) <= maxRelativeChange;
}

async function ingestDailySnapshot() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: funds, error } = await supabase
    .from("funds")
    .select("id, ticker")
    .eq("status", "active");
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);

  for (const fund of funds ?? []) {
    const quote = await fetchQuote(fund.ticker).catch((e) => {
      console.error(`fetch failed for ${fund.ticker}:`, e.message);
      return null;
    });
    if (!quote) continue;

    const { data: prevRow } = await supabase
      .from("fund_daily_metrics")
      .select("aum_usd")
      .eq("fund_id", fund.id)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const plausible = isPlausibleDelta(prevRow?.aum_usd ?? null, quote.aumUsd);
    if (!plausible) {
      console.warn(`Implausible AUM delta for ${fund.ticker} — flagging for review, not writing.`);
      continue;
    }

    await supabase.from("fund_daily_metrics").upsert(
      {
        fund_id: fund.id,
        as_of_date: quote.asOfDate,
        price: quote.price,
        nav: quote.nav,
        distribution_yield_pct: quote.distributionYieldPct,
        ttm_yield_pct: quote.distributionYieldPct,
        sec_yield_30day_pct: quote.secYield30dPct,
        expense_ratio_pct: quote.expenseRatioPct,
        aum_usd: quote.aumUsd,
        avg_daily_volume: quote.avgDailyVolume,
        data_source: quote.sourceName,
        source_url: quote.sourceUrl ?? null,
        verification_status: "verified",
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "fund_id,as_of_date" },
    );

    await supabase.from("fund_nav_history").upsert(
      {
        fund_id: fund.id,
        as_of_date: quote.asOfDate,
        nav: quote.nav,
        price: quote.price,
        verification_status: "verified",
      },
      { onConflict: "fund_id,as_of_date" },
    );
  }

  // Step 4 (recompute ratings) and step 5 (diff → daily_change_events) are
  // implemented in src/lib/ratings — call the same pure functions here
  // against fresh Supabase reads once this job is deployed server-side.

  console.log(`Ingestion pass complete for ${today}.`);
}

if (require.main === module) {
  ingestDailySnapshot().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
