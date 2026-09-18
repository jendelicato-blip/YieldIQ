// Daily content-engine report generator.
//
// Builds every section of the social-media content report (docs: the
// "DIVIDEND INVESTING SOCIAL MEDIA CONTENT ENGINE" spec) purely from data
// already flowing through src/lib/data + src/lib/ratings — the same source
// every other page in the app reads from. Nothing here invents a ticker,
// price, yield, or date: a section renders its "not yet verified" /
// "insufficient data" state instead of guessing whenever an input is
// missing, exactly like the rest of the app (see docs/DATA_SOURCES.md).
//
// Server-only: pulls in src/lib/ingest/status.ts, which reads a file off
// disk. Do not import this from a "use client" component.

import { getActiveFunds, getDataAsOfDate, getDistributions, getFundByTicker, getManagerBySlug } from "@/lib/data";
import { getAllComputedRatings, rankBy } from "@/lib/ratings/rankings";
import type { ComputedFundRatings } from "@/lib/ratings/compute";
import { getUpdateStatus } from "@/lib/ingest/status";
import { CHANGE_CATEGORY_LABELS_SINGULAR } from "@/lib/ingest/types";
import type { ChangeEvent } from "@/lib/ingest/types";
import { STRATEGY_LABELS, FREQUENCY_LABELS, formatCompactUsd, formatPct, formatDate } from "@/lib/format";
import { STRATEGY_COPY } from "@/lib/strategy-copy";
import { pickTodaysEducationTopic } from "./education";
import type {
  CalendarEntry,
  ChangeSummaryItem,
  ContentFundRef,
  ContentReport,
  FundSpotlight,
  IncomeCalc,
  IncomeRadar,
  NewFundAlert,
  RadarEntry,
  SourceRef,
  UnderTheRadarPick,
  WatchlistEntry,
  WhatChangedToday,
  YieldComparisonRow,
  YieldTrapCheck,
} from "./types";

function toFundRef(row: Pick<ComputedFundRatings, "fund">): ContentFundRef {
  const manager = getManagerBySlug(row.fund.manager_slug);
  return { ticker: row.fund.ticker, fundName: row.fund.fund_name, managerName: manager?.name ?? null };
}

function headlineYield(r: ComputedFundRatings): number | null {
  return r.metrics?.ttm_yield_pct ?? r.metrics?.distribution_yield_pct ?? null;
}

function navTrendLabel(r: ComputedFundRatings): string {
  if (r.navAnalysis.insufficientHistory || r.navAnalysis.navCagrPct == null) return "Insufficient history";
  if (r.navAnalysis.navCagrPct > 2) return "Rising";
  if (r.navAnalysis.navCagrPct < -2) return "Declining";
  return "Flat";
}

function sourceRefFor(r: ComputedFundRatings, label: string): SourceRef {
  return {
    label,
    sourceName: r.metrics?.data_source ?? null,
    sourceUrl: r.metrics?.source_url ?? null,
    asOfDate: r.metrics?.as_of_date ?? null,
  };
}

// ---- New Fund Alert --------------------------------------------------------

function buildNewFundAlert(ratingsByTicker: Map<string, ComputedFundRatings>): NewFundAlert | null {
  const [newest] = rankBy("newest", 1);
  if (!newest) return null;
  const r = ratingsByTicker.get(newest.fund.ticker) ?? newest;
  const yieldPct = headlineYield(r);
  return {
    fund: toFundRef(r),
    launchDate: r.fund.inception_date,
    strategyLabel: STRATEGY_LABELS[r.fund.strategy_category] ?? r.fund.strategy_category,
    strategySummary: r.fund.strategy_summary ?? STRATEGY_COPY[r.fund.strategy_category]?.how ?? null,
    frequencyLabel: FREQUENCY_LABELS[r.fund.distribution_frequency] ?? r.fund.distribution_frequency,
    distributionYieldPct: yieldPct,
    expenseRatioPct: r.metrics?.expense_ratio_pct ?? null,
    underlying: r.fund.underlying,
    whyInterested: r.fund.strategy_tradeoff
      ? `A newer entry in the ${STRATEGY_LABELS[r.fund.strategy_category]?.toLowerCase() ?? r.fund.strategy_category} category — worth researching for how its structure compares to established peers.`
      : "A newer, not-yet-widely-discussed fund — worth a closer look before it becomes widely covered.",
    biggestRisk: r.fund.strategy_tradeoff ?? STRATEGY_COPY[r.fund.strategy_category]?.tradeoff ?? "Limited track record — insufficient history to assess NAV behavior or distribution consistency yet.",
    watch: "Whether the fund's distribution rate holds as it builds a longer track record, and how NAV behaves through its first full market cycle.",
    verificationStatus: r.fund.verification_status,
  };
}

