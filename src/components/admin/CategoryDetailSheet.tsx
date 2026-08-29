"use client";

import { useState } from "react";
import Link from "next/link";
import Sheet from "./Sheet";
import type { ChangeCategory, ChangeEvent } from "@/lib/ingest/types";
import { CHANGE_CATEGORY_ICONS, CHANGE_CATEGORY_LABELS } from "@/lib/ingest/types";
import { formatCompactUsd, formatCurrency, formatDate, formatPct } from "@/lib/format";
import { VerificationBadge } from "@/components/ui/Badges";

export type SheetMode = ChangeCategory | "all" | "funds_updated";

const ALL_FILTERS: { key: SheetMode; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_fund", label: "New Funds" },
  { key: "distribution_change", label: "Distributions" },
  { key: "yield_change", label: "Yield" },
  { key: "nav_alert", label: "NAV" },
  { key: "tax_update", label: "Tax" },
  { key: "strategy_change", label: "Strategy" },
  { key: "ticker_change", label: "Fund Status" },
  { key: "fund_closure", label: "Fund Status" },
];

function directionColor(direction: ChangeEvent["direction"]) {
  if (direction === "increase") return "text-positive";
  if (direction === "decrease") return "text-negative";
  return "text-foreground";
}

function directionDot(direction: ChangeEvent["direction"]) {
  if (direction === "increase") return "🟢";
  if (direction === "decrease") return "🔴";
  return "⚪";
}

function formatFieldValue(field: string | null, value: string | number | null): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (!field) return String(value);
  const f = field.toLowerCase();
  if (f.includes("yield") || f.includes("ratio") || f.includes("roc")) return formatPct(value, 2);
  if (f.includes("aum")) return formatCompactUsd(value);
  if (f.includes("distribution") || f === "nav") return formatCurrency(value, value < 1 ? 4 : 2);
  return String(value);
}

function SourceLink({ event }: { event: ChangeEvent }) {
  if (!event.source_url) return null;
  return (
    <a
      href={event.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-accent hover:underline"
    >
      View Source →
    </a>
  );
}

function ViewFundLink({ ticker }: { ticker: string }) {
  return (
    <Link href={`/funds/${ticker}`} className="text-xs font-semibold text-accent hover:underline">
      View Fund →
    </Link>
  );
}

function EventCard({ event, children }: { event: ChangeEvent; children: React.ReactNode }) {
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold">{event.ticker}</span>
          <span className="ml-2 text-xs text-muted">{event.fund_name}</span>
        </div>
        <VerificationBadge status={event.verification_status} />
      </div>
      {event.manager_name && <p className="text-[11px] text-muted">{event.manager_name}</p>}
      <div className="mt-2">{children}</div>
      <div className="mt-2 flex items-center justify-between">
        <ViewFundLink ticker={event.ticker} />
        <SourceLink event={event} />
      </div>
    </div>
  );
}

function GenericDiffCard({ event }: { event: ChangeEvent }) {
  return (
    <EventCard event={event}>
      <p className="text-xs font-semibold text-muted">{event.field}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="tabular text-muted">{formatFieldValue(event.field, event.previous_value)}</span>
        <span className="text-muted">→</span>
        <span className={`tabular font-bold ${directionColor(event.direction)}`}>
          {formatFieldValue(event.field, event.new_value)}
        </span>
        {event.absolute_change != null && (
          <span className={`tabular text-xs ${directionColor(event.direction)}`}>
            ({Number(event.absolute_change) > 0 ? "+" : ""}
            {event.absolute_change}
            {event.field?.toLowerCase().includes("yield") ? "pp" : "%"})
          </span>
        )}
        {event.percent_change != null && event.absolute_change == null && (
          <span className={`tabular text-xs ${directionColor(event.direction)}`}>
            ({event.percent_change > 0 ? "+" : ""}
            {event.percent_change.toFixed(1)}%)
          </span>
        )}
      </div>
    </EventCard>
  );
}

