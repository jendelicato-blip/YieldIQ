"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Fund } from "@/lib/types";

export default function ComparePicker({ allFunds, selected }: { allFunds: Fund[]; selected: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function setTickers(tickers: string[]) {
    const next = new URLSearchParams(params.toString());
    if (tickers.length) next.set("t", tickers.join(","));
    else next.delete("t");
    router.push(`?${next.toString()}`);
  }

  function addTicker(ticker: string) {
    if (!ticker || selected.includes(ticker) || selected.length >= 5) return;
    setTickers([...selected, ticker]);
  }

  function removeTicker(ticker: string) {
    setTickers(selected.filter((t) => t !== ticker));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((t) => (
        <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
          {t}
          <button onClick={() => removeTicker(t)} aria-label={`Remove ${t}`} className="text-accent/70 hover:text-accent">
            ×
          </button>
        </span>
      ))}
      {selected.length < 5 && (
        <select
          value=""
          onChange={(e) => addTicker(e.target.value)}
          className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm"
        >
          <option value="">+ Add fund ({5 - selected.length} left)</option>
          {allFunds
            .filter((f) => !selected.includes(f.ticker))
            .map((f) => (
              <option key={f.ticker} value={f.ticker}>
                {f.ticker} — {f.fund_name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
