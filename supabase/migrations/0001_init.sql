-- YieldIQ core schema
-- Design goals:
--   1. New managers/funds can be added without any app redesign (pure data).
--   2. Every numeric fact carries its own source + verification metadata,
--      so the UI can show "Data unavailable" instead of ever fabricating a value.
--   3. History tables (nav, distributions, price) are append-only, so the
--      rating/performance engines can be recomputed at any time from raw facts.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Verification / data-quality enum, reused across every fact table
-- ---------------------------------------------------------------------------
create type verification_status as enum (
  'verified',            -- confirmed against a primary source within its freshness window
  'partially_verified',  -- some fields confirmed, others pending
  'stale',                -- previously verified, past its freshness window, not yet refreshed
  'unavailable'           -- no reliable source found; field must render as "Data unavailable"
);

create type fund_status as enum (
  'active',
  'closed',
  'liquidated',
  'merged',
  'ticker_changed'
);

create type distribution_frequency as enum (
  'weekly', 'monthly', 'quarterly', 'annually', 'irregular', 'unknown'
);

create type strategy_category as enum (
  'single_stock_option_income',
  'crypto_option_income',
  'diversified_option_income',
  'index_covered_call',
  'yieldboost_synthetic',
  'zero_dte_income',
  'weekly_pay',
  'leveraged_option_income',
  'convertible_income',
  'volatility_income',
  'traditional_dividend',
  'enhanced_income',
  'other'
);

-- ---------------------------------------------------------------------------
-- Managers (sponsors). Discovery pipeline inserts new rows automatically
-- once a newly-found manager's funds pass verification (see ingestion docs).
-- ---------------------------------------------------------------------------
create table managers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  website text,
  founded_year int,
  headquarters text,
  primary_strategies text[] default '{}',
  notes text,
  logo_url text,
  discovered_via text default 'seed',   -- 'seed' | 'auto_discovery' | 'manual'
  verification_status verification_status not null default 'partially_verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Funds. Identity/classification facts only -- NOT daily-moving numbers.
-- ---------------------------------------------------------------------------
create table funds (
  id uuid primary key default gen_random_uuid(),
  ticker text unique not null,
  fund_name text not null,
  manager_id uuid not null references managers(id) on delete restrict,
  strategy_category strategy_category not null default 'other',
  underlying text,                       -- e.g. "NVDA", "S&P 500", "Bitcoin"
  strategy_summary text,                 -- plain-English "how it makes money"
  strategy_tradeoff text,                -- plain-English "what you give up"
  strategy_advanced text,                -- technical detail, shown behind "Advanced"
  distribution_frequency distribution_frequency not null default 'unknown',
  exchange text,
  inception_date date,
  status fund_status not null default 'active',
  status_changed_at timestamptz,
  status_note text,                      -- e.g. "Merged into XYZ on 2026-01-01"
  prior_ticker text,                     -- when status = ticker_changed
  discovered_via text default 'seed',
  verification_status verification_status not null default 'partially_verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_funds_manager on funds(manager_id);
create index idx_funds_strategy on funds(strategy_category);
create index idx_funds_status on funds(status);

-- ---------------------------------------------------------------------------
-- Daily snapshot -- the one row per fund per day that "Daily Update System"
-- (section 16) refreshes. Historical snapshots are preserved (never overwritten)
-- so performance/rating engines can be recomputed from raw history.
-- ---------------------------------------------------------------------------
create table fund_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  as_of_date date not null,

  price numeric(14,4),
  nav numeric(14,4),
  distribution_yield_pct numeric(8,4),      -- issuer-quoted headline yield
  forward_distribution_yield_pct numeric(8,4),
  ttm_yield_pct numeric(8,4),
  sec_yield_30day_pct numeric(8,4),
  expense_ratio_pct numeric(6,4),
  aum_usd numeric(20,2),
  shares_outstanding bigint,
  avg_daily_volume bigint,
  bid_ask_spread_pct numeric(6,4),

  data_source text,
  source_url text,
  verification_status verification_status not null default 'unavailable',
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  unique (fund_id, as_of_date)
);

create index idx_daily_metrics_fund_date on fund_daily_metrics(fund_id, as_of_date desc);

-- ---------------------------------------------------------------------------
-- NAV / price history -- append-only time series feeding the NAV chart,
-- drawdown, volatility and NAV-growth-rating calculations.
-- ---------------------------------------------------------------------------
create table fund_nav_history (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  as_of_date date not null,
  nav numeric(14,4),
  price numeric(14,4),
  total_return_index numeric(14,6),  -- rebased index incl. reinvested distributions
  data_source text,
  verification_status verification_status not null default 'unavailable',
  unique (fund_id, as_of_date)
);

