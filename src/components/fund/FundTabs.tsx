"use client";

import { useState } from "react";
import type { Fund, FundDistribution, FundHolding, FundNavHistoryPoint } from "@/lib/types";
import type { ComputedFundRatings } from "@/lib/ratings/compute";
import { formatCurrency, formatDate, formatPct, formatSignedPct } from "@/lib/format";
import { PERIOD_LABELS } from "@/lib/performance";
import { ReturnValue, NavDecayBadge, RiskBadge } from "@/components/ui/Badges";
import StarRating from "@/components/ui/StarRating";
import RatingExplainer from "@/components/fund/RatingExplainer";
import LineChart from "@/components/charts/LineChart";
import { STRATEGY_COPY } from "@/lib/strategy-copy";

const TABS = [
  "Overview",
  "Income",
  "NAV",
  "Performance",
  "Distributions",
  "Holdings",
  "Strategy",
  "Risk",
  "Tax",
] as const;

export default function FundTabs({
  fund,
  ratings,
  distributions,
  holdings,
  navHistory,
}: {
  fund: Fund;
  ratings: ComputedFundRatings;
  distributions: FundDistribution[];
  holdings: FundHolding[];
  navHistory: FundNavHistoryPoint[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  return (
    <div>
      <div className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
              tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "Overview" && <Overview fund={fund} ratings={ratings} />}
        {tab === "Income" && <Income fund={fund} ratings={ratings} distributions={distributions} />}
        {tab === "NAV" && <NavTab ratings={ratings} navHistory={navHistory} />}
        {tab === "Performance" && <Performance ratings={ratings} />}
        {tab === "Distributions" && <Distributions distributions={distributions} />}
        {tab === "Holdings" && <Holdings holdings={holdings} fund={fund} />}
        {tab === "Strategy" && <Strategy fund={fund} />}
        {tab === "Risk" && <Risk ratings={ratings} />}
        {tab === "Tax" && <Tax distributions={distributions} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="tabular mt-1 text-lg font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function Overview({ fund, ratings }: { fund: Fund; ratings: ComputedFundRatings }) {
  const m = ratings.metrics;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Price" value={m?.price != null ? formatCurrency(m.price) : "Data unavailable"} />
        <StatCard label="NAV" value={m?.nav != null ? formatCurrency(m.nav) : "Data unavailable"} />
        <StatCard label="Distribution Yield" value={formatPct(m?.distribution_yield_pct ?? m?.ttm_yield_pct ?? null)} />
        <StatCard label="SEC Yield (30-day)" value={m?.sec_yield_30day_pct != null ? formatPct(m.sec_yield_30day_pct) : "Not published"} />
        <StatCard label="Distribution Frequency" value={fund.distribution_frequency.toUpperCase()} />
        <StatCard label="Expense Ratio" value={formatPct(m?.expense_ratio_pct, 2)} />
        <StatCard label="AUM" value={m?.aum_usd != null ? formatCurrency(m.aum_usd, 0) : "Data unavailable"} />
        <StatCard label="Inception Date" value={formatDate(fund.inception_date)} />
      </div>

      {ratings.navDecay.level && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">NAV Decay Alert</p>
            <NavDecayBadge level={ratings.navDecay.level} />
          </div>
          {ratings.navDecay.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {ratings.navDecay.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {ratings.navDecay.level === "LOW" && ratings.navDecay.reasons.length === 0 && (
            <p className="mt-2 text-sm text-muted">
              No elevated NAV decay signals detected in verified data.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RatingBlock
          label="NAV Growth Rating"
          stars={ratings.navGrowth.stars}
          explainer={
            <RatingExplainer
              title="NAV Growth Rating"
              score={ratings.navGrowth.score}
              scoreLabel="/ 100"
              breakdown={ratings.navGrowth.breakdown}
              methodologyNote="Based only on NAV trend, drawdown, volatility and stability — never on yield."
            />
          }
        />
        <RatingBlock
          label="Income Quality"
          stars={ratings.incomeQuality.stars}
          score100={ratings.incomeQuality.score}
          explainer={
            <RatingExplainer
              title="Income Quality Score"
              score={ratings.incomeQuality.score}
              scoreLabel="/ 100"
              breakdown={ratings.incomeQuality.breakdown}
            />
          }
        />
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Risk</p>
          <div className="mt-2">
            <RiskBadge risk={ratings.risk} />
          </div>
          <RatingExplainer
            title="Risk Score"
            score={ratings.risk.score}
            scoreLabel="/ 10"
            breakdown={ratings.risk.breakdown}
          />
        </div>
      </div>
    </div>
  );
}

function RatingBlock({
  label,
  stars,
  score100,
  explainer,
}: {
  label: string;
  stars: number | null;
  score100?: number | null;
  explainer: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-2">
        <StarRating value={stars} />
      </div>
      {score100 != null && <p className="tabular mt-1 text-xs text-muted">Score: {score100.toFixed(1)} / 100</p>}
      <div className="mt-2">{explainer}</div>
    </div>
  );
}

function Income({ fund, ratings, distributions }: { fund: Fund; ratings: ComputedFundRatings; distributions: FundDistribution[] }) {
  const m = ratings.metrics;
  const latest = distributions[0];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Current Yield" value={formatPct(m?.distribution_yield_pct ?? null)} />
        <StatCard label="Forward Yield" value={formatPct(m?.forward_distribution_yield_pct ?? null)} />
        <StatCard label="TTM Yield" value={formatPct(m?.ttm_yield_pct ?? null)} />
        <StatCard label="SEC Yield" value={m?.sec_yield_30day_pct != null ? formatPct(m.sec_yield_30day_pct) : "Not published"} />
        <StatCard label="Latest Distribution" value={latest ? formatCurrency(latest.amount_per_share, 4) : "Data unavailable"} />
        <StatCard label="Frequency" value={fund.distribution_frequency.toUpperCase()} />
        <StatCard label="Last Ex-Date" value={latest ? formatDate(latest.ex_date) : "—"} />
        <StatCard label="Last Pay Date" value={latest?.pay_date ? formatDate(latest.pay_date) : "—"} />
      </div>
      <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
        <p className="font-semibold text-caution">Distribution yield is not the same as investment return.</p>
        <p className="mt-1 text-muted">
          A high yield can coexist with a falling share price. See the Performance tab for
          price return vs. total return, side by side.
        </p>
      </div>
    </div>
  );
}

function NavTab({ ratings, navHistory }: { ratings: ComputedFundRatings; navHistory: FundNavHistoryPoint[] }) {
  const nav = ratings.navAnalysis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Current NAV" value={nav.currentNav != null ? formatCurrency(nav.currentNav) : "Data unavailable"} />
        <StatCard label="NAV CAGR" value={nav.navCagrPct != null ? formatSignedPct(nav.navCagrPct) : "Insufficient history"} />
        <StatCard label="Maximum Drawdown" value={nav.maxDrawdownPct != null ? formatSignedPct(nav.maxDrawdownPct) : "Insufficient history"} />
        <StatCard label="Annualized Volatility" value={nav.volatilityAnnualizedPct != null ? formatPct(nav.volatilityAnnualizedPct) : "Insufficient history"} />
      </div>
      <div className="card p-4">
        <p className="mb-3 font-semibold">NAV / Price / Total Return</p>
        <LineChart
          series={[
            { key: "nav", label: "NAV", color: "var(--accent)", points: navHistory.map((p) => ({ date: p.as_of_date, value: p.nav })) },
            { key: "price", label: "Price", color: "var(--info)", points: navHistory.map((p) => ({ date: p.as_of_date, value: p.price })) },
            { key: "tr", label: "Total Return (indexed)", color: "var(--caution)", points: navHistory.map((p) => ({ date: p.as_of_date, value: p.total_return_index })) },
          ]}
        />
        <p className="mt-3 text-xs text-muted">
          YieldIQ began recording verified daily NAV/price history for this fund on{" "}
          {navHistory[0]?.as_of_date ? formatDate(navHistory[0].as_of_date) : "an unrecorded date"}. Longer-range
          charts deepen automatically as more verified snapshots accumulate — never backfilled with estimates.
        </p>
      </div>
    </div>
  );
}

function Performance({ ratings }: { ratings: ComputedFundRatings }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-caution/30 bg-caution/10 p-3 text-xs text-caution">
        PRICE RETURN measures only the change in share price. TOTAL RETURN adds distributions
        received. A fund can pay a large distribution while its total return is still negative —
        never read yield as return.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 font-medium">Period</th>
              <th className="pb-2 text-right font-medium">Price Return</th>
              <th className="pb-2 text-right font-medium">Distribution Return</th>
              <th className="pb-2 text-right font-medium">Total Return</th>
              <th className="pb-2 text-right font-medium">Total Return (reinvested)</th>
            </tr>
          </thead>
          <tbody>
            {ratings.periodReturns.map((p) => (
              <tr key={p.period} className="border-t border-border">
                <td className="py-2 font-medium">{PERIOD_LABELS[p.period]}</td>
                <td className="py-2 text-right"><ReturnValue value={p.priceReturnPct} /></td>
                <td className="py-2 text-right"><ReturnValue value={p.distributionReturnPct} /></td>
                <td className="py-2 text-right"><ReturnValue value={p.totalReturnPct} /></td>
                <td className="py-2 text-right"><ReturnValue value={p.totalReturnReinvestedPct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Distributions({ distributions }: { distributions: FundDistribution[] }) {
  if (distributions.length === 0) {
    return <div className="card p-6 text-center text-sm text-muted">No verified distribution history recorded yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-medium">Ex-Date</th>
            <th className="pb-2 font-medium">Pay Date</th>
            <th className="pb-2 text-right font-medium">Amount</th>
            <th className="pb-2 text-right font-medium">Implied Yield</th>
            <th className="pb-2 font-medium">Classification</th>
          </tr>
        </thead>
        <tbody>
          {distributions.map((d) => (
            <tr key={d.ex_date} className="border-t border-border">
              <td className="py-2">{formatDate(d.ex_date)}</td>
              <td className="py-2">{d.pay_date ? formatDate(d.pay_date) : "—"}</td>
              <td className="tabular py-2 text-right">{formatCurrency(d.amount_per_share, 4)}</td>
              <td className="tabular py-2 text-right">{d.implied_yield_pct != null ? formatPct(d.implied_yield_pct) : "—"}</td>
              <td className="py-2 text-xs text-muted">
                {d.return_of_capital_pct != null ? `${d.return_of_capital_pct.toFixed(0)}% ROC` : "Not yet reported"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Holdings({ holdings, fund }: { holdings: FundHolding[]; fund: Fund }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Underlying exposure: <span className="font-semibold text-foreground">{fund.underlying ?? "Data unavailable"}</span>
      </p>
      {holdings.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">No verified holdings data reported yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Holding</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.holding_name} className="border-t border-border">
                  <td className="py-2 font-medium">{h.holding_name}</td>
                  <td className="py-2 text-xs text-muted">{h.exposure_type ?? "—"}</td>
                  <td className="tabular py-2 text-right">{h.weight_pct != null ? formatPct(h.weight_pct) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Strategy({ fund }: { fund: Fund }) {
  const copy = STRATEGY_COPY[fund.strategy_category];
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">How It Makes Money</p>
        <p className="mt-2 text-sm">{fund.strategy_summary ?? copy.how}</p>
      </div>
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-caution">What You Are Giving Up</p>
        <p className="mt-2 text-sm">{fund.strategy_tradeoff ?? copy.tradeoff}</p>
      </div>
      <details className="card p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">
          Advanced
        </summary>
        <p className="mt-2 text-sm text-muted">{fund.strategy_advanced ?? copy.advanced}</p>
      </details>
    </div>
  );
}

function Risk({ ratings }: { ratings: ComputedFundRatings }) {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Risk Score</p>
        <div className="mt-2">
          <RiskBadge risk={ratings.risk} />
        </div>
        <RatingExplainer
          title="Risk Score"
          score={ratings.risk.score}
          scoreLabel="/ 10 (higher = riskier)"
          breakdown={ratings.risk.breakdown}
        />
      </div>
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Liquidity Rating</p>
        <div className="mt-2">
          <StarRating value={ratings.liquidity.stars} />
        </div>
        {ratings.liquidity.flagSmallFund && (
          <p className="mt-2 text-xs text-caution">⚠ Small / newer fund — lower liquidity, wider spreads possible.</p>
        )}
      </div>
      <div className="card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Distribution Sustainability</p>
        <div className="mt-2">
          <StarRating value={ratings.sustainability.stars} />
        </div>
        <RatingExplainer
          title="Distribution Sustainability"
          score={ratings.sustainability.score}
          scoreLabel="/ 100"
          breakdown={ratings.sustainability.breakdown}
        />
      </div>
    </div>
  );
}

function Tax({ distributions }: { distributions: FundDistribution[] }) {
  const withClassification = distributions.filter((d) => d.return_of_capital_pct != null);
  const avgRoc = withClassification.length
    ? withClassification.reduce((s, d) => s + (d.return_of_capital_pct as number), 0) / withClassification.length
    : null;

  return (
    <div className="space-y-4">
      {avgRoc != null && avgRoc >= 50 && (
        <div className="rounded-xl border border-negative/30 bg-negative/10 p-3 text-sm text-negative">
          <p className="font-semibold">⚠ HIGH ROC</p>
          <p className="mt-1">
            {avgRoc.toFixed(0)}% of recent distributions were classified as Return of Capital.
            Return of Capital is not automatically bad — but it affects your cost basis and can
            signal the fund is distributing more than it earns. Understand the tax and NAV impact
            before relying on this income.
          </p>
        </div>
      )}
      {withClassification.length === 0 ? (
        <div className="card p-6 text-center text-sm text-muted">Not yet reported.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Ex-Date</th>
                <th className="pb-2 text-right font-medium">Return of Capital</th>
                <th className="pb-2 text-right font-medium">Ordinary Income</th>
                <th className="pb-2 text-right font-medium">Capital Gains</th>
                <th className="pb-2 text-right font-medium">Other</th>
              </tr>
            </thead>
            <tbody>
              {withClassification.map((d) => (
                <tr key={d.ex_date} className="border-t border-border">
                  <td className="py-2">{formatDate(d.ex_date)}</td>
                  <td className="tabular py-2 text-right">{formatPct(d.return_of_capital_pct)}</td>
                  <td className="tabular py-2 text-right">{d.ordinary_income_pct != null ? formatPct(d.ordinary_income_pct) : "—"}</td>
                  <td className="tabular py-2 text-right">{d.capital_gains_pct != null ? formatPct(d.capital_gains_pct) : "—"}</td>
                  <td className="tabular py-2 text-right">{d.other_pct != null ? formatPct(d.other_pct) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">
        Tax information is based on reported fund classifications and may change. This is not
        personalized tax advice — consult a tax professional.
      </p>
    </div>
  );
}