// ---- Fund Spotlight ---------------------------------------------------------

function buildFundSpotlight(ratingsByTicker: Map<string, ComputedFundRatings>, excludeTicker?: string): FundSpotlight | null {
  const candidates = rankBy("yield", 10).filter((r) => r.fund.ticker !== excludeTicker);
  const r = candidates[0];
  if (!r) return null;
  const yieldPct = headlineYield(r);
  const strategyCopy = STRATEGY_COPY[r.fund.strategy_category];

  const whyYieldIsHigh = strategyCopy
    ? `${strategyCopy.advanced} Selling options against the holdings converts expected future price upside into current cash distributions, which is what pushes the yield well above a traditional dividend fund's.`
    : "Strategy detail not yet verified for this fund — see its prospectus for the exact income mechanism.";

  const concerns: string[] = [...r.navDecay.reasons];
  if (r.risk.label === "HIGH" || r.risk.label === "VERY HIGH") {
    concerns.push(`Risk score is rated ${r.risk.label.toLowerCase()} relative to tracked peers.`);
  }
  const whatCouldGoWrong =
    concerns.length > 0
      ? concerns.join(" ")
      : r.fund.strategy_tradeoff ?? strategyCopy?.tradeoff ?? "No elevated NAV-decay or risk signals in the currently verified data — that can change.";

  return {
    fund: toFundRef(r),
    asOfDate: r.metrics?.as_of_date ?? null,
    price: r.metrics?.price ?? null,
    distributionYieldPct: yieldPct,
    secYield30dPct: r.metrics?.sec_yield_30day_pct ?? null,
    frequencyLabel: FREQUENCY_LABELS[r.fund.distribution_frequency] ?? r.fund.distribution_frequency,
    expenseRatioPct: r.metrics?.expense_ratio_pct ?? null,
    aumUsd: r.metrics?.aum_usd ?? null,
    inceptionDate: r.fund.inception_date,
    navCagrPct: r.navAnalysis.navCagrPct,
    totalReturn1YPct: r.periodReturns.find((p) => p.period === "1Y")?.totalReturnReinvestedPct ?? r.periodReturns.find((p) => p.period === "1Y")?.totalReturnPct ?? null,
    maxDrawdownPct: r.navAnalysis.maxDrawdownPct,
    riskLabel: r.risk.label,
    navDecayLevel: r.navDecay.level,
    whatItDoes: strategyCopy?.how ?? "Strategy mechanics not yet verified for this fund.",
    whyYieldIsHigh,
    whatCouldGoWrong,
    whoMightConsider:
      "Income-focused investors comfortable with the strategy's tradeoffs — worth researching against the fund's own prospectus before making any decision.",
    verificationStatus: r.metrics?.verification_status ?? r.fund.verification_status,
    source: sourceRefFor(r, `${r.fund.ticker} daily metrics`),
  };
}

// ---- Yield comparison + watchlist -------------------------------------------

function buildYieldComparison(ratingsByTicker: Map<string, ComputedFundRatings>, spotlight: FundSpotlight | null): YieldComparisonRow[] {
  if (!spotlight) return [];
  const spotlightFund = getFundByTicker(spotlight.fund.ticker);
  if (!spotlightFund) return [];
  const peers = rankBy("yield", 200, (r) => r.fund.strategy_category === spotlightFund.strategy_category && r.fund.ticker !== spotlightFund.ticker).slice(0, 4);
  const spotlightRow = ratingsByTicker.get(spotlightFund.ticker);
  const rows = spotlightRow ? [spotlightRow, ...peers] : peers;
  return rows.map((r) => ({
    fund: toFundRef(r),
    distributionYieldPct: headlineYield(r),
    frequencyLabel: FREQUENCY_LABELS[r.fund.distribution_frequency] ?? r.fund.distribution_frequency,
    expenseRatioPct: r.metrics?.expense_ratio_pct ?? null,
    navTrend: navTrendLabel(r),
    strategyLabel: STRATEGY_LABELS[r.fund.strategy_category] ?? r.fund.strategy_category,
  }));
}

