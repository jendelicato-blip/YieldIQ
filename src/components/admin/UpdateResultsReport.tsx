"use client";

import { useState } from "react";
import type { ChangeCategory, UpdateHistoryEntry } from "@/lib/ingest/types";
import {
  CHANGE_CATEGORY_ICONS,
  CHANGE_CATEGORY_LABELS,
  CHANGE_CATEGORY_LABELS_SINGULAR,
  countByCategory,
  fundsUpdatedCount,
} from "@/lib/ingest/types";
import CategoryDetailSheet, { type SheetMode } from "./CategoryDetailSheet";
import { formatDateTime } from "@/lib/format";

const CATEGORY_ORDER: ChangeCategory[] = [
  "new_fund",
  "distribution_change",
  "yield_change",
  "nav_alert",
  "tax_update",
  "strategy_change",
  "ticker_change",
  "fund_closure",
  "fund_updated",
];

export default function UpdateResultsReport({ entry }: { entry: UpdateHistoryEntry }) {
  const [openSheet, setOpenSheet] = useState<SheetMode | null>(null);
  const updatedCount = fundsUpdatedCount(entry.changes);
  const hasChanges = entry.changes.length > 0;

  const header =
    entry.status === "failed"
      ? { icon: "✕", label: "UPDATE FAILED", tone: "text-negative" }
      : entry.status === "partial"
        ? { icon: "⚠", label: "UPDATE PARTIALLY COMPLETE", tone: "text-caution" }
        : { icon: "✓", label: "UPDATE COMPLETE", tone: "text-positive" };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className={`text-lg font-bold ${header.tone}`}>
          {header.icon} {header.label}
        </p>
        <span className="text-xs text-muted">{formatDateTime(entry.timestamp)}</span>
      </div>

      {!hasChanges && entry.status === "complete" && (
        <p className="mt-2 text-sm text-muted">No material changes detected.</p>
      )}

      <p className="tabular mt-3 text-sm text-muted">{entry.funds_scanned} Funds Checked</p>

      {updatedCount > 0 && (
        <ResultRow
          icon="🔧"
          label={`${updatedCount} ${updatedCount === 1 ? "Fund" : "Funds"} Updated`}
          onClick={() => setOpenSheet("funds_updated")}
        />
      )}

      {CATEGORY_ORDER.map((cat) => {
        const count = countByCategory(entry.changes, cat);
        if (count === 0) return null;
        const label = count === 1 ? CHANGE_CATEGORY_LABELS_SINGULAR[cat] : CHANGE_CATEGORY_LABELS[cat];
        return (
          <ResultRow
            key={cat}
            icon={CHANGE_CATEGORY_ICONS[cat]}
            label={`${count} ${label}`}
            onClick={() => setOpenSheet(cat)}
          />
        );
      })}

      {hasChanges && (
        <button
          onClick={() => setOpenSheet("all")}
          className="mt-2 flex w-full items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          View All Updates
          <span>›</span>
        </button>
      )}

      {entry.errors.length > 0 && (
        <details className="mt-3 rounded-lg border border-caution/30 bg-caution/10 p-3 text-xs text-caution">
          <summary className="cursor-pointer font-semibold">
            {entry.errors.length} data source{entry.errors.length === 1 ? "" : "s"} temporarily unavailable
          </summary>
          <ul className="mt-2 space-y-1">
            {entry.errors.slice(0, 20).map((err, i) => (
              <li key={i}>
                <span className="font-semibold">{err.ticker}:</span> {err.message}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caution/80">
            Previously verified data for these funds has been kept as-is — nothing was deleted or guessed.
          </p>
        </details>
      )}

      {openSheet && (
        <CategoryDetailSheet mode={openSheet} changes={entry.changes} onClose={() => setOpenSheet(null)} />
      )}
    </div>
  );
}

function ResultRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
    >
      <span>
        <span className="mr-2">{icon}</span>
        {label}
      </span>
      <span className="text-muted">›</span>
    </button>
  );
}
