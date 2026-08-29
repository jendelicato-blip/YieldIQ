import type { StrategyCategory } from "./types";

// Generic, category-level plain-English strategy explanations. These describe
// the mechanism of a strategy type (a verifiable, stable classification
// fact) — not fund-specific performance claims. A fund's own
// strategy_summary/strategy_tradeoff (set once verified against its
// prospectus) always takes precedence over this fallback copy.
export const STRATEGY_COPY: Record<StrategyCategory, { how: string; tradeoff: string; advanced: string }> = {
  single_stock_option_income: {
    how: "Holds exposure to a single stock (often via synthetic/derivative positions) and sells short-dated call options against it, distributing the option premium collected as income.",
    tradeoff: "Upside is typically capped by the sold calls, and the fund still carries the underlying stock's downside risk and volatility — sometimes amplified by how the exposure is structured.",
    advanced: "Many single-stock option-income funds use a synthetic covered call built from long calls + short calls (a 'capped call' or collar-like structure) rather than owning shares outright, funded with Treasury collateral.",
  },
  crypto_option_income: {
    how: "Generates income by selling options tied to Bitcoin, Ethereum, or crypto-linked instruments (such as futures or spot ETFs), collecting premium as distributions.",
    tradeoff: "Crypto assets are highly volatile; option premium may not offset large drawdowns, and upside during sharp rallies is usually capped.",
    advanced: "Underlying exposure is often achieved through crypto futures or spot-ETF options rather than direct crypto custody.",
  },
  diversified_option_income: {
    how: "Spreads option-income exposure across a basket of underlying names or funds (rather than a single stock), selling options against that basket to generate distributable premium.",
    tradeoff: "Diversification can smooth single-name risk, but the fund still gives up upside participation on the options sold and carries the combined volatility of its holdings.",
    advanced: "Some diversified option-income funds are literal 'funds of funds,' holding other option-income ETFs rather than options directly.",
  },
  index_covered_call: {
    how: "Holds a broad index (like the S&P 500 or Nasdaq-100) and systematically sells call options against that exposure, distributing the premium collected.",
    tradeoff: "During strong index rallies, the sold calls cap how much upside the fund can capture, even though it still bears the index's downside.",
    advanced: "Strike selection (at-the-money vs. out-of-the-money) and option tenor materially change the risk/return and tax profile of otherwise similar-sounding covered call funds.",
  },
  yieldboost_synthetic: {
    how: "Uses a synthetic options structure (often on a single stock) engineered to target an enhanced, pre-set income level, funded by option premium rather than the underlying's own dividends.",
    tradeoff: "The engineered income target can come at the cost of principal stability — the structure can erode NAV if the underlying doesn't cooperate with the strategy's assumptions.",
    advanced: "These structures often combine long/short option positions of varying strikes and expirations to target a specific synthetic yield level.",
  },
  zero_dte_income: {
    how: "Sells options that expire the same trading day (0DTE) against an index or basket, harvesting very short-dated time decay as frequent income.",
    tradeoff: "Same-day expiration means outcomes are highly sensitive to that day's price action; premium income can be inconsistent and the strategy can underperform in fast, directional moves.",
    advanced: "0DTE strategies rely on rapid time decay (theta) in the option's final hours and require active daily management.",
  },
  weekly_pay: {
    how: "Structured to distribute income weekly rather than monthly or quarterly, typically by selling short-dated options on a regular weekly cadence.",
    tradeoff: "More frequent distributions don't mean more total income — the underlying strategy's capped upside and market risk still apply.",
    advanced: "Weekly-pay funds often ladder overlapping weekly option positions to smooth premium collection across the month.",
  },
  leveraged_option_income: {
    how: "Combines leverage (borrowed or synthetic exposure beyond 1x) with an options-selling overlay to target amplified income and/or amplified exposure to the underlying.",
    tradeoff: "Leverage magnifies both gains and losses; NAV can decline sharply and quickly in adverse markets, and compounding effects can hurt returns over longer holding periods.",
    advanced: "Leverage is typically achieved via swaps or futures rather than borrowed cash, and daily rebalancing can cause return divergence from the underlying over multi-day periods.",
  },
  convertible_income: {
    how: "Invests in convertible bonds or convertible-linked instruments, which pay income while offering some equity-like upside if the issuer's stock rises.",
    tradeoff: "Convertibles carry both credit/interest-rate risk (bond-like) and equity risk, and the conversion feature can lag pure equity upside during sharp rallies.",
    advanced: "Convertible income funds may also overlay options on the convertible or underlying equity to further shape the income and risk profile.",
  },
  volatility_income: {
    how: "Sells volatility-linked instruments (such as VIX futures/options or variance swaps) to collect the premium investors typically pay for volatility protection.",
    tradeoff: "Short-volatility strategies can suffer sharp, fast losses during volatility spikes — exactly when markets are under stress.",
    advanced: "These strategies typically harvest the volatility risk premium (the gap between implied and realized volatility) and often combine short-vol positions with tail-risk hedges.",
  },
  traditional_dividend: {
    how: "Holds dividend-paying stocks selected for current income, dividend growth, or quality, and passes through the dividends received.",
    tradeoff: "Dividend stocks can still lose value in market downturns, and a high yield can sometimes signal elevated risk of a future dividend cut.",
    advanced: "Selection methodologies vary widely — some funds screen for dividend growth and quality, others simply rank by current yield.",
  },
  enhanced_income: {
    how: "Combines traditional income sources (like dividends or bond interest) with a modest options overlay to enhance the total distribution beyond what the holdings alone would pay.",
    tradeoff: "The options overlay caps some upside in exchange for the enhanced income, though usually less aggressively than a full covered-call strategy.",
    advanced: "Enhanced-income funds often sell out-of-the-money calls on only a portion of the portfolio, balancing income enhancement against upside participation.",
  },
  other: {
    how: "Uses an income-generating strategy that doesn't fit YieldIQ's standard categories yet — see the fund's own prospectus for mechanics.",
    tradeoff: "Review the fund's prospectus for the specific tradeoffs of its strategy.",
    advanced: "Classification pending further verification.",
  },
};