function buildWatchlist(): WatchlistEntry[] {
  return rankBy("yield", 5).map((r) => {
    const riskFactors: string[] = [];
    if (r.risk.label === "HIGH" || r.risk.label === "VERY HIGH") riskFactors.push(`${r.risk.label} risk score`);
    if (r.navDecay.level === "HIGH" || r.navDecay.level === "MODERATE") riskFactors.push(`${r.navDecay.level} NAV decay signal`);
    if (r.avgRocPct != null && r.avgRocPct > 25) riskFactors.push(`${r.avgRocPct.toFixed(0)}% avg. Return of Capital`);
    if (riskFactors.length === 0) riskFactors.push("No elevated risk signals in currently verified data");
    return {
      fund: toFundRef(r),
      distributionYieldPct: headlineYield(r),
      frequencyLabel: FREQUENCY_LABELS[r.fund.distribution_frequency] ?? r.fund.distribution_frequency,
      strategyLabel: STRATEGY_LABELS[r.fund.strategy_category] ?? r.fund.strategy_category,
      navTrend: navTrendLabel(r),
      riskFactors,
      whyItDeservesAttention: `One of the higher verified distribution yields being tracked today, in the ${STRATEGY_LABELS[r.fund.strategy_category]?.toLowerCase() ?? r.fund.strategy_category} category.`,
    };
  });
}

function buildYieldTrapCheck(): YieldTrapCheck | null {
  const ranked = rankBy("yield", 25);
  const r = ranked.find(
    (row) => row.navDecay.level === "HIGH" || row.risk.label === "VERY HIGH" || (row.avgRocPct != null && row.avgRocPct > 50),
  );
  if (!r) return null;
  const concerns = [...r.navDecay.reasons];
  if (r.risk.label === "VERY HIGH") concerns.push("Risk score is rated very high relative to tracked peers.");
  if (concerns.length === 0) concerns.push("Elevated yield alongside limited verified NAV history — insufficient data to fully rule out NAV erosion yet.");
  return { fund: toFundRef(r), distributionYieldPct: headlineYield(r), concerns };
}

function buildUnderTheRadar(ratingsByTicker: Map<string, ComputedFundRatings>, excludeTickers: Set<string>): UnderTheRadarPick | null {
  const rows = getAllComputedRatings().filter(
    (r) => r.metrics?.aum_usd != null && r.metrics.aum_usd < 100_000_000 && !excludeTickers.has(r.fund.ticker),
  );
  rows.sort((a, b) => (b.yieldIqScore.score ?? -1) - (a.yieldIqScore.score ?? -1));
  const r = rows[0];
  if (!r) return null;
  const yieldPct = headlineYield(r);
  return {
    fund: toFundRef(r),
    aumUsd: r.metrics?.aum_usd ?? null,
    distributionYieldPct: yieldPct,
    strategyLabel: STRATEGY_LABELS[r.fund.strategy_category] ?? r.fund.strategy_category,
    whyItDeservesResearch:
      `Smaller AUM (${formatCompactUsd(r.metrics?.aum_usd ?? null)}) than the flagship names in its category — not yet widely discussed.` +
      (yieldPct != null ? ` Verified distribution yield of ${formatPct(yieldPct)}.` : " Distribution yield not yet verified."),
  };
}

// ---- Calendar -----------------------------------------------------------

function buildCalendar(): { entries: CalendarEntry[]; isUpcoming: boolean } {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in30 = new Date(today.getTime() + 30 * 86_400_000);
  const back60 = new Date(today.getTime() - 60 * 86_400_000);

  const funds = getActiveFunds();
  const upcoming: CalendarEntry[] = [];
  const recent: CalendarEntry[] = [];

  for (const f of funds) {
    const manager = getManagerBySlug(f.manager_slug);
    const ref: ContentFundRef = { ticker: f.ticker, fundName: f.fund_name, managerName: manager?.name ?? null };
    for (const d of getDistributions(f.ticker)) {
      const exDate = new Date(d.ex_date + "T00:00:00Z");
      const entry: CalendarEntry = { fund: ref, exDate: d.ex_date, payDate: d.pay_date, amountPerShare: d.amount_per_share };
      if (exDate.getTime() >= today.getTime() && exDate.getTime() <= in30.getTime()) upcoming.push(entry);
      else if (exDate.getTime() >= back60.getTime() && exDate.getTime() < today.getTime()) recent.push(entry);
    }
  }

  if (upcoming.length > 0) {
    upcoming.sort((a, b) => a.exDate.localeCompare(b.exDate));
    return { entries: upcoming.slice(0, 8), isUpcoming: true };
  }
  recent.sort((a, b) => b.exDate.localeCompare(a.exDate));
  return { entries: recent.slice(0, 8), isUpcoming: false };
}

