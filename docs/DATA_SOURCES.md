# Data Sources & Verification

## Source hierarchy (preferred → fallback)

1. ETF issuer (official site / API / fact sheet)
2. Fund prospectus / SAI / SEC filings (485BPOS, N-CEN, N-PORT)
3. Official exchange data (NYSE Arca, Nasdaq, Cboe BZX)
4. Reliable market-data provider (e.g. a licensed quote/fundamentals API)
5. Secondary sources only when primary data is unavailable, and only ever surfaced with the
   source clearly named

## Verification statuses

| Status | Meaning |
|---|---|
| `verified` | Confirmed against a primary source within its freshness window |
| `partially_verified` | Sourced and dated, but not yet confirmed against a primary/official source, or only some fields on the record are confirmed |
| `stale` | Previously verified; past its freshness window and not yet refreshed |
| `unavailable` | No reliable source found — the UI renders "Data unavailable," never a guess |

Every numeric field in the UI is paired with its `verification_status` badge and, where
available, its `data_source` / `source_url` / `last_verified_at`.

## Provenance of this build's seed data

`src/data/seed/*.json` was produced by `scripts/ingest/merge_research.py` from two
research passes:

- **Identity data** (`managers.json`, `funds.json` inputs) — ticker, legal fund name, manager,
  strategy classification, distribution frequency, exchange, inception date — cross-checked
  against issuer websites and public listings. Included only when confirmed as a real,
  currently-active fund; anything unverifiable was omitted rather than guessed.
- **Snapshot metrics** (`live-metrics.json` input) — price, NAV, yield, expense ratio, AUM,
  inception date, latest distribution — sourced via issuer fact sheets and market-data
  providers, each row carrying its own `source_name`, `source_url`, and `as_of_date`. Rows
  without a confirmed `as_of_date` were dropped entirely rather than assigned an assumed date.

Because this data was gathered via search rather than a direct authenticated feed to each
issuer's API, every merged row is conservatively marked `partially_verified` — the daily
ingestion pipeline (`docs/ARCHITECTURE.md`) upgrades a fund to `verified` once its figures are
confirmed against a primary source on a scheduled fetch.

## Known ticker correction

Some investors search for **GIPQ** / **GIPX** — neither is a real, currently-listed ticker.
The verified Goldman Sachs Asset Management premium-income ETFs are **GPIX** (S&P 500 Premium
Income ETF) and **GPIQ** (Nasdaq-100 Premium Income ETF), both launched October 24, 2023. This
correction is surfaced directly on the GPIX/GPIQ fund pages.

## Coverage in this build

23 managers, 137 identity-verified funds. Of those, 22 flagship tickers across every major
manager (JEPI, JEPQ, GPIX, GPIQ, YMAX, YMAG, ULTY, FEPI, AIPI, CEPI, NVII, WMTI, CSHI, BTCI,
XYLD, QYLD*, DIVO, TSPY, BLOX, EGGY, EGGS, and others) carry a verified-as-of daily snapshot.
The remaining funds have confirmed identity data but show "Data unavailable" for live
numbers until the daily ingestion pipeline (or another research pass) captures a dated,
sourced snapshot for them — by design, never filled in with an estimate.

<small>*A few tickers had real published figures found during research but no dated
"as of" reference confirmed alongside them; those were excluded from the snapshot rather than
shown undated.</small>
