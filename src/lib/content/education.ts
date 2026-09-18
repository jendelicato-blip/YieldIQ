// Evergreen educational copy — explains general income-investing concepts,
// not any specific fund's figures, so it carries no verification status.
// The content engine picks one topic per day, rotating deterministically by
// day-of-year so the same topic doesn't repeat two days running.

import type { EducationTopic } from "./types";

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    title: "Distribution Yield vs. SEC Yield",
    body: "Distribution yield annualizes a fund's most recent payout against its current price — it reflects what was actually just paid, including any option premium or return of capital. The 30-day SEC yield is a standardized, regulator-defined calculation based on the fund's net investment income over the trailing 30 days, and excludes option premium and capital gains. The two can diverge significantly for option-income funds; always check which one a headline number is citing.",
  },
  {
    title: "Return of Capital (ROC) — Not Always Bad",
    body: "Return of Capital means part of a distribution is classified as a return of the investor's own principal rather than income or capital gains, so it isn't taxed the same way. ROC can be 'good' (a tax-efficient reflection of unrealized gains, common in option-income structures) or 'destructive' (a sign the fund is paying out more than it earns, eroding NAV over time). The distinction matters more than the label alone — check whether NAV is holding up alongside a high ROC percentage.",
  },
  {
    title: "Ex-Dividend Date vs. Record Date vs. Pay Date",
    body: "The ex-dividend date is the first day a share trades without the right to the upcoming distribution — buy on or after it and you won't receive that payment. The record date is when the fund checks its books to determine who's owed a distribution. The pay date is when the cash actually arrives. For most US ETFs the ex-date and record date fall close together, with the pay date typically a few business days later.",
  },
  {
    title: "NAV Erosion",
    body: "NAV erosion describes a fund's net asset value trending downward over time, independent of any single day's move. For option-income funds it's often the tradeoff for a high distribution: giving up upside participation (capped by sold calls) doesn't guarantee downside protection, so a large distribution can coexist with a shrinking NAV. Total return — price change plus distributions — is the number that tells you whether the tradeoff has actually paid off.",
  },
  {
    title: "Covered Calls, Plainly",
    body: "A covered call means a fund holds an asset (a stock, a basket, an index) and sells call options against it, collecting the option buyer's premium as income. If the asset rises above the strike price, the fund's upside is capped there — the option buyer captures the rest. If the asset falls, the fund still owns it and absorbs the loss, offset only by the premium collected. It's an income-for-upside trade, not a hedge against downside.",
  },
  {
    title: "Option Premium as an Income Source",
    body: "Option premium is the price a fund receives for selling an option — it's immediate cash, unrelated to whether the underlying asset pays a dividend. That's how a fund on a non-dividend-paying stock, or on Bitcoin, can still generate a monthly or weekly 'distribution.' Premium tends to be richer when implied volatility is higher, which is also usually when the underlying is riskier — the income and the risk often move together.",
  },
  {
    title: "Total Return: The Number That Actually Matters",
    body: "Total return combines price change and distributions received over a period — it's the only figure that tells you whether an investment actually grew your money. A fund can post an eye-catching double-digit distribution yield while its total return trails a plain index fund, if NAV has fallen enough to offset the payouts. Yield alone answers 'how much cash came out'; total return answers 'was it worth it.'",
  },
  {
    title: "Distribution Sustainability",
    body: "A fund's current distribution rate isn't a promise — it can be raised, cut, or suspended at the manager's discretion, and often is. Sustainability is best judged by looking at consistency of past payouts, how much of the distribution has come from option premium vs. return of capital, and whether NAV has held up alongside the payout history — not by the size of the most recent check alone.",
  },
  {
    title: "ROC vs. 'Destructive' ROC",
    body: "Not all return-of-capital is a warning sign. In many option-income structures, ROC reflects unrealized gains being distributed in a tax-advantaged way, and NAV can still hold up over time. 'Destructive' ROC is the case where the fund is effectively handing investors back their own principal because the strategy isn't generating enough income or gains to cover the payout — visible as ROC alongside a steadily declining NAV.",
  },
  {
    title: "Expense Ratios in Income ETFs",
    body: "The expense ratio is the annual percentage of assets a fund charges for management, deducted from returns automatically — it's separate from (and paid regardless of) the distribution yield. Actively managed option-income strategies typically charge more than a plain index fund because of the active options-trading overhead; a higher expense ratio isn't disqualifying, but it's a permanent drag worth weighing against the strategy's actual results.",
  },
  {
    title: "Premium / Discount to NAV",
    body: "An ETF's market price can trade slightly above (premium) or below (discount) its net asset value, because price is set by supply and demand on the exchange while NAV is the fund's actual underlying value. Authorized participants generally arbitrage large gaps away, but low-liquidity or newly launched funds can show wider, more persistent premiums/discounts — worth checking before assuming the quoted price equals fair value.",
  },
  {
    title: "Monthly vs. Quarterly vs. Weekly Distributions",
    body: "Distribution frequency changes cash-flow timing, not total income — a fund paying weekly doesn't inherently pay more per year than one paying monthly or quarterly at the same annualized yield. Weekly and monthly schedules have become popular in option-income ETFs partly because more frequent option expirations let the strategy harvest premium on a matching cadence, not because frequent payouts are inherently superior.",
  },
  {
    title: "Why Some ETFs Can Pay 20%+ Distributions",
    body: "Very high headline distribution rates in option-income ETFs usually come from a combination of high implied volatility in the underlying (richer option premium), aggressive strike selection, and sometimes leverage — plus, in many cases, a meaningful return-of-capital component. A 20%+ yield is a description of the cash paid out, not a statement about total return; it deserves the same NAV/total-return scrutiny as any other fund, arguably more.",
  },
  {
    title: "High Yield Doesn't Mean High Return",
    body: "Distribution yield measures cash paid relative to price; total return measures whether the investment actually grew in value including that cash. A fund can have one of the highest yields in its category and one of the weakest total returns, if NAV has fallen enough to offset the distributions — that gap is exactly what this page tracks fund by fund rather than assuming yield and return move together.",
  },
];

export function pickTodaysEducationTopic(date: Date = new Date()): EducationTopic {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const dayOfYear = Math.floor(diff / 86_400_000);
  return EDUCATION_TOPICS[dayOfYear % EDUCATION_TOPICS.length];
}