function FundsUpdatedGroup({ ticker, events }: { ticker: string; events: ChangeEvent[] }) {
  const first = events[0];
  return (
    <div className="card p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold">{ticker}</span>
          <span className="ml-2 text-xs text-muted">{first.fund_name}</span>
        </div>
        <ViewFundLink ticker={ticker} />
      </div>
      <div className="mt-2 space-y-1.5">
        {events.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-28 shrink-0 text-xs font-semibold text-muted">{e.field ?? CHANGE_CATEGORY_LABELS[e.category]}</span>
            <span className="tabular text-muted">{formatFieldValue(e.field, e.previous_value)}</span>
            <span className="text-muted">→</span>
            <span className={`tabular font-semibold ${directionColor(e.direction)}`}>{formatFieldValue(e.field, e.new_value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewFundCard({ event }: { event: ChangeEvent }) {
  const x = event.extra ?? {};
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">🆕 NEW</span>
        {event.verification_status !== "verified" && (
          <span className="rounded-full bg-caution/15 px-2 py-0.5 text-[10px] font-bold text-caution">🟡 VERIFICATION PENDING</span>
        )}
      </div>
      <p className="mt-1.5 font-bold">
        {event.ticker} <span className="font-normal text-muted">— {event.fund_name}</span>
      </p>
      <p className="text-xs text-muted">{event.manager_name}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted">Inception: {x.inception_date ? formatDate(String(x.inception_date)) : "—"}</span>
        <span className="text-muted">Strategy: {x.strategy ?? "—"}</span>
        <span className="text-muted">Yield: {x.distribution_yield_pct != null ? formatPct(Number(x.distribution_yield_pct)) : "—"}</span>
        <span className="text-muted">Frequency: {x.distribution_frequency ?? "—"}</span>
        <span className="text-muted">Expense Ratio: {x.expense_ratio_pct != null ? formatPct(Number(x.expense_ratio_pct), 2) : "—"}</span>
        <span className="text-muted">AUM: {x.aum_usd != null ? formatCompactUsd(Number(x.aum_usd)) : "—"}</span>
        <span className="col-span-2 text-muted">Underlying: {x.underlying ?? "—"}</span>
        <span className="col-span-2 text-muted">Discovered: {formatDate(event.detected_at.slice(0, 10))}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <ViewFundLink ticker={event.ticker} />
        <SourceLink event={event} />
      </div>
    </div>
  );
}

function DistributionCard({ event }: { event: ChangeEvent }) {
  const x = event.extra ?? {};
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold">
        {directionDot(event.direction)} Distribution {event.direction === "increase" ? "Increased" : event.direction === "decrease" ? "Decreased" : "Changed"}
      </p>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <span className="text-muted">Previous: <span className="tabular text-foreground">{formatCurrency(Number(event.previous_value), 4)}</span></span>
        <span className="text-muted">New: <span className="tabular text-foreground">{formatCurrency(Number(event.new_value), 4)}</span></span>
        <span className={`col-span-2 tabular font-bold ${directionColor(event.direction)}`}>
          Change: {event.percent_change != null ? `${event.percent_change > 0 ? "+" : ""}${event.percent_change.toFixed(1)}%` : "—"}
        </span>
        <span className="text-muted">Ex-Date: {event.effective_date ? formatDate(event.effective_date) : "—"}</span>
        <span className="text-muted">Pay Date: {x.pay_date ? formatDate(String(x.pay_date)) : "—"}</span>
      </div>
    </EventCard>
  );
}

function NavAlertCard({ event }: { event: ChangeEvent }) {
  const x = event.extra ?? {};
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold text-negative">{directionDot(event.direction)} NAV Alert</p>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <span className="text-muted">1-Month NAV: <span className="tabular text-foreground">{x.one_month_nav_pct != null ? `${Number(x.one_month_nav_pct) > 0 ? "+" : ""}${x.one_month_nav_pct}%` : "—"}</span></span>
        <span className="text-muted">3-Month NAV: <span className="tabular text-foreground">{x.three_month_nav_pct != null ? `${Number(x.three_month_nav_pct) > 0 ? "+" : ""}${x.three_month_nav_pct}%` : "—"}</span></span>
        <span className="col-span-2 text-muted">Max Drawdown: <span className="tabular text-foreground">{x.max_drawdown_pct}%</span></span>
      </div>
      {event.reason && <p className="mt-1.5 text-xs italic text-muted">&ldquo;{event.reason}&rdquo;</p>}
    </EventCard>
  );
}

function YieldCard({ event }: { event: ChangeEvent }) {
  return (
    <EventCard event={event}>
      <p className="text-xs font-semibold text-muted">{event.field ?? "Yield"}</p>
      <p className="mt-1 text-sm">
        <span className="tabular">{formatPct(Number(event.previous_value))}</span>
        <span className="mx-2 text-muted">→</span>
        <span className={`tabular font-bold ${directionColor(event.direction)}`}>{formatPct(Number(event.new_value))}</span>
      </p>
      {event.absolute_change != null && (
        <p className={`tabular text-xs font-semibold ${directionColor(event.direction)}`}>
          {Number(event.absolute_change) > 0 ? "+" : ""}
          {event.absolute_change} percentage points
        </p>
      )}
    </EventCard>
  );
}

function TaxCard({ event }: { event: ChangeEvent }) {
  const x = event.extra ?? {};
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold">🧾 Tax Update</p>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <span className="text-muted">Previous ROC: <span className="tabular text-foreground">{formatPct(Number(event.previous_value), 0)}</span></span>
        <span className="text-muted">New ROC: <span className="tabular text-foreground">{formatPct(Number(event.new_value), 0)}</span></span>
        <span className="text-muted">Tax Year: {x.tax_year ?? "—"}</span>
        <span className="text-muted uppercase">{x.classification_status ?? "—"}</span>
      </div>
    </EventCard>
  );
}

function StrategyCard({ event }: { event: ChangeEvent }) {
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold">🔄 Strategy Change</p>
      <p className="mt-1 text-sm text-muted">Previous: <span className="text-foreground">{event.previous_value}</span></p>
      <p className="text-sm text-muted">New: <span className="text-foreground">{event.new_value}</span></p>
      <p className="text-xs text-muted">Effective: {event.effective_date ? formatDate(event.effective_date) : "—"}</p>
    </EventCard>
  );
}