// ---- "How much would you need" ------------------------------------------

const MONTHLY_TARGETS = [100, 250, 500, 1000, 2500];

function buildIncomeCalc(spotlight: FundSpotlight | null): IncomeCalc | null {
  if (!spotlight) return null;
  const yieldPct = spotlight.distributionYieldPct;
  return {
    fund: spotlight.fund,
    annualizedYieldPct: yieldPct,
    rows: MONTHLY_TARGETS.map((monthlyTarget) => ({
      monthlyTarget,
      capitalNeeded: yieldPct != null && yieldPct > 0 ? (monthlyTarget * 12) / (yieldPct / 100) : null,
    })),
  };
}

// ---- Income ETF Radar -----------------------------------------------------

function buildIncomeRadar(exclude: Set<string> = new Set()): IncomeRadar {
  const rows = getAllComputedRatings().filter((r) => r.metrics != null && !exclude.has(r.fund.ticker));

  const green = rows
    .filter((r) => r.risk.label != null && r.risk.label !== "HIGH" && r.risk.label !== "VERY HIGH" && r.navDecay.level !== "HIGH" && r.yieldIqScore.score != null)
    .sort((a, b) => (b.yieldIqScore.score as number) - (a.yieldIqScore.score as number))
    .slice(0, 3);
  const greenTickers = new Set(green.map((r) => r.fund.ticker));

  const red = rows
    .filter((r) => !greenTickers.has(r.fund.ticker) && (r.navDecay.level === "HIGH" || r.risk.label === "VERY HIGH"))
    .sort((a, b) => (headlineYield(b) ?? 0) - (headlineYield(a) ?? 0))
    .slice(0, 3);
  const redTickers = new Set(red.map((r) => r.fund.ticker));

  const yellow = rows
    .filter((r) => !greenTickers.has(r.fund.ticker) && !redTickers.has(r.fund.ticker))
    .sort((a, b) => (headlineYield(b) ?? 0) - (headlineYield(a) ?? 0))
    .slice(0, 3);

  const toEntry = (r: ComputedFundRatings, reason: string): RadarEntry => ({ fund: toFundRef(r), reason });

  return {
    worthResearching: green.map((r) =>
      toEntry(r, `YieldIQ Score ${r.yieldIqScore.score!.toFixed(0)}/100 with ${(r.risk.label ?? "unrated").toLowerCase()} risk and no active NAV-decay flag.`),
    ),
    watch: yellow.map((r) =>
      toEntry(
        r,
        r.yieldIqScore.score == null
          ? "Insufficient verified history for a full YieldIQ Score yet — needs more data before a fuller read is possible."
          : `Moderate signals — YieldIQ Score ${r.yieldIqScore.score.toFixed(0)}/100, worth continued monitoring.`,
      ),
    ),
    warningFlags: red.map((r) =>
      toEntry(r, r.navDecay.reasons[0] ?? `Risk score rated ${(r.risk.label ?? "elevated").toLowerCase()} relative to tracked peers.`),
    ),
  };
}

// ---- What changed today ----------------------------------------------------

function describeChange(c: ChangeEvent): string {
  if (c.reason) return c.reason;
  if (c.field && c.previous_value != null && c.new_value != null) {
    return `${c.field} changed from ${c.previous_value} to ${c.new_value}`;
  }
  if (c.field && c.new_value != null) return `${c.field}: ${c.new_value}`;
  return CHANGE_CATEGORY_LABELS_SINGULAR[c.category];
}

function buildWhatChangedToday(): WhatChangedToday {
  const status = getUpdateStatus();
  if (!status.last) {
    return {
      hasRun: false,
      asOfDate: null,
      updateType: null,
      items: [],
      note: "No data-ingestion run has been logged yet in this environment (src/data/seed/update-history.json is empty). Run `npm run ingest:fmp` with FMP_API_KEY set, or trigger the weekly GitHub Action, to populate real change history here.",
    };
  }
  const items: ChangeSummaryItem[] = status.last.changes.slice(0, 10).map((c) => ({
    ticker: c.ticker,
    categoryLabel: CHANGE_CATEGORY_LABELS_SINGULAR[c.category],
    description: describeChange(c),
  }));
  return {
    hasRun: true,
    asOfDate: status.last.date,
    updateType: status.last.update_type,
    items,
    note:
      items.length > 0
        ? `${items.length} verified change(s) detected in the most recent ${status.last.update_type} update run.`
        : `The most recent ${status.last.update_type} update run completed with no detected changes since the prior run.`,
  };
}

