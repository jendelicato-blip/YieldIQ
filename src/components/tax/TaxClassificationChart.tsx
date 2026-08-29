"use client";

import { useState } from "react";
import type { TaxCategoryRow } from "@/lib/tax";
import { TAX_CATEGORY_EXPLAINERS } from "@/lib/tax";
import { formatPct } from "@/lib/format";

const CATEGORY_COLOR: Record<TaxCategoryRow["key"], string> = {
  roc: "var(--tax-roc)",
  ordinary_income: "var(--tax-ordinary)",
  qualified_dividend: "var(--tax-qualified)",
  capital_gains: "var(--tax-capgains)",
  other: "var(--tax-other)",
};

export default function TaxClassificationChart({ rows }: { rows: TaxCategoryRow[] }) {
  const [expanded, setExpanded] = useState<TaxCategoryRow["key"] | null>(null);
  const maxPct = Math.max(...rows.map((r) => r.pct ?? 0), 1);

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        Distribution Tax Classification
      </p>
      <ul className="space-y-2">
        {rows.map((row) => {
          const isOpen = expanded === row.key;
          return (
            <li key={row.key}>
              <button
                onClick={() => setExpanded(isOpen ? null : row.key)}
                className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-surface-2"
                aria-expanded={isOpen}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLOR[row.key] }}
                  aria-hidden
                />
                <span className="w-40 shrink-0 text-sm text-foreground sm:w-48">{row.label}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  {row.pct != null && (
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.max((row.pct / maxPct) * 100, row.pct > 0 ? 3 : 0)}%`,
                        background: CATEGORY_COLOR[row.key],
                      }}
                    />
                  )}
                </span>
                <span className="tabular w-16 shrink-0 text-right text-sm font-semibold">
                  {row.pct != null ? formatPct(row.pct, 0) : "—"}
                </span>
                <span className="w-4 shrink-0 text-center text-xs text-muted">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <p className="ml-6 mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted animate-fade-in">
                  {TAX_CATEGORY_EXPLAINERS[row.key]}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
