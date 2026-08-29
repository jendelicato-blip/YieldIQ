import DistinctionBanner from "@/components/ui/DistinctionBanner";
import TaxImpactCalculator from "@/components/tax/TaxImpactCalculator";
import { TAX_DISCLAIMER } from "@/lib/tax";

const TERMS: { q: string; a: string }[] = [
  { q: "What is a dividend?", a: "A cash payment a company or fund makes to its shareholders, typically from earnings or, in the case of many option-income ETFs, from option premium." },
  { q: "What is distribution yield?", a: "The most recent distribution, annualized, divided by the current price or NAV. It's a snapshot — it can rise simply because the price fell, not because the fund is paying more." },
  { q: "What is SEC yield?", a: "A standardized 30-day yield calculation the SEC requires for comparability across funds. Many option-income ETFs don't publish one because their income comes from option premium, not bond-like interest." },
  { q: "What is Return of Capital (ROC)?", a: "A distribution classified as returning your own invested capital rather than income or gains. It isn't automatically bad — some of it is often a byproduct of how option premium is taxed — but a high, persistent ROC percentage can mean the fund is paying out more than it earns, which erodes NAV over time." },
  { q: "What is NAV?", a: "Net Asset Value — the value of a fund's underlying holdings per share. It's different from the market price, though the two usually track closely for ETFs." },
  { q: "What is NAV decay?", a: "A sustained decline in NAV, often seen in option-income strategies that distribute more than the strategy earns, or during choppy/directional markets where the option overlay caps gains but not losses." },
  { q: "What is a covered call?", a: "An options strategy where a fund holds shares (or economic exposure to an index) and sells call options against them, collecting premium income in exchange for capping some of the upside if the price rallies." },
  { q: "What is a 0DTE option?", a: "An option that expires the same day it's traded ('zero days to expiration'). 0DTE strategies harvest very short-dated option premium, which can mean more frequent income but also more sensitivity to daily price swings." },
  { q: "What is an option-income ETF?", a: "A fund that generates some or all of its distributions by selling options (often covered calls) against stocks, indexes, or other assets it holds or references." },
  { q: "What is total return?", a: "Price return plus all distributions received (and, when reinvested, compounded). It's the true measure of what an investment actually earned — unlike price return or yield alone." },
  { q: "Why can a 50% yield produce a negative total return?", a: "If the share price falls faster than the distributions paid out, an investor can receive a lot of income while still losing money overall. Yield measures income; total return measures the whole picture, price included." },
  { q: "Why does share price fall after distributions?", a: "When a fund pays out cash, that cash leaves the fund, so NAV (and typically price) drops by roughly the distribution amount on the ex-date — the same mechanical effect as any dividend-paying stock or fund." },
  { q: "What is expense ratio?", a: "The percentage of fund assets charged annually to cover management and operating costs, deducted from returns automatically — you don't pay it separately." },
  { q: "What is yield on cost?", a: "Your current distribution rate divided by your original purchase price per share, rather than the current price. It reflects your personal income return, not the fund's." },
  { q: "What is distribution sustainability?", a: "A qualitative and quantitative read on whether a fund's current distribution rate is likely to hold up, based on consistency, total return, NAV trend, ROC levels and the underlying strategy — not a guarantee." },
];

