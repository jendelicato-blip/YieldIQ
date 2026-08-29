import Link from "next/link";
import { getActiveFunds, getDistributions, getManagerBySlug } from "@/lib/data";
import { formatCurrency, formatDate, FREQUENCY_LABELS } from "@/lib/format";
import { FrequencyBadge } from "@/components/ui/Badges";

type RangeKey = "today" | "this_week" | "next_week" | "this_month" | "next_month";

function getRange(key: RangeKey, now: Date): [Date, Date] {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = start.getUTCDay();
  const mondayOffset = (dow + 6) % 7;
  const thisWeekStart = new Date(start.getTime() - mondayOffset * 86_400_000);

  switch (key) {
    case "today":
      return [start, new Date(start.getTime() + 86_400_000)];
    case "this_week":
      return [thisWeekStart, new Date(thisWeekStart.getTime() + 7 * 86_400_000)];
    case "next_week": {
      const s = new Date(thisWeekStart.getTime() + 7 * 86_400_000);
      return [s, new Date(s.getTime() + 7 * 86_400_000)];
    }
    case "this_month": {
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      return [s, e];
    }
    case "next_month": {
      const s = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const e = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
      return [s, e];
    }
  }
}

const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  this_week: "This Week",
  next_week: "Next Week",
  this_month: "This Month",
  next_month: "Next Month",
};

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const range = (typeof sp.range === "string" ? sp.range : "this_month") as RangeKey;
  const freqFilter = typeof sp.freq === "string" ? sp.freq : "";

  const now = new Date();
  const [start, end] = getRange(RANGE_LABELS[range] ? range : "this_month", now);

  const funds = getActiveFunds().filter((f) => !freqFilter || f.distribution_frequency === freqFilter);

  const entries = funds.flatMap((f) => {
    const manager = getManagerBySlug(f.manager_slug);
    return getDistributions(f.ticker)
      .filter((d) => {
        const exDate = new Date(d.ex_date + "T00:00:00Z");
        return exDate.getTime() >= start.getTime() && exDate.getTime() < end.getTime();
      })
      .map((d) => ({ fund: f, manager, distribution: d }));
  });
  entries.sort((a, b) => a.distribution.ex_date.localeCompare(b.distribution.ex_date));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Dividend Calendar</h1>
      <p className="mt-1 text-sm text-muted">Verified ex-dates and pay dates for tracked funds.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
          <Link
            key={k}
            href={`/calendar?range=${k}${freqFilter ? `&freq=${freqFilter}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              range === k ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {RANGE_LABELS[k]}
          </Link>
        ))}
        <span className="mx-1 self-center text-muted">|</span>
        {["weekly", "monthly", "quarterly"].map((f) => (
          <Link
            key={f}
            href={`/calendar?range=${range}${f !== freqFilter ? `&freq=${f}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              freqFilter === f ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {FREQUENCY_LABELS[f]}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            No verified distributions fall in this range yet. YieldIQ only shows dates confirmed
            by an issuer or exchange — never a predicted date.
          </div>
        ) : (
          <div className="card divide-y divide-border">
            {entries.map(({ fund, manager, distribution }) => (
              <div key={`${fund.ticker}-${distribution.ex_date}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <Link href={`/funds/${fund.ticker}`} className="font-semibold hover:text-accent">
                    {fund.ticker}
                  </Link>
                  <span className="ml-2 text-muted">{fund.fund_name}</span>
                  <p className="text-xs text-muted">{manager?.name}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <FrequencyBadge frequency={fund.distribution_frequency} />
                  <div>
                    <p className="tabular font-semibold">{formatCurrency(distribution.amount_per_share, 4)}</p>
                    <p className="text-xs text-muted">Ex: {formatDate(distribution.ex_date)}</p>
                  </div>
                  {distribution.pay_date && (
                    <div>
                      <p className="text-xs text-muted">Pay: {formatDate(distribution.pay_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
