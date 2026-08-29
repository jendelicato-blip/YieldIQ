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

## Project layout

- `src/app/` — pages (Dashboard, Explore, Managers, Fund detail, Screener, High Yield,
  Weekly/Monthly Income, Dividend Calendar, Compare, Watchlist, Portfolio, Alerts, Education)
- `src/lib/data/` — data access layer (swap-ready for Supabase)
- `src/lib/ratings/` — the rating engine (NAV Growth, Risk, Income Quality, Distribution
  Sustainability, Yield Rating, Liquidity Rating, YieldIQ Score) — see `docs/RATINGS.md`
- `src/lib/performance.ts` — price return vs. total return engine
- `src/data/seed/` — current data store: verified fund/manager identity data plus dated,
  sourced snapshot metrics for a flagship set of tickers (see `docs/DATA_SOURCES.md`)
- `supabase/migrations/` — canonical SQL schema
- `scripts/ingest/` — daily-update pipeline design + seed-merge script
- `docs/` — architecture, ratings methodology, and data-source documentation

## Data integrity

This app never invents a dividend, yield, price, NAV, ticker, fund, manager, holding, or
distribution date. See `docs/DATA_SOURCES.md` for the source hierarchy, verification
statuses, and this build's data provenance — including the GIPQ/GIPX → GPIX/GPIQ ticker
correction.
