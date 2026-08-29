#!/usr/bin/env python3
"""One-time merge of verified research-agent output into src/data/seed/*.json.

This script represents the *shape* of what the real daily ingestion job
(see docs/ARCHITECTURE.md) will do continuously: take freshly-verified
figures from research/data-provider passes and upsert them into the
managers/funds/daily-metrics/nav-history/distributions/holdings tables.
Nothing here invents a number that wasn't present in the source JSON.
"""
import json
import uuid
import sys
from pathlib import Path

SCRATCH = Path("/tmp/claude-0/-home-user-YieldIQ/c9654ab5-0a2c-517a-977f-b8c21c784ae2/scratchpad")
SEED = Path("/home/user/YieldIQ/src/data/seed")
NAMESPACE = uuid.UUID("6f6d1e2a-6b1a-4a8b-9c3e-1f2a3b4c5d6e")

VALID_STRATEGIES = {
    "single_stock_option_income", "crypto_option_income", "diversified_option_income",
    "index_covered_call", "yieldboost_synthetic", "zero_dte_income", "weekly_pay",
    "leveraged_option_income", "convertible_income", "volatility_income",
    "traditional_dividend", "enhanced_income", "other",
}
VALID_FREQ = {"weekly", "monthly", "quarterly", "annually", "irregular", "unknown"}
VALID_STATUS = {"active", "closed", "liquidated", "merged", "ticker_changed"}

def stable_id(*parts: str) -> str:
    return str(uuid.uuid5(NAMESPACE, "|".join(parts)))

