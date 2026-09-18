// Renders a ContentReport as a single Markdown document — the same content
// shown on /content, in a copy/paste-ready form for posting.

import { formatCompactUsd, formatCurrency, formatDate, formatPct } from "@/lib/format";
import type { ContentReport } from "./types";

function line(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(" — ");
}

export function renderReportMarkdown(report: ContentReport): string {
  const out: string[] = [];
  const push = (s: string) => out.push(s);

  push(`# Today's Dividend Radar`);
  push(`_Generated ${formatDate(report.dataAsOfDate)} data as-of · report built ${new Date(report.generatedAt).toLocaleString("en-US")}_`);
  push("");

  push(`## 🆕 New Fund Alert`);
  if (report.newFundAlert) {
    const a = report.newFundAlert;
    push(`**${a.fund.ticker}** — ${a.fund.fundName} (${a.fund.managerName ?? "manager not yet verified"})`);
    push(line(`Launch date: ${formatDate(a.launchDate)}`, `Strategy: ${a.strategyLabel}`, `Frequency: ${a.frequencyLabel}`));
    push(line(`Distribution yield: ${formatPct(a.distributionYieldPct)}`, `Expense ratio: ${formatPct(a.expenseRatioPct)}`));
    push(`Why investors may be interested: ${a.whyInterested}`);
    push(`Biggest risk: ${a.biggestRisk}`);
    push(`Watch: ${a.watch}`);
  } else {
    push("Not yet verified — no newly identified fund in today's dataset.");
  }
  push("");

  push(`## 💰 Fund Spotlight`);
  if (report.fundSpotlight) {
    const s = report.fundSpotlight;
    push(`**${s.fund.ticker}** — ${s.fund.fundName} (${s.fund.managerName ?? "manager not yet verified"})`);
    push(
      line(
        `Price: ${formatCurrency(s.price)}`,
        `Distribution yield: ${formatPct(s.distributionYieldPct)}`,
        `30-day SEC yield: ${formatPct(s.secYield30dPct)}`,
        `Frequency: ${s.frequencyLabel}`,
      ),
    );
    push(line(`Expense ratio: ${formatPct(s.expenseRatioPct)}`, `AUM: ${formatCompactUsd(s.aumUsd)}`, `Inception: ${formatDate(s.inceptionDate)}`));
    push(line(`NAV CAGR: ${formatPct(s.navCagrPct)}`, `1Y total return: ${formatPct(s.totalReturn1YPct)}`, `Max drawdown: ${formatPct(s.maxDrawdownPct)}`));
    push(`What it does: ${s.whatItDoes}`);
    push(`Why the yield is high: ${s.whyYieldIsHigh}`);
    push(`What could go wrong: ${s.whatCouldGoWrong}`);
    push(`Who might consider researching it: ${s.whoMightConsider}`);
    push(`_Source: ${s.source.sourceName ?? "Not yet verified"}${s.source.sourceUrl ? ` (${s.source.sourceUrl})` : ""}, as of ${formatDate(s.asOfDate)}_`);
  } else {
    push("Not yet verified — insufficient verified metrics for a spotlight today.");
  }
  push("");

  push(`## 📊 Yield Comparison`);
  if (report.yieldComparison.length > 0) {
    push(`| Fund | Yield | Frequency | Expense Ratio | NAV Trend | Strategy |`);
    push(`|---|---|---|---|---|---|`);
    for (const r of report.yieldComparison) {
      push(`| ${r.fund.ticker} | ${formatPct(r.distributionYieldPct)} | ${r.frequencyLabel} | ${formatPct(r.expenseRatioPct)} | ${r.navTrend} | ${r.strategyLabel} |`);
    }
  } else {
    push("Not yet verified — no comparable peer set available today.");
  }
  push("");

  push(`## 🔥 High-Yield Watchlist`);
  if (report.watchlist.length > 0) {
    for (const w of report.watchlist) {
      push(`- **${w.fund.ticker}** — ${formatPct(w.distributionYieldPct)}, ${w.frequencyLabel}, ${w.strategyLabel}. NAV trend: ${w.navTrend}. Risk factors: ${w.riskFactors.join("; ")}. ${w.whyItDeservesAttention}`);
    }
  } else {
    push("Not yet verified.");
  }
  push("");

  push(`## 📉 Yield Trap Check`);
  if (report.yieldTrapCheck) {
    const y = report.yieldTrapCheck;
    push(`**${y.fund.ticker}** — verified distribution yield of ${formatPct(y.distributionYieldPct)}.`);
    push(`Concerns: ${y.concerns.join(" ")}`);
  } else {
    push("No fund in today's verified dataset triggered a yield-trap flag (high NAV decay, very-high risk score, or heavy Return of Capital).");
  }
  push("");

  push(`## 💎 Under-the-Radar Income ETF`);
  if (report.underTheRadar) {
    const u = report.underTheRadar;
    push(`**${u.fund.ticker}** — ${u.strategyLabel}, AUM ${formatCompactUsd(u.aumUsd)}, distribution yield ${formatPct(u.distributionYieldPct)}.`);
    push(u.whyItDeservesResearch);
  } else {
    push("Not yet verified — no small-AUM fund surfaced from today's dataset.");
  }
  push("");

  push(`## 🧠 Dividend Education: ${report.education.title}`);
  push(report.education.body);
  push("");

  push(`## 📅 Dividend Calendar (${report.calendar.isUpcoming ? "next 30 days" : "most recent verified, last 60 days"})`);
  if (report.calendar.entries.length > 0) {
    for (const e of report.calendar.entries) {
      push(`- **${e.fund.ticker}**: ${formatCurrency(e.amountPerShare, 4)}/share — Ex: ${formatDate(e.exDate)}${e.payDate ? `, Pay: ${formatDate(e.payDate)}` : ""}`);
    }
  } else {
    push("No verified ex-dividend dates on file in this window. YieldIQ never predicts a date — only confirmed ones are shown.");
  }
  push("");

  push(`## 💵 How Much Would You Need?`);
  if (report.incomeCalc && report.incomeCalc.annualizedYieldPct != null) {
    push(`Theoretical, based on **${report.incomeCalc.fund.ticker}**'s current verified annualized distribution yield of ${formatPct(report.incomeCalc.annualizedYieldPct)}. Distributions can change — this is not a projection or guarantee.`);
    for (const row of report.incomeCalc.rows) {
      push(`- $${row.monthlyTarget.toLocaleString()}/month → ${row.capitalNeeded != null ? formatCurrency(row.capitalNeeded, 0) : "Not yet verified"} invested`);
    }
  } else {
    push("Not yet verified — no fund with a verified annualized yield available for this calculation today.");
  }
  push("");

  push(`## 📡 Daily Income ETF Radar`);
  push(`**🟢 Worth Researching**`);
  if (report.incomeRadar.worthResearching.length > 0) {
    report.incomeRadar.worthResearching.forEach((r) => push(`- ${r.fund.ticker}: ${r.reason}`));
  } else {
    push("Not yet verified.");
  }
  push(`**🟡 Watch**`);
  if (report.incomeRadar.watch.length > 0) {
    report.incomeRadar.watch.forEach((r) => push(`- ${r.fund.ticker}: ${r.reason}`));
  } else {
    push("Not yet verified.");
  }
  push(`**🔴 Warning Flags**`);
  if (report.incomeRadar.warningFlags.length > 0) {
    report.incomeRadar.warningFlags.forEach((r) => push(`- ${r.fund.ticker}: ${r.reason}`));
  } else {
    push("Not yet verified.");
  }
  push("");

  push(`## 🚨 What Changed Today?`);
  push(report.whatChangedToday.note);
  if (report.whatChangedToday.items.length > 0) {
    for (const c of report.whatChangedToday.items) {
      push(`- **${c.ticker}** (${c.categoryLabel}): ${c.description}`);
    }
  }
  push("");

  push(`## 🔥 X Post of the Day`);
  push("```");
  push(report.social.xPostPrimary);
  push("```");
  push("");

  push(`## 📸 Instagram Post of the Day`);
  report.social.instagramSlides.forEach((slide, i) => push(`Slide ${i + 1}: ${slide}`));
  push("");
  push(`Caption: ${report.social.instagramCaption}`);
  push("");

  push(`## SOURCES`);
  if (report.sources.length > 0) {
    for (const s of report.sources) {
      push(`- ${s.label}: ${s.sourceName ?? "Not yet verified"}${s.sourceUrl ? ` — ${s.sourceUrl}` : ""}${s.asOfDate ? ` (as of ${formatDate(s.asOfDate)})` : ""}`);
    }
  } else {
    push("Not yet verified.");
  }
  push(`_Checked: ${new Date(report.generatedAt).toLocaleString("en-US")}_`);

  return out.join("\n");
}