export default function EducationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Education</h1>
      <p className="mt-1 text-sm text-muted">Plain-English answers. No jargon unless you ask for it.</p>

      <div className="mt-6 space-y-2">
        {TERMS.map((t) => (
          <details key={t.q} className="card p-4">
            <summary className="cursor-pointer font-semibold">{t.q}</summary>
            <p className="mt-2 text-sm text-muted">{t.a}</p>
          </details>
        ))}
      </div>

      <section id="ratings" className="mt-10 card p-5">
        <h2 className="text-lg font-bold">How YieldIQ&apos;s ratings work</h2>
        <p className="mt-2 text-sm text-muted">
          Every rating on YieldIQ is a documented formula run against verified data — never a
          subjective call. NAV Growth is built only from NAV trend, drawdown, volatility and
          stability (never yield). Risk Score blends strategy complexity, volatility, drawdown,
          liquidity and fund age. Income Quality and Distribution Sustainability combine
          consistency, NAV preservation, total return, and ROC prudence. The YieldIQ Score
          weights NAV Preservation 25%, Total Return 20%, Income Quality 15%, Distribution
          Sustainability 10%, Risk 10%, Yield 5%, Expense Ratio 5%, Liquidity 5%, and Fund Age
          5%. Any component with unverified or insufficient data is excluded and its weight
          is redistributed — never guessed. Tap &ldquo;Why this rating?&rdquo; on any fund page
          to see the exact numbers behind its score.
        </p>
      </section>

      <section id="tax" className="mt-10">
        <h2 className="text-lg font-bold">Tax Analysis: ROC vs. Ordinary Income</h2>
        <p className="mt-1 text-sm text-muted">
          A fund can advertise a very high distribution rate, but that does not mean the
          entire distribution is taxable income or that the investment earned that amount.
          This section explains the difference — in plain English.
        </p>

        <div className="mt-4">
          <DistinctionBanner />
        </div>

        <div className="mt-4 space-y-4">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">What is Return of Capital?</p>
            <p className="mt-2 text-sm text-muted">
              Return of Capital generally means a portion of a distribution is treated as a
              return of your own invested capital rather than current taxable income. ROC is
              generally not immediately taxable when received in a taxable brokerage account,
              but it generally reduces your tax basis in the investment.
            </p>
            <div className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
              <p className="font-semibold">Example</p>
              <p className="mt-1 text-muted">You invest $10,000. Your tax basis is initially $10,000.</p>
              <p className="mt-1 text-muted">You receive $1,000 classified as ROC.</p>
              <p className="mt-1 text-muted">Your adjusted tax basis may become $9,000.</p>
              <p className="mt-2 text-xs text-muted">
                The $1,000 ROC is generally not taxed as ordinary income when received, but the
                lower basis can increase a future taxable gain when the investment is sold.
              </p>
            </div>
            <p className="mt-3 text-xs text-muted">
              ROC is not automatically good or automatically bad — it can occur for legitimate
              reasons, particularly with certain option-income and managed-distribution
              strategies. However, persistent ROC accompanied by declining NAV can be an
              important warning sign worth investigating.
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">What is Ordinary Income?</p>
            <p className="mt-2 text-sm text-muted">
              Ordinary income distributions are generally taxable as ordinary income in a
              taxable brokerage account, unless the fund reports a different final tax
              classification. Not every distribution is ordinary income — actual tax treatment
              depends on the classification the fund ultimately reports. Potential sources
              include:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Interest</li>
              <li>Non-qualified dividends</li>
              <li>Certain option-related income</li>
              <li>Other income generated by the fund</li>
            </ul>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Qualified Dividends</p>
            <p className="mt-2 text-sm text-muted">
              Qualified dividends may receive preferential federal tax rates if the applicable
              IRS requirements are satisfied. A fund&apos;s entire distribution should never be
              assumed to be qualified — only the percentage the fund specifically reports as
              qualified receives this treatment.
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Capital Gains: Short-Term vs. Long-Term</p>
            <p className="mt-2 text-sm text-muted">
              Short-term capital gains (generally on positions the fund held one year or less)
              and long-term capital gains (held more than one year) can have different federal
              tax treatment. When a fund reports the split, YieldIQ shows it on the fund&apos;s
              Tax tab.
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estimated vs. Final Classification</p>
            <p className="mt-2 text-sm text-muted">
              Fund distributions may initially be reported with an estimated classification.
              Final tax characterization is generally provided by the fund after the end of the
              tax year and reflected on your tax reporting documents (e.g. Form 1099-DIV).
              YieldIQ labels every classification it shows as ESTIMATED or FINAL, with the tax
              year it applies to.
            </p>
          </div>

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Taxable vs. Tax-Advantaged Accounts</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-2 p-3 text-sm">
                <p className="font-semibold">Taxable Brokerage</p>
                <p className="mt-1 text-xs text-muted">
                  ROC, Ordinary Income, Qualified Dividends, and Capital Gains may generally
                  each be treated differently, as described above.
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 text-sm">
                <p className="font-semibold">Tax-Advantaged Account (Traditional or Roth IRA)</p>
                <p className="mt-1 text-xs text-muted">
                  Distributions generally have different tax implications inside accounts such
                  as Traditional or Roth IRAs. This is not personalized tax advice.
                </p>
              </div>
            </div>
          </div>

          <TaxImpactCalculator />

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Data Sources</p>
            <p className="mt-2 text-sm text-muted">
              Tax information comes from authoritative sources whenever possible, in order:
              the fund sponsor, official fund tax documents, IRS information, SEC filings, and
              other reliable financial-data sources. YieldIQ never invents a tax
              classification — when information is unavailable, fund pages show &ldquo;Tax
              classification unavailable&rdquo; instead of a guess.
            </p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted">{TAX_DISCLAIMER}</p>
      </section>

      <div className="mt-8 rounded-xl border border-caution/30 bg-caution/10 p-4 text-sm text-caution">
        <p className="font-semibold">Remember</p>
        <p className="mt-1">
          Distribution yield is not the same as investment return. Past distributions do not
          guarantee future distributions. High distribution rates can involve substantial risk
          and may include Return of Capital. Highest yield ≠ best investment.
        </p>
      </div>
    </div>
  );
}
