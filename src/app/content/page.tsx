import Link from "next/link";
import { generateContentReport } from "@/lib/content/generate";
import { renderReportMarkdown } from "@/lib/content/markdown";
import { VerificationBadge } from "@/components/ui/Badges";
import InvestorWarning from "@/components/ui/InvestorWarning";
import CopyMarkdownButton from "@/components/content/CopyMarkdownButton";
import { formatCompactUsd, formatCurrency, formatDate, formatPct } from "@/lib/format";

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="text-base font-bold">
        {emoji} {title}
      </h2>
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

function NotYetVerified({ children = "Not yet verified — no candidate met the bar in today's verified dataset." }: { children?: React.ReactNode }) {
  return <p className="text-muted">{children}</p>;
}

export default function ContentEnginePage() {
  const report = generateContentReport();
  const markdown = renderReportMarkdown(report);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Today&apos;s Dividend Radar</h1>
          <p className="mt-1 text-sm text-muted">
            The daily content engine — every figure below is pulled from the same verified data layer as the rest of
            YieldIQ (see{" "}
            <Link href="/" className="text-accent hover:underline">
              Dashboard
            </Link>
            ). Data as of {formatDate(report.dataAsOfDate)}.
          </p>
        </div>
        <CopyMarkdownButton markdown={markdown} />
      </div>

      <div className="mt-4">
        <InvestorWarning compact />
      </div>

      <div className="mt-6 space-y-4">
        <Section title="New Fund Alert" emoji="🆕">
          {report.newFundAlert ? (
            <div className="space-y-1">
              <p className="font-semibold">
                {report.newFundAlert.fund.ticker} — {report.newFundAlert.fund.fundName}{" "}
                <VerificationBadge status={report.newFundAlert.verificationStatus} />
              </p>
              <p className="text-muted">{report.newFundAlert.fund.managerName ?? "Manager not yet verified"}</p>
              <p>
                Launch date: {formatDate(report.newFundAlert.launchDate)} · Strategy: {report.newFundAlert.strategyLabel} ·
                Frequency: {report.newFundAlert.frequencyLabel}
              </p>
              <p>
                Distribution yield: {formatPct(report.newFundAlert.distributionYieldPct)} · Expense ratio:{" "}
                {formatPct(report.newFundAlert.expenseRatioPct)}
              </p>
              <p className="mt-2">
                <span className="font-semibold">Why investors may be interested:</span> {report.newFundAlert.whyInterested}
              </p>
              <p>
                <span className="font-semibold">Biggest risk:</span> {report.newFundAlert.biggestRisk}
              </p>
              <p>
                <span className="font-semibold">Watch:</span> {report.newFundAlert.watch}
              </p>
              <Link href={`/funds/${report.newFundAlert.fund.ticker}`} className="text-accent hover:underline">
                View full fund page →
              </Link>
            </div>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title="Fund Spotlight" emoji="💰">
          {report.fundSpotlight ? (
            <div className="space-y-1">
              <p className="font-semibold">
                {report.fundSpotlight.fund.ticker} — {report.fundSpotlight.fund.fundName}{" "}
                <VerificationBadge status={report.fundSpotlight.verificationStatus} />
              </p>
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <p>Price: {formatCurrency(report.fundSpotlight.price)}</p>
                <p>Yield: {formatPct(report.fundSpotlight.distributionYieldPct)}</p>
                <p>SEC yield (30d): {formatPct(report.fundSpotlight.secYield30dPct)}</p>
                <p>Expense ratio: {formatPct(report.fundSpotlight.expenseRatioPct)}</p>
                <p>AUM: {formatCompactUsd(report.fundSpotlight.aumUsd)}</p>
                <p>Inception: {formatDate(report.fundSpotlight.inceptionDate)}</p>
                <p>NAV CAGR: {formatPct(report.fundSpotlight.navCagrPct)}</p>
                <p>1Y total return: {formatPct(report.fundSpotlight.totalReturn1YPct)}</p>
              </div>
              <p className="mt-2">
                <span className="font-semibold">What it does:</span> {report.fundSpotlight.whatItDoes}
              </p>
              <p>
                <span className="font-semibold">Why the yield is high:</span> {report.fundSpotlight.whyYieldIsHigh}
              </p>
              <p>
                <span className="font-semibold">What could go wrong:</span> {report.fundSpotlight.whatCouldGoWrong}
              </p>
              <p>
                <span className="font-semibold">Who might consider researching it:</span> {report.fundSpotlight.whoMightConsider}
              </p>
              <p className="text-xs text-muted">
                Source: {report.fundSpotlight.source.sourceName ?? "Not yet verified"}, as of {formatDate(report.fundSpotlight.asOfDate)}
              </p>
              <Link href={`/funds/${report.fundSpotlight.fund.ticker}`} className="text-accent hover:underline">
                View full fund page →
              </Link>
            </div>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title="Yield Comparison" emoji="📊">
          {report.yieldComparison.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-3">Fund</th>
                    <th className="py-1 pr-3">Yield</th>
                    <th className="py-1 pr-3">Frequency</th>
                    <th className="py-1 pr-3">Expense Ratio</th>
                    <th className="py-1 pr-3">NAV Trend</th>
                    <th className="py-1 pr-3">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.yieldComparison.map((r) => (
                    <tr key={r.fund.ticker}>
                      <td className="py-1.5 pr-3 font-semibold">{r.fund.ticker}</td>
                      <td className="py-1.5 pr-3 tabular">{formatPct(r.distributionYieldPct)}</td>
                      <td className="py-1.5 pr-3">{r.frequencyLabel}</td>
                      <td className="py-1.5 pr-3 tabular">{formatPct(r.expenseRatioPct)}</td>
                      <td className="py-1.5 pr-3">{r.navTrend}</td>
                      <td className="py-1.5 pr-3">{r.strategyLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title="High-Yield Watchlist" emoji="🔥">
          {report.watchlist.length > 0 ? (
            <ul className="space-y-2">
              {report.watchlist.map((w) => (
                <li key={w.fund.ticker} className="rounded-lg bg-surface-2 p-3">
                  <p className="font-semibold">
                    {w.fund.ticker} · {formatPct(w.distributionYieldPct)} · {w.frequencyLabel} · {w.strategyLabel}
                  </p>
                  <p className="text-muted">NAV trend: {w.navTrend} · Risk factors: {w.riskFactors.join("; ")}</p>
                  <p>{w.whyItDeservesAttention}</p>
                </li>
              ))}
            </ul>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title="Yield Trap Check" emoji="📉">
          {report.yieldTrapCheck ? (
            <div>
              <p className="font-semibold">
                {report.yieldTrapCheck.fund.ticker} — {formatPct(report.yieldTrapCheck.distributionYieldPct)}
              </p>
              <p>{report.yieldTrapCheck.concerns.join(" ")}</p>
            </div>
          ) : (
            <NotYetVerified>No fund in today&apos;s verified dataset triggered a yield-trap flag.</NotYetVerified>
          )}
        </Section>

        <Section title="Under-the-Radar Income ETF" emoji="💎">
          {report.underTheRadar ? (
            <div>
              <p className="font-semibold">
                {report.underTheRadar.fund.ticker} · {report.underTheRadar.strategyLabel} · AUM{" "}
                {formatCompactUsd(report.underTheRadar.aumUsd)} · {formatPct(report.underTheRadar.distributionYieldPct)}
              </p>
              <p>{report.underTheRadar.whyItDeservesResearch}</p>
            </div>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title={`Dividend Education: ${report.education.title}`} emoji="🧠">
          <p>{report.education.body}</p>
        </Section>

        <Section title={`Dividend Calendar (${report.calendar.isUpcoming ? "next 30 days" : "most recent verified"})`} emoji="📅">
          {report.calendar.entries.length > 0 ? (
            <ul className="space-y-1">
              {report.calendar.entries.map((e) => (
                <li key={`${e.fund.ticker}-${e.exDate}`}>
                  <span className="font-semibold">{e.fund.ticker}</span>: {formatCurrency(e.amountPerShare, 4)}/share — Ex:{" "}
                  {formatDate(e.exDate)}
                  {e.payDate ? `, Pay: ${formatDate(e.payDate)}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <NotYetVerified>No verified ex-dividend dates on file in this window.</NotYetVerified>
          )}
        </Section>

        <Section title="How Much Would You Need?" emoji="💵">
          {report.incomeCalc && report.incomeCalc.annualizedYieldPct != null ? (
            <div>
              <p className="text-xs text-muted">
                Theoretical, based on {report.incomeCalc.fund.ticker}&apos;s current verified annualized distribution yield of{" "}
                {formatPct(report.incomeCalc.annualizedYieldPct)}. Distributions can change — this is not a projection or
                guarantee.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-5">
                {report.incomeCalc.rows.map((r) => (
                  <li key={r.monthlyTarget} className="rounded-lg bg-surface-2 p-2 text-center">
                    <p className="text-xs text-muted">${r.monthlyTarget.toLocaleString()}/mo</p>
                    <p className="tabular font-semibold">{r.capitalNeeded != null ? formatCurrency(r.capitalNeeded, 0) : "—"}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <NotYetVerified />
          )}
        </Section>

        <Section title="Daily Income ETF Radar" emoji="📡">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-positive">🟢 Worth Researching</p>
              {report.incomeRadar.worthResearching.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {report.incomeRadar.worthResearching.map((r) => (
                    <li key={r.fund.ticker}>
                      <span className="font-semibold">{r.fund.ticker}</span>: {r.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <NotYetVerified />
              )}
            </div>
            <div>
              <p className="font-semibold text-caution">🟡 Watch</p>
              {report.incomeRadar.watch.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {report.incomeRadar.watch.map((r) => (
                    <li key={r.fund.ticker}>
                      <span className="font-semibold">{r.fund.ticker}</span>: {r.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <NotYetVerified />
              )}
            </div>
            <div>
              <p className="font-semibold text-negative">🔴 Warning Flags</p>
              {report.incomeRadar.warningFlags.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {report.incomeRadar.warningFlags.map((r) => (
                    <li key={r.fund.ticker}>
                      <span className="font-semibold">{r.fund.ticker}</span>: {r.reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <NotYetVerified />
              )}
            </div>
          </div>
        </Section>

        <Section title="What Changed Today?" emoji="🚨">
          <p className="text-muted">{report.whatChangedToday.note}</p>
          {report.whatChangedToday.items.length > 0 && (
            <ul className="mt-2 space-y-1">
              {report.whatChangedToday.items.map((c, i) => (
                <li key={`${c.ticker}-${i}`}>
                  <span className="font-semibold">{c.ticker}</span> ({c.categoryLabel}): {c.description}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="X Post of the Day" emoji="🔥">
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-sans">{report.social.xPostPrimary}</pre>
        </Section>

        <Section title="Educational X Post" emoji="🧠">
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-sans">{report.social.xPostEducational}</pre>
        </Section>

        <Section title="Discovery X Post" emoji="🔍">
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 font-sans">{report.social.xPostDiscovery}</pre>
        </Section>

        {report.social.xThread && (
          <Section title="X Thread" emoji="🧵">
            <ol className="space-y-2">
              {report.social.xThread.map((post, i) => (
                <li key={i} className="rounded-lg bg-surface-2 p-3">
                  {post}
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title="Instagram Carousel + Caption" emoji="📸">
          <ol className="space-y-2">
            {report.social.instagramSlides.map((slide, i) => (
              <li key={i} className="rounded-lg bg-surface-2 p-3">
                <span className="text-xs font-semibold text-muted">Slide {i + 1}</span>
                <p>{slide}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3">
            <span className="font-semibold">Caption:</span> {report.social.instagramCaption}
          </p>
        </Section>

        <Section title="Sources" emoji="📎">
          {report.sources.length > 0 ? (
            <ul className="space-y-1 text-xs">
              {report.sources.map((s, i) => (
                <li key={i}>
                  {s.label}: {s.sourceName ?? "Not yet verified"}
                  {s.sourceUrl && (
                    <>
                      {" — "}
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {s.sourceUrl}
                      </a>
                    </>
                  )}
                  {s.asOfDate && ` (as of ${formatDate(s.asOfDate)})`}
                </li>
              ))}
            </ul>
          ) : (
            <NotYetVerified />
          )}
          <p className="mt-2 text-xs text-muted">Checked: {new Date(report.generatedAt).toLocaleString("en-US")}</p>
        </Section>
      </div>
    </div>
  );
}