function TickerChangeCard({ event }: { event: ChangeEvent }) {
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold">🔤 Ticker Change</p>
      <p className="mt-1 text-sm">
        <span className="tabular text-muted">{event.previous_value}</span>
        <span className="mx-2 text-muted">→</span>
        <span className="tabular font-bold">{event.new_value}</span>
      </p>
      <p className="text-xs text-muted">Effective: {event.effective_date ? formatDate(event.effective_date) : "—"}</p>
    </EventCard>
  );
}

function ClosureCard({ event }: { event: ChangeEvent }) {
  const x = event.extra ?? {};
  return (
    <EventCard event={event}>
      <p className="text-sm font-semibold text-negative">🔴 Fund Closure</p>
      <p className="mt-1 text-sm text-muted">Liquidation Date: <span className="text-foreground">{event.effective_date ? formatDate(event.effective_date) : "—"}</span></p>
      <p className="text-sm text-muted">Last Trading Date: <span className="text-foreground">{x.last_trading_date ? formatDate(String(x.last_trading_date)) : "—"}</span></p>
    </EventCard>
  );
}

function renderEvent(event: ChangeEvent) {
  switch (event.category) {
    case "new_fund":
      return <NewFundCard event={event} />;
    case "distribution_change":
      return <DistributionCard event={event} />;
    case "nav_alert":
      return <NavAlertCard event={event} />;
    case "yield_change":
      return <YieldCard event={event} />;
    case "tax_update":
      return <TaxCard event={event} />;
    case "strategy_change":
      return <StrategyCard event={event} />;
    case "ticker_change":
      return <TickerChangeCard event={event} />;
    case "fund_closure":
      return <ClosureCard event={event} />;
    default:
      return <GenericDiffCard event={event} />;
  }
}

function AllUpdatesFeed({ changes }: { changes: ChangeEvent[] }) {
  const [filter, setFilter] = useState<SheetMode>("all");
  const filtered = filter === "all" ? changes : changes.filter((c) => c.category === filter);
  const sorted = [...filtered].sort((a, b) => b.detected_at.localeCompare(a.detected_at));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {ALL_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              filter === f.key ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No updates in this category.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
              <span>{CHANGE_CATEGORY_ICONS[e.category]}</span>
              <span className="tabular text-xs text-muted">
                {new Date(e.detected_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
              <Link href={`/funds/${e.ticker}`} className="font-semibold hover:text-accent">
                {e.ticker}
              </Link>
              <span className="text-muted">— {CHANGE_CATEGORY_LABELS[e.category]}{e.field ? ` (${e.field})` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CategoryDetailSheet({
  mode,
  changes,
  onClose,
}: {
  mode: SheetMode;
  changes: ChangeEvent[];
  onClose: () => void;
}) {
  if (mode === "all") {
    return (
      <Sheet title="View All Updates" subtitle={`${changes.length} total changes`} onClose={onClose}>
        <AllUpdatesFeed changes={changes} />
      </Sheet>
    );
  }

  if (mode === "funds_updated") {
    const byTicker = new Map<string, ChangeEvent[]>();
    for (const c of changes) {
      if (!byTicker.has(c.ticker)) byTicker.set(c.ticker, []);
      byTicker.get(c.ticker)!.push(c);
    }
    return (
      <Sheet title="Funds Updated" subtitle={`${byTicker.size} funds`} onClose={onClose}>
        <div className="space-y-2">
          {Array.from(byTicker.entries()).map(([ticker, events]) => (
            <FundsUpdatedGroup key={ticker} ticker={ticker} events={events} />
          ))}
        </div>
      </Sheet>
    );
  }

  const filtered = changes.filter((c) => c.category === mode);
  return (
    <Sheet title={CHANGE_CATEGORY_LABELS[mode]} subtitle={`${filtered.length} ${filtered.length === 1 ? "fund" : "funds"}`} onClose={onClose}>
      <div className="space-y-2">
        {filtered.map((e) => (
          <div key={e.id}>{renderEvent(e)}</div>
        ))}
      </div>
    </Sheet>
  );
}
