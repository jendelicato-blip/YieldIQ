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

## Update model: weekly automatic + on-demand manual

**The database does not refresh continuously.** A comprehensive update (every tracked
manager, every fund, prices, yields, distributions, NAV, performance, tax info, expense
ratios, AUM, holdings, and a full ratings recompute) runs automatically **once every 7
days**, never daily and never more than once a week on its own. A user can force an
immediate, full update at any time via the "↻ UPDATE DATA" button — it does not wait for or
reset the weekly schedule; the two are independent.

- **Automatic (weekly)** — `.github/workflows/weekly-data-update.yml`, a GitHub Actions cron
  job (Fridays 22:00 UTC + `workflow_dispatch` for an on-demand CI run) that runs the update
  engine out-of-process and commits any changed seed data back to the repo. This is the
  mechanism precisely because a real production deployment of this JSON-file-as-database
  architecture is typically serverless (read-only filesystem, no persistent long-running
  process to host a scheduler) — see "Persistence caveat" below.
- **Manual (on-demand)** — `POST /api/update-data` (`src/app/api/update-data/route.ts`), the
  backend for the in-app button. Runs the identical engine in-process, tagged
  `update_type: "manual"`. Guarded by an in-memory lock so a double-click can't start two
  overlapping runs; otherwise never blocked or cooldown-throttled — the user can always force
  a fresh update. The engine itself skips re-fetching a ticker whose data was verified in the
  last 5 minutes (cheap "don't hammer an identical fetch" behavior), which is not the same as
  blocking the button.

Both paths call the same function — `runUpdate({ triggeredBy })` in
`scripts/ingest/fetch_daily_fmp.mjs` — so "automatic" and "manual" runs are identical except
for that one tag and where the process happens to execute.

### What one update run does

1. **Fetch** — for each active fund, pull price/NAV/yield/AUM/expense ratio, dividend
   history, and price history from Financial Modeling Prep (see `docs/DATA_SOURCES.md` for
   the broader source hierarchy this should widen to in production). The historical-price
   fetch alone pulls ~400 days per run, which is what lets multi-period rankings ("Best 6-Month
   Total Return" and similar) light up from real computed data after just a couple of
   successful weekly runs — see "Computed vs. reported period returns" in `docs/RATINGS.md`
   for how that interacts with the `reported-returns.json` bootstrap dataset.
2. **No data loss on failure** — a ticker whose fetch fails keeps its previously stored,
   verified rows exactly as they were; it is recorded in that run's `errors` list, never
   silently dropped or replaced with a guess. `upsertByKey` only overwrites the specific
   dated rows a successful fetch produced.
3. **Diff, not just fetch** — every run compares freshly-fetched values against the
   previously stored ones and emits a `ChangeEvent` (`src/lib/ingest/types.ts`) for anything
   that actually moved: yield changes (≥0.5pp), a genuinely new distribution vs. the prior
   one on file, expense ratio / AUM changes, and NAV alerts (≥5% 1-month move, ≥10% 3-month
   move, or a ≥20% drawdown from peak — a magnitude-based flag, distinct from and simpler
   than the fund-page NAV Decay Alert rating). New-fund discovery, tax/ROC classification
   updates, strategy changes, ticker changes, and fund closures are fully wired into the type
   system and UI, but always emit zero events today — YieldIQ has no real detection source
   for any of them yet (FMP's dividend feed has no 19a-1 tax classification, and there's no
   discovery/filing feed wired up), so they stay honestly empty rather than inferred.
4. **Log** — every run appends one entry to `src/data/seed/update-history.json`
   (`UpdateHistoryEntry`: date, type, funds scanned, the full `changes[]` array, `errors[]`,
   and a `status` of `complete` / `partial` / `failed`). The UI's summary counts
   (funds updated, distribution changes, NAV alerts, …) are always derived by filtering this
   one array — never stored redundantly — so they can't drift from the detail behind them.
   `status` is `failed` only when the majority of attempted fetches errored (e.g. no
   `FMP_API_KEY`, or a real provider outage) — a mostly-successful run with a few errors is
   `partial`, and the UI shows exactly which tickers failed rather than claiming full success.

### Persistence caveat (current JSON-file architecture)

`fetch_daily_fmp.mjs` writes straight to `src/data/seed/*.json` on disk. That only has a
visible effect where the filesystem is writable and persistent across requests: local dev, a
self-hosted/VM/container deployment, or this repo's own CI runner. It does **not** work on a
typical serverless host (e.g. Vercel) — those deployments serve an immutable, read-only build
of the repo, so an in-process write from `/api/update-data` has nowhere durable to land. The
GitHub Action sidesteps this entirely: it runs the same engine somewhere with a normal
filesystem, commits the result, and relies on the host's usual "redeploy on push" flow to
publish it — a standard, robust pattern for a "data committed to the repo" site, and it's the
mechanism this app leans on for the weekly automatic path in any serverless deployment.
`src/lib/ingest/status.ts` reads `update-history.json` fresh from disk on every call for
exactly this reason (not a cached static import), so a manual run's effect on the status
card/history is visible immediately in any environment where the write itself succeeded.
Migrating to Supabase (below) removes this caveat entirely, since writes become a normal
database call available from any deployment model.

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
