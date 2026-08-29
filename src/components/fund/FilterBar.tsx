"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { STRATEGY_LABELS, FREQUENCY_LABELS } from "@/lib/format";

export interface FilterOptions {
  managers: { slug: string; name: string }[];
  strategies: string[];
}

export default function FilterBar({ managers, strategies }: FilterOptions) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={params.get("manager") ?? ""}
        onChange={(e) => update("manager", e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        <option value="">All Managers</option>
        {managers.map((m) => (
          <option key={m.slug} value={m.slug}>
            {m.name}
          </option>
        ))}
      </select>

      <select
        value={params.get("strategy") ?? ""}
        onChange={(e) => update("strategy", e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        <option value="">All Strategies</option>
        {strategies.map((s) => (
          <option key={s} value={s}>
            {STRATEGY_LABELS[s] ?? s}
          </option>
        ))}
      </select>

      <select
        value={params.get("frequency") ?? ""}
        onChange={(e) => update("frequency", e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        <option value="">All Frequencies</option>
        {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      <select
        value={params.get("sort") ?? "yield"}
        onChange={(e) => update("sort", e.target.value)}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        <option value="yield">Sort: Highest Yield</option>
        <option value="nav_growth">Sort: Best NAV Growth</option>
        <option value="total_return">Sort: Best Total Return</option>
        <option value="income_quality">Sort: Best Income Quality</option>
        <option value="risk_low">Sort: Lowest Risk</option>
        <option value="newest">Sort: Newest</option>
        <option value="ticker">Sort: Ticker (A–Z)</option>
        <option value="roc_high">Sort: Highest ROC %</option>
        <option value="qualified_high">Sort: Highest Qualified Dividend %</option>
        <option value="ordinary_low">Sort: Lowest Ordinary Income %</option>
        <option value="tax_efficient">Sort: Most Tax-Efficient*</option>
      </select>
    </div>
  );
}
