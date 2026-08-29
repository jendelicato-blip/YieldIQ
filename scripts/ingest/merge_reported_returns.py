#!/usr/bin/env python3
"""One-time merge of researched trailing-return data into
src/data/seed/reported-returns.json. Explodes each researched ticker record
(one row with 1M/3M/6M/YTD/1Y/SI fields) into one FundReportedReturn row per
period, skipping periods where both price and total return are null (no
verified figure to show). Idempotent: re-running with the same inputs
produces the same output.
"""
import json
import sys
from pathlib import Path

SEED = Path("/home/user/YieldIQ/src/data/seed")

PERIOD_FIELD_MAP = [
    ("1M", "one_month_price_return_pct", "one_month_total_return_pct"),
    ("3M", "three_month_price_return_pct", "three_month_total_return_pct"),
    ("6M", "six_month_price_return_pct", "six_month_total_return_pct"),
    ("YTD", "ytd_price_return_pct", "ytd_total_return_pct"),
    ("1Y", "one_year_price_return_pct", "one_year_total_return_pct"),
    ("SI", None, "since_inception_total_return_pct"),
]


def explode(records):
    rows = []
    for rec in records:
        ticker = rec["ticker"].upper()
        as_of = rec.get("as_of_date")
        for period, price_field, total_field in PERIOD_FIELD_MAP:
            price = rec.get(price_field) if price_field else None
            total = rec.get(total_field)
            if price is None and total is None:
                continue
            rows.append({
                "fund_ticker": ticker,
                "period": period,
                "as_of_date": as_of or "unknown",
                "price_return_pct": price,
                "total_return_pct": total,
                "source_name": rec.get("source_name"),
                "source_url": rec.get("source_url"),
                "verification_status": "partially_verified",
            })
    return rows


def main():
    if len(sys.argv) < 2:
        print("usage: merge_reported_returns.py <input1.json> [input2.json ...]", file=sys.stderr)
        sys.exit(1)

    all_records = []
    for path in sys.argv[1:]:
        data = json.loads(Path(path).read_text())
        all_records.extend(data)

    # De-dupe by ticker (last file wins if a ticker somehow appears twice)
    by_ticker = {r["ticker"].upper(): r for r in all_records}

    new_rows = explode(list(by_ticker.values()))

    existing_path = SEED / "reported-returns.json"
    existing = json.loads(existing_path.read_text()) if existing_path.exists() else []
    existing_keys = {(r["fund_ticker"], r["period"]) for r in existing}

    merged = list(existing)
    added = 0
    for row in new_rows:
        key = (row["fund_ticker"], row["period"])
        if key in existing_keys:
            continue
        merged.append(row)
        added += 1

    existing_path.write_text(json.dumps(merged, indent=2) + "\n")
    tickers = sorted({r["fund_ticker"] for r in merged})
    print(f"Wrote {len(merged)} reported-return rows ({added} new) across {len(tickers)} tickers.")
    print("Tickers:", ", ".join(tickers))


if __name__ == "__main__":
    main()
