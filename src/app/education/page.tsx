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
