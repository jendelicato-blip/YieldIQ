# YieldIQ

**Know the Yield. Understand the Risk. Grow the Income.**

A research platform for dividend and income ETFs — covered calls, option income, 0DTE,
weekly/monthly payers, and traditional dividend funds — built around one rule: **never
fabricate a financial figure.** Every number on the site carries a verification status, a
source, and a last-verified timestamp; where data isn't verified, the UI says so instead of
guessing.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Data layer designed 1:1 against a Postgres
schema (`supabase/migrations/0001_init.sql`) so it can move from seed JSON to a live Supabase
project with no UI changes — see `docs/ARCHITECTURE.md`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Data updates: weekly automatic + on-demand manual

The database does not refresh continuously — a full comprehensive update (every manager,
every fund, prices, yields, distributions, NAV, performance, tax info, expense ratios, AUM,
holdings, and a full ratings recompute) runs automatically **once every 7 days** via
`.github/workflows/weekly-data-update.yml`. Add an `FMP_API_KEY` repo secret (Settings →
Secrets and variables → Actions) for that workflow to run.

Anyone using the app can also force an immediate, full update any time via the **↻ UPDATE
DATA** button on the Dashboard — it never waits for the weekly schedule. See
`docs/ARCHITECTURE.md` for how the two paths share one engine, and their constraints on
where the write actually persists (needs outbound network access to
financialmodelingprep.com, and a writable/persistent filesystem for the in-app button — see
below).

To run the same engine manually from the CLI, set `FMP_API_KEY` (in `.env.local`, gitignored,
or as an environment variable) and run:

```bash
npm run ingest:fmp
```

## Project layout

- `src/app/` — pages (Dashboard, Explore, Managers, Fund detail, Screener, High Yield,
  Weekly/Monthly Income, Dividend Calendar, Compare, Watchlist, Portfolio, Alerts, Education)
- `src/lib/data/` — data access layer (swap-ready for Supabase)
- `src/lib/ratings/` — the rating engine (NAV Growth, Risk, Income Quality, Distribution
  Sustainability, Yield Rating, Liquidity Rating, YieldIQ Score) — see `docs/RATINGS.md`
- `src/lib/performance.ts` — price return vs. total return engine
- `src/lib/tax.ts` — tax analysis engine (ROC vs. ordinary income, ROC warnings, basis tracking)
- `src/lib/ingest/` — update-status reader + shared types for the update engine's change events
- `src/components/admin/` — the "↻ UPDATE DATA" button, dashboard status card, update history,
  and the drill-down change detail sheets
- `src/data/seed/` — current data store: verified fund/manager identity data plus dated,
  sourced snapshot metrics for a flagship set of tickers (see `docs/DATA_SOURCES.md`), and
  `update-history.json`, the log every update run appends to
- `supabase/migrations/` — canonical SQL schema
- `scripts/ingest/` — the update engine (`fetch_daily_fmp.mjs`) + seed-merge script
- `.github/workflows/weekly-data-update.yml` — the automatic weekly update cron
- `docs/` — architecture, ratings methodology, and data-source documentation

## Data integrity

This app never invents a dividend, yield, price, NAV, ticker, fund, manager, holding, or
distribution date. See `docs/DATA_SOURCES.md` for the source hierarchy, verification
statuses, and this build's data provenance — including the GIPQ/GIPX → GPIX/GPIQ ticker
correction.