def main():
    managers_raw = json.loads((SCRATCH / "managers.json").read_text())
    funds_raw = json.loads((SCRATCH / "funds.json").read_text())
    live_raw = json.loads((SCRATCH / "live-metrics.json").read_text())
    live_by_ticker = {row["ticker"]: row for row in live_raw}

    manager_slugs = {m["slug"] for m in managers_raw}

    # ---- managers.json ----
    managers_out = []
    for m in managers_raw:
        managers_out.append({
            "id": stable_id("manager", m["slug"]),
            "slug": m["slug"],
            "name": m["name"],
            "website": m.get("website"),
            "founded_year": m.get("founded_year"),
            "headquarters": m.get("headquarters"),
            "primary_strategies": m.get("primary_strategies", []),
            "notes": m.get("notes"),
            "verification_status": "partially_verified",
        })

    # ---- funds.json ----
    funds_out = []
    bad_strategy = []
    seen_tickers = set()
    for f in funds_raw:
        ticker = f["ticker"].upper()
        if ticker in seen_tickers:
            continue
        seen_tickers.add(ticker)
        if f["manager_slug"] not in manager_slugs:
            continue
        strategy = f.get("strategy_category", "other")
        strategy = {"0dte_income": "zero_dte_income"}.get(strategy, strategy)
        if strategy not in VALID_STRATEGIES:
            bad_strategy.append((ticker, strategy))
            strategy = "other"
        freq = f.get("distribution_frequency", "unknown")
        if freq not in VALID_FREQ:
            freq = "unknown"
        status = f.get("status", "active")
        if status not in VALID_STATUS:
            status = "active"

        status_note = None
        if ticker in ("GPIX", "GPIQ"):
            status_note = (
                "Note: some investors search for 'GIPQ' or 'GIPX' — these are not real, "
                "currently-listed tickers. The verified Goldman Sachs Premium Income ETFs are "
                "GPIX (S&P 500 Premium Income) and GPIQ (Nasdaq-100 Premium Income)."
            )

        confidence = f.get("confidence", "medium")
        verification_status = "verified" if confidence == "high" else "partially_verified"

        funds_out.append({
            "id": stable_id("fund", ticker),
            "ticker": ticker,
            "fund_name": f["fund_name"],
            "manager_slug": f["manager_slug"],
            "strategy_category": strategy,
            "underlying": f.get("underlying"),
            "strategy_summary": None,
            "strategy_tradeoff": None,
            "strategy_advanced": None,
            "distribution_frequency": freq,
            "exchange": f.get("exchange"),
            "inception_date": f.get("inception_date"),
            "status": status,
            "status_note": status_note,
            "prior_ticker": None,
            "verification_status": verification_status,
        })

    if bad_strategy:
        print("WARNING unmapped strategy_category values (defaulted to 'other'):", bad_strategy, file=sys.stderr)

    fund_tickers = {f["ticker"] for f in funds_out}

    # ---- daily-metrics.json ----
    metrics_out = []
    nav_history_out = []
    distributions_out = []
    for ticker, row in live_by_ticker.items():
        if ticker not in fund_tickers:
            continue
        as_of = row.get("as_of_date")
        if not as_of:
            continue
        metrics_out.append({
            "fund_ticker": ticker,
            "as_of_date": as_of,
            "price": row.get("price"),
            "nav": row.get("nav"),
            "distribution_yield_pct": row.get("distribution_yield_ttm_pct"),
            "forward_distribution_yield_pct": None,
            "ttm_yield_pct": row.get("distribution_yield_ttm_pct"),
            "sec_yield_30day_pct": row.get("sec_yield_30day_pct"),
            "expense_ratio_pct": row.get("expense_ratio_pct"),
            "aum_usd": row.get("aum_usd"),
            "shares_outstanding": None,
            "avg_daily_volume": None,
            "bid_ask_spread_pct": None,
            "data_source": row.get("source_name"),
            "source_url": row.get("source_url"),
            "verification_status": "partially_verified",
            "last_verified_at": as_of + "T00:00:00Z",
        })

        if row.get("price") is not None or row.get("nav") is not None:
            nav_history_out.append({
                "fund_ticker": ticker,
                "as_of_date": as_of,
                "nav": row.get("nav"),
                "price": row.get("price"),
                "total_return_index": None,
                "verification_status": "partially_verified",
            })

        if row.get("latest_distribution_amount") is not None and row.get("latest_distribution_ex_date"):
            distributions_out.append({
                "fund_ticker": ticker,
                "ex_date": row["latest_distribution_ex_date"],
                "record_date": None,
                "pay_date": None,
                "amount_per_share": row["latest_distribution_amount"],
                "implied_yield_pct": None,
                "return_of_capital_pct": None,
                "ordinary_income_pct": None,
                "qualified_dividend_pct": None,
                "capital_gains_pct": None,
                "short_term_capital_gains_pct": None,
                "long_term_capital_gains_pct": None,
                "other_pct": None,
                "classification_status": None,
                "tax_year": None,
                "classification_source": None,
                "data_source": row.get("source_name"),
                "verification_status": "partially_verified",
            })

    # ---- holdings.json (single-name exposure identity fact, not weight data) ----
    holdings_out = []
    for f in funds_out:
        if f["ticker"] not in live_by_ticker:
            continue
        as_of = live_by_ticker[f["ticker"]].get("as_of_date")
        if not as_of or not f.get("underlying"):
            continue
        weight = 100.0 if f["strategy_category"] in ("single_stock_option_income", "crypto_option_income") else None
        exposure_type = {
            "single_stock_option_income": "equity + written call options",
            "crypto_option_income": "crypto-linked + written call options",
            "index_covered_call": "index + written call options",
        }.get(f["strategy_category"], "mixed / basket")
        holdings_out.append({
            "fund_ticker": f["ticker"],
            "as_of_date": as_of,
            "holding_name": f["underlying"],
            "weight_pct": weight,
            "exposure_type": exposure_type,
            "data_source": "Fund identity classification",
            "verification_status": "partially_verified",
        })

    SEED.joinpath("managers.json").write_text(json.dumps(managers_out, indent=2))
    SEED.joinpath("funds.json").write_text(json.dumps(funds_out, indent=2))
    SEED.joinpath("daily-metrics.json").write_text(json.dumps(metrics_out, indent=2))
    SEED.joinpath("nav-history.json").write_text(json.dumps(nav_history_out, indent=2))
    SEED.joinpath("distributions.json").write_text(json.dumps(distributions_out, indent=2))
    SEED.joinpath("holdings.json").write_text(json.dumps(holdings_out, indent=2))

    print(f"managers={len(managers_out)} funds={len(funds_out)} metrics={len(metrics_out)} "
          f"nav_points={len(nav_history_out)} distributions={len(distributions_out)} holdings={len(holdings_out)}")

if __name__ == "__main__":
    main()