// ---- Sources ----------------------------------------------------------------

function collectSources(parts: (SourceRef | null | undefined)[]): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const s of parts) {
    if (!s) continue;
    const key = `${s.label}|${s.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// ---- Social copy ------------------------------------------------------------

function buildSocial(report: Omit<ContentReport, "social">): ContentReport["social"] {
  const hashtags = "#DividendInvesting #IncomeETF #ETFs #HighYield";
  const spotlight = report.fundSpotlight;

  const xPostPrimary = spotlight
    ? [
        `The yield is eye-catching, but here's what investors need to understand: $${spotlight.fund.ticker} carries a verified ${formatPct(spotlight.distributionYieldPct)} distribution yield (as of ${formatDate(spotlight.asOfDate)}).`,
        "",
        spotlight.whatCouldGoWrong,
        "",
        "Is the risk worth the income here, or does total return tell a different story?",
        "",
        hashtags,
      ].join("\n")
    : "Today's verified dataset doesn't yet have enough data for a primary spotlight post. Definitely worth checking back once more funds carry verified metrics.";

  const xPostEducational = [`${report.education.title}`, "", report.education.body, "", "#DividendInvesting #Investing"].join("\n");

  const discoveryPick = report.underTheRadar;
  const xPostDiscovery = discoveryPick
    ? [
        `I haven't heard of this fund before: $${discoveryPick.fund.ticker} (${discoveryPick.fund.fundName}).`,
        "",
        discoveryPick.whyItDeservesResearch,
        "",
        "Definitely worth researching before it becomes widely discussed.",
        "",
        hashtags,
      ].join("\n")
    : "No under-the-radar fund surfaced from today's verified small-AUM data. Definitely worth widening the research pass.";

  let xThread: string[] | null = null;
  if (spotlight) {
    const strategyCopy = STRATEGY_COPY[getFundByTicker(spotlight.fund.ticker)?.strategy_category ?? "other"];
    xThread = [
      `1/ Here's why investors are watching $${spotlight.fund.ticker} — a verified ${formatPct(spotlight.distributionYieldPct)} distribution yield as of ${formatDate(spotlight.asOfDate)}. Thread. 🧵`,
      `2/ What it is: ${spotlight.fund.fundName}, managed by ${spotlight.fund.managerName ?? "an unverified manager"}. Distributes ${spotlight.frequencyLabel.toLowerCase()}.`,
      `3/ How it generates income: ${spotlight.whatItDoes}`,
      `4/ Why the yield is high: ${spotlight.whyYieldIsHigh}`,
      `5/ NAV/historical considerations: ${
        spotlight.navCagrPct != null
          ? `NAV has moved at roughly ${formatSignedForThread(spotlight.navCagrPct)}% annualized, with a max drawdown of ${formatPct(spotlight.maxDrawdownPct)} from peak.`
          : "Insufficient verified NAV history for a longer-term trend view yet."
      }`,
      `6/ Here's the risk most investors should understand: ${spotlight.whatCouldGoWrong}`,
      `7/ Who may want to research it: ${spotlight.whoMightConsider}`,
      `8/ Summary: High yield ≠ high return. $${spotlight.fund.ticker} is definitely worth researching on its own merits — not just its headline number. ${hashtags}`,
    ];
    if (strategyCopy?.advanced) {
      xThread.splice(4, 0, `4a/ Worth knowing: ${strategyCopy.advanced}`);
    }
  }

  const instagramSlides = spotlight
    ? [
        `This fund is yielding ${formatPct(spotlight.distributionYieldPct)}... but here's the catch.`,
        `${spotlight.fund.ticker} — ${spotlight.fund.fundName}, from ${spotlight.fund.managerName ?? "an unverified manager"}.`,
        `Current distribution yield: ${formatPct(spotlight.distributionYieldPct)} (verified as of ${formatDate(spotlight.asOfDate)}). Frequency: ${spotlight.frequencyLabel}.`,
        `How it generates income: ${spotlight.whatItDoes}`,
        spotlight.navCagrPct != null
          ? `NAV/total return: NAV trending at ~${formatSignedForThread(spotlight.navCagrPct)}%/yr annualized, max drawdown ${formatPct(spotlight.maxDrawdownPct)} from peak.`
          : "NAV/total return: insufficient verified history yet for a trend read.",
        `Biggest risk: ${spotlight.whatCouldGoWrong}`,
        `Who should research it: ${spotlight.whoMightConsider}`,
        "Key takeaway: high yield doesn't automatically mean high return — always check total return, not just the distribution.",
      ]
    : [
        "Today's dataset doesn't have a fund with enough verified data for a full spotlight carousel.",
        "That's by design: YieldIQ never fills a slide with a guessed figure.",
        "Check back as more funds pick up verified daily metrics.",
        "In the meantime — here's a reminder of the one rule that matters most on this page:",
        "High yield does not necessarily mean high return.",
        "Distribution yield measures cash paid out.",
        "Total return measures whether your investment actually grew.",
        "Always check both before deciding a fund is worth your capital.",
      ];

  const instagramCaption = spotlight
    ? `${spotlight.fund.ticker} is carrying a verified ${formatPct(spotlight.distributionYieldPct)} distribution yield as of ${formatDate(spotlight.asOfDate)} — here's what makes the yield interesting, and here's the risk most investors should understand before assuming a big number means a big win. Swipe through, and let us know: would you research this one further? ${hashtags} #PassiveIncome`
    : `No fund in today's verified dataset had enough data for a full spotlight — swipe through for today's reminder on why high yield and high return aren't the same thing. ${hashtags}`;

  return { xPostPrimary, xPostEducational, xPostDiscovery, xThread, instagramSlides, instagramCaption };
}

