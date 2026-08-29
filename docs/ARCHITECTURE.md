# YieldIQ Architecture

## Goals

1. New managers, funds, distributions, and strategies can be added without redesigning the app — everything downstream (ratings, screener, dashboard rankings) is computed from data, never hardcoded per fund.
2. No financial figure is ever fabricated. Every numeric fact carries a `verification_status`, a `data_source`, and a `last_verified_at` timestamp. When a figure can't be verified, the UI renders "Data unavailable" or "Insufficient history" — never a guess.
3. Ratings are transparent, deterministic functions of verified inputs, documented in `docs/RATINGS.md` and re-derivable by anyone from the same source data.

## Layers

```
supabase/migrations/0001_init.sql   Canonical schema (managers, funds, fund_daily_metrics,
                                     fund_nav_history, fund_distributions, fund_holdings,
                                     fund_ratings, fund_discovery_log, user_* tables,
                                     daily_change_events)

src/data/seed/*.json                Current data store (see "Data store today" below)

src/lib/types.ts                    TypeScript types mirroring the SQL schema 1:1

src/lib/data/index.ts               Data access layer — every page/component reads through
                                     this module only. Swapping seed JSON for live Supabase
                                     queries means changing this one file.

src/lib/performance.ts              Performance engine: price return / distribution return /
                                     total return per period, NAV CAGR, drawdown, volatility.
                                     Returns null ("Insufficient history") rather than guessing
                                     when a period isn't covered by verified history.

src/lib/ratings/engine.ts           Rating engine: NAV Growth, Risk, Distribution
                                     Sustainability, Income Quality, Yield Rating, Liquidity
                                     Rating, YieldIQ Score. Pure functions, documented weights,
                                     graceful degradation when inputs are missing.

src/lib/ratings/compute.ts          Orchestrates performance + rating engines for one ticker.

src/lib/ratings/rankings.ts         Cross-fund rankings for dashboard / "Best Funds" sections.

src/app/**                          Next.js App Router pages (all server components except
                                     where interactivity requires "use client": nav, search,
                                     filters, charts, watchlist/portfolio/alerts).
```

## Data store today

This build ships with **seed JSON** (`src/data/seed/`) rather than a live database, so the
app runs immediately without provisioning cloud infrastructure. The seed data is not a mock —
it's real: `scripts/ingest/merge_research.py` merged verified output from two research passes
(fund/manager identity facts cross-checked against issuer sites and filings, and current
snapshot metrics sourced from issuer fact sheets and market-data providers, each with a
`source_name`/`source_url`/`as_of_date`) into the exact shape the SQL schema expects.

Every function in `src/lib/data/index.ts` has the same signature it would have against
Postgres. Migrating to Supabase means:

1. Run `supabase/migrations/0001_init.sql` against a project.
2. Load the seed JSON via a one-time COPY/insert (or re-run the ingestion job below to
   populate fresh data directly).
3. Replace the JSON imports in `src/lib/data/index.ts` with Supabase queries. No other file
   changes.

## Daily update pipeline (design)

Production ingestion runs once per trading day (target: after market close, ~6:00 PM ET) as a
scheduled job (Supabase Edge Function + `pg_cron`, or an external scheduler hitting an API
route):

1. **Fetch** — for each active fund, pull price/NAV/yield/AUM/expense ratio from the issuer's
   API or fact sheet first, falling back down the hierarchy in `docs/DATA_SOURCES.md`.
2. **Validate** — reject implausible deltas (e.g. AUM swinging >50% day-over-day without a
   known corporate action) and flag for manual review instead of writing bad data.
3. **Upsert** — insert one `fund_daily_metrics` row per fund per day (never overwrite
   history), append `fund_nav_history` and `fund_distributions` rows as new data appears, and
   set `verification_status` based on source agreement (`verified` when the primary source
   confirms; `partially_verified` when only a secondary source responded; `stale` when a
   fetch fails and the last known row ages past its freshness window).
4. **Recompute** — re-run the rating engine for every fund whose inputs changed, writing a new
   `fund_ratings` row (ratings are always recomputed from raw history, never hand-edited).
5. **Diff** — compare today's snapshot to yesterday's and write `daily_change_events` rows for
   the "What's Changed?" feed (yield changes, NAV moves, new distributions, new funds, large
   moves, distribution changes, new ROC disclosures).
6. **Alert evaluation** — scan `user_alerts` against the new snapshot and fire notifications
   for any matched, active alert.

`scripts/ingest/` contains two implementations:

- `fetch_daily.ts` — a reference skeleton for steps 1–3 against a **Supabase-backed** store
  (the long-term production target), with a `fetchQuote()` stub to fill in against whichever
  provider you deploy with.
- `fetch_daily_fmp.mjs` — a **concrete, runnable** implementation against the
  [Financial Modeling Prep](https://financialmodelingprep.com) API, writing directly into
  today's seed-JSON store (`src/data/seed/`). Run it with `FMP_API_KEY` set (env var or
  `.env.local`) via `npm run ingest:fmp`. It fetches, per active fund: a live quote, ETF info
  (NAV/AUM/expense ratio), full dividend history, and ~400 days of historical price (used both
  as NAV/price history and, via FMP's dividend-adjusted close, a total-return index for the
  performance engine). It only ever appends new dated observations or upserts today's row —
  never rewrites or fabricates history — and stamps every row `verification_status: "verified"`
  with `data_source: "Financial Modeling Prep API"`.

  This script cannot run inside a network-restricted development sandbox (outbound access to
  data-provider domains is commonly blocked there) — run it wherever ingestion is actually
  scheduled: a local machine, a GitHub Action, a Vercel Cron job, or a Supabase Edge Function
  with outbound HTTP. Its inline comments flag the couple of FMP field/endpoint assumptions
  that are written from documentation rather than a verified live response, since it hasn't
  been exercised against a live API call in this repo's history yet — verify against a live
  run before trusting it broadly.

## Auto-discovery of new managers/funds

`fund_discovery_log` exists so an automated discovery job can propose new tickers (scraped
from issuer press releases, new SEC 485BPOS filings, or exchange new-listing feeds) without
directly writing into `funds`. A candidate is promoted into `funds`/`managers` only after
identity fields (ticker, legal name, manager, exchange) are confirmed against a primary
source — mirroring exactly how `scripts/ingest/merge_research.py` was used for this build's
seed data. Closures, liquidations, mergers, and ticker changes are written as a `status`
transition on the existing `funds` row (`status_note` explains what happened), never a delete
— so the fund's history stays intact and visible.

## Ratings

See `docs/RATINGS.md` for the full, human-readable methodology. The short version: every
score is a weighted average of 0–100 normalized components; any component whose input is
unverified or has insufficient history is **excluded** and its weight is redistributed among
the remaining verified components (implemented once, in `weightedScore()` in
`src/lib/ratings/engine.ts`, and reused by every rating). If too few components are available,
the whole rating renders as "Insufficient history" rather than a number built on guesses.
