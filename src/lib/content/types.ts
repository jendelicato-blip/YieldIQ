// Types for the daily social-media content report. Every field here is
// either copied straight from verified/partially_verified data in
// src/lib/data + src/lib/ratings, or a templated sentence built from those
// computed values (e.g. a NAV Decay reason string) — never a hand-typed
// financial figure. See src/lib/content/generate.ts for how each section is
// selected and docs/DATA_SOURCES.md for what "verified" means here.

import type { VerificationStatus } from "@/lib/types";

export interface ContentFundRef {
  ticker: string;
  fundName: string;
  managerName: string | null;
}

export interface SourceRef {
  label: string; // what this source backs, e.g. "JEPI daily metrics"
  sourceName: string | null;
  sourceUrl: string | null;
  asOfDate: string | null;
}

export interface NewFundAlert {
  fund: ContentFundRef;
  launchDate: string | null;
  strategyLabel: string;
  strategySummary: string | null;
  frequencyLabel: string;
  distributionYieldPct: number | null;
  expenseRatioPct: number | null;
  underlying: string | null;
  whyInterested: string;
  biggestRisk: string;
  watch: string;
  verificationStatus: VerificationStatus;
}

export interface FundSpotlight {
  fund: ContentFundRef;
  asOfDate: string | null;
  price: number | null;
  distributionYieldPct: number | null; // headline (TTM, else trailing distribution yield)
  secYield30dPct: number | null;
  frequencyLabel: string;
  expenseRatioPct: number | null;
  aumUsd: number | null;
  inceptionDate: string | null;
  navCagrPct: number | null;
  totalReturn1YPct: number | null;
  maxDrawdownPct: number | null;
  riskLabel: string | null;
  navDecayLevel: string | null;
  whatItDoes: string;
  whyYieldIsHigh: string;
  whatCouldGoWrong: string;
  whoMightConsider: string;
  verificationStatus: VerificationStatus;
  source: SourceRef;
}

export interface YieldComparisonRow {
  fund: ContentFundRef;
  distributionYieldPct: number | null;
  frequencyLabel: string;
  expenseRatioPct: number | null;
  navTrend: string; // "Rising" | "Flat" | "Declining" | "Insufficient history"
  strategyLabel: string;
}

export interface WatchlistEntry {
  fund: ContentFundRef;
  distributionYieldPct: number | null;
  frequencyLabel: string;
  strategyLabel: string;
  navTrend: string;
  riskFactors: string[];
  whyItDeservesAttention: string;
}

export interface YieldTrapCheck {
  fund: ContentFundRef;
  distributionYieldPct: number | null;
  concerns: string[];
}

export interface UnderTheRadarPick {
  fund: ContentFundRef;
  aumUsd: number | null;
  distributionYieldPct: number | null;
  strategyLabel: string;
  whyItDeservesResearch: string;
}

export interface EducationTopic {
  title: string;
  body: string;
}

export interface CalendarEntry {
  fund: ContentFundRef;
  exDate: string;
  payDate: string | null;
  amountPerShare: number;
}

export interface IncomeCalcRow {
  monthlyTarget: number;
  capitalNeeded: number | null;
}

export interface IncomeCalc {
  fund: ContentFundRef;
  annualizedYieldPct: number | null;
  rows: IncomeCalcRow[];
}

export interface RadarEntry {
  fund: ContentFundRef;
  reason: string;
}

export interface IncomeRadar {
  worthResearching: RadarEntry[];
  watch: RadarEntry[];
  warningFlags: RadarEntry[];
}

export interface ChangeSummaryItem {
  ticker: string;
  categoryLabel: string;
  description: string;
}

export interface WhatChangedToday {
  hasRun: boolean;
  asOfDate: string | null;
  updateType: string | null;
  items: ChangeSummaryItem[];
  note: string;
}

export interface SocialContent {
  xPostPrimary: string;
  xPostEducational: string;
  xPostDiscovery: string;
  xThread: string[] | null;
  instagramSlides: string[]; // 8 slides
  instagramCaption: string;
}

export interface ContentReport {
  generatedAt: string; // ISO timestamp this report was built
  dataAsOfDate: string | null;
  newFundAlert: NewFundAlert | null;
  fundSpotlight: FundSpotlight | null;
  yieldComparison: YieldComparisonRow[];
  watchlist: WatchlistEntry[];
  yieldTrapCheck: YieldTrapCheck | null;
  underTheRadar: UnderTheRadarPick | null;
  education: EducationTopic;
  calendar: { entries: CalendarEntry[]; isUpcoming: boolean };
  incomeCalc: IncomeCalc | null;
  incomeRadar: IncomeRadar;
  whatChangedToday: WhatChangedToday;
  social: SocialContent;
  sources: SourceRef[];
}