function formatSignedForThread(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

// ---- Top-level assembly -----------------------------------------------------

export function generateContentReport(): ContentReport {
  const allRatings = getAllComputedRatings();
  const ratingsByTicker = new Map(allRatings.map((r) => [r.fund.ticker, r]));

  const newFundAlert = buildNewFundAlert(ratingsByTicker);
  const fundSpotlight = buildFundSpotlight(ratingsByTicker, newFundAlert?.fund.ticker);
  const yieldComparison = buildYieldComparison(ratingsByTicker, fundSpotlight);
  const watchlist = buildWatchlist();
  const yieldTrapCheck = buildYieldTrapCheck();

  const excludeForRadar = new Set(
    [newFundAlert?.fund.ticker, fundSpotlight?.fund.ticker, yieldTrapCheck?.fund.ticker, ...watchlist.map((w) => w.fund.ticker)].filter(
      (t): t is string => !!t,
    ),
  );
  const underTheRadar = buildUnderTheRadar(ratingsByTicker, excludeForRadar);

  const education = pickTodaysEducationTopic();
  const calendar = buildCalendar();
  const incomeCalc = buildIncomeCalc(fundSpotlight);
  const incomeRadar = buildIncomeRadar();
  const whatChangedToday = buildWhatChangedToday();

  const sources = collectSources([
    fundSpotlight?.source,
    newFundAlert ? { label: `${newFundAlert.fund.ticker} identity/metrics`, sourceName: "YieldIQ verified seed data", sourceUrl: null, asOfDate: null } : null,
    { label: "SEC filings (identity/verification cross-check)", sourceName: "SEC EDGAR", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar", asOfDate: null },
    ...yieldComparison.map((row) => {
      const r = ratingsByTicker.get(row.fund.ticker);
      return r ? sourceRefFor(r, `${row.fund.ticker} daily metrics`) : null;
    }),
    ...watchlist.map((w) => {
      const r = ratingsByTicker.get(w.fund.ticker);
      return r ? sourceRefFor(r, `${w.fund.ticker} daily metrics`) : null;
    }),
  ]);

  const partial: Omit<ContentReport, "social"> = {
    generatedAt: new Date().toISOString(),
    dataAsOfDate: getDataAsOfDate(),
    newFundAlert,
    fundSpotlight,
    yieldComparison,
    watchlist,
    yieldTrapCheck,
    underTheRadar,
    education,
    calendar,
    incomeCalc,
    incomeRadar,
    whatChangedToday,
    sources,
  };

  return { ...partial, social: buildSocial(partial) };
}
