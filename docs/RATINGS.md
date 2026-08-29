# YieldIQ Rating Methodology

All formulas below are implemented in `src/lib/ratings/engine.ts` and `src/lib/performance.ts`.
This document and the code are meant to never drift — if you change a weight, update both.

## Shared rule: graceful degradation, never guessing

Every rating is a weighted average of 0–100 "component scores." If a component's underlying
data is missing or unverified, it is **excluded**, and its weight is redistributed
proportionally across the remaining available components. If the total available weight falls
below 40%, the whole rating is withheld and shown as "Insufficient history" instead of a
number built mostly on missing data. Tap "Why this rating?" on any fund page to see exactly
which components were used and which were excluded.

## NAV Growth Rating (1–5 ★)

**Explicitly not a function of yield.** Built only from NAV history:

| Component | Weight |
|---|---|
| NAV trend (CAGR over available history) | 40% |
| Maximum drawdown from peak NAV | 25% |
| Annualized NAV volatility | 20% |
| Current NAV vs. peak (stability) | 15% |

Requires at least 2 verified NAV/price observations; deeper, more reliable ratings accumulate
as more daily snapshots are recorded.

## Risk Score (1–10, higher = riskier)

| Component | Weight |
|---|---|
| Strategy complexity (leverage, single-name concentration, 0DTE, crypto — a static classification, not a fabricated number) | 30% |
| NAV volatility | 20% |
| Maximum drawdown | 20% |
| Liquidity (AUM) | 15% |
| Fund age | 15% |

Because the strategy-complexity component is a classification fact (available from day one),
every fund gets a meaningful Risk Score even before it has accumulated price history.

## Distribution Sustainability (1–5 ★)

| Component | Weight |
|---|---|
| Distribution consistency (coefficient of variation of recent per-share amounts) | 30% |
| 1-year total return | 25% |
| NAV trend | 20% |
| Return of Capital level (higher ROC → lower score, not disqualifying) | 15% |
| Strategy stability profile | 10% |

## Income Quality Score (0–100)

| Component | Weight |
|---|---|
| NAV preservation (NAV Growth score) | 20% |
| Total return | 20% |
| Distribution consistency | 15% |
| Return of Capital prudence | 10% |
| Volatility (inverse) | 10% |
| Distribution sustainability | 10% |
| Strategy risk (inverse of Risk Score) | 10% |
| Liquidity / fund size | 5% |

## Yield Rating (1–5 ★)

A pure percentile rank of a fund's headline yield against all other tracked funds with a
verified yield that day. Deliberately decoupled from every other rating — a 5★ Yield Rating
says nothing about quality, and every page showing it pairs it with "high yield does not
necessarily mean high return."

## Liquidity Rating (1–5 ★)

Based on AUM tiers (≥$2B = 5★ down to <$25M = 1★). Funds under $50M are flagged as smaller /
newer with a liquidity caution.

## YieldIQ Score (0–100) — the primary composite

| Component | Weight |
|---|---|
| NAV Preservation | 25% |
| Total Return | 20% |
| Income Quality | 15% |
| Distribution Sustainability | 10% |
| Risk (inverse) | 10% |
| Yield (percentile) | 5% |
| Expense Ratio (inverse) | 5% |
| Liquidity | 5% |
| Fund Age / Track Record | 5% |

This is the app's explicit rebuttal to yield-chasing: an 80%-yield fund with severe NAV
erosion cannot outrank a 10%-yield fund with strong NAV preservation and total return, because
yield is capped at 5% of the composite.

## NAV Decay Alert

Not a rating but a rule-based flag (🟢 LOW / 🟡 MODERATE / 🔴 HIGH), triggered by combinations
of: maximum drawdown beyond -10%/-25%, price return sharply negative while total return
doesn't offset it, average Return of Capital above 25%/50%, or NAV CAGR below -15%. It is
never triggered by yield alone — a high-yield fund with strong NAV preservation shows 🟢.