create index idx_nav_history_fund_date on fund_nav_history(fund_id, as_of_date);

-- ---------------------------------------------------------------------------
-- Distributions -- full history, one row per declared distribution.
-- ---------------------------------------------------------------------------
create table fund_distributions (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  ex_date date not null,
  record_date date,
  pay_date date,
  amount_per_share numeric(14,6) not null,
  implied_yield_pct numeric(8,4),

  -- Tax classification (section 10). Nullable until fund reports it.
  return_of_capital_pct numeric(6,2),
  ordinary_income_pct numeric(6,2),
  capital_gains_pct numeric(6,2),
  other_pct numeric(6,2),
  classification_source text,
  classification_verified_at timestamptz,

  data_source text,
  verification_status verification_status not null default 'unavailable',
  created_at timestamptz not null default now(),
  unique (fund_id, ex_date)
);

create index idx_distributions_fund_exdate on fund_distributions(fund_id, ex_date desc);

-- ---------------------------------------------------------------------------
-- Holdings / underlying exposure
-- ---------------------------------------------------------------------------
create table fund_holdings (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  as_of_date date not null,
  holding_name text not null,
  weight_pct numeric(6,2),
  exposure_type text,   -- 'equity' | 'option' | 'treasury_collateral' | 'crypto' | 'cash' | 'other'
  data_source text,
  verification_status verification_status not null default 'unavailable',
  unique (fund_id, as_of_date, holding_name)
);

-- ---------------------------------------------------------------------------
-- Computed ratings -- one row per fund per computation date. Recomputable
-- at any time from the tables above; never hand-edited.
-- ---------------------------------------------------------------------------
create table fund_ratings (
  id uuid primary key default gen_random_uuid(),
  fund_id uuid not null references funds(id) on delete cascade,
  as_of_date date not null,

  nav_growth_score numeric(5,2),        -- 0-100
  nav_growth_stars numeric(3,2),        -- 1-5
  income_quality_score numeric(5,2),    -- 0-100
  risk_score numeric(4,2),              -- 1-10
  yield_rating_stars numeric(3,2),      -- 1-5
  distribution_sustainability_stars numeric(3,2), -- 1-5
  liquidity_rating_stars numeric(3,2),  -- 1-5
  yieldiq_score numeric(5,2),           -- 0-100 composite

  methodology_version text not null default 'v1',
  inputs_snapshot jsonb,                -- raw component values used, for "Why this rating?"
  insufficient_history boolean not null default false,

  created_at timestamptz not null default now(),
  unique (fund_id, as_of_date)
);

create index idx_ratings_fund_date on fund_ratings(fund_id, as_of_date desc);

-- ---------------------------------------------------------------------------
-- Manager discovery log -- the "auto-discover new funds" pipeline (section 1)
-- writes here before promoting a candidate into `funds`.
-- ---------------------------------------------------------------------------
create table fund_discovery_log (
  id uuid primary key default gen_random_uuid(),
  ticker_candidate text not null,
  manager_slug_candidate text,
  discovered_at timestamptz not null default now(),
  source text,
  status text not null default 'pending', -- 'pending' | 'verified' | 'rejected'
  reviewed_at timestamptz,
  reject_reason text
);

-- ---------------------------------------------------------------------------
-- User-scoped tables (watchlist, portfolio, alerts). MVP ships these behind
-- a client-side store; schema is ready for Supabase Auth (auth.users) once
-- multi-device sync is enabled.
-- ---------------------------------------------------------------------------
create table user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fund_id uuid not null references funds(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (user_id, fund_id)
);

create table user_portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fund_id uuid not null references funds(id) on delete restrict,
  shares numeric(18,6) not null,
  avg_cost numeric(14,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type alert_type as enum (
  'yield_above', 'yield_below', 'nav_drop_pct', 'price_drop_pct',
  'distribution_change', 'distribution_announced', 'roc_above',
  'nav_rating_change'
);

create table user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fund_id uuid references funds(id) on delete cascade,
  alert_type alert_type not null,
  threshold numeric(14,4),
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Daily "what changed" feed (section 35), materialized by the ingestion job.
-- ---------------------------------------------------------------------------
create table daily_change_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  fund_id uuid references funds(id) on delete cascade,
  event_type text not null, -- 'yield_change' | 'nav_move' | 'new_distribution' | 'new_fund' | 'distribution_change' | 'roc_update'
  description text not null,
  magnitude numeric(14,6),
  created_at timestamptz not null default now()
);

create index idx_change_events_date on daily_change_events(event_date desc);
