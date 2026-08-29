"use client";

import { useState } from "react";

export interface BreakdownRow {
  key: string;
  value: number | null;
  weight: number;
  usedWeight: number;
}

export default function RatingExplainer({
  title,
  score,
  scoreLabel,
  breakdown,
  methodologyNote,
}: {
  title: string;
  score: number | null;
  scoreLabel: string;
  breakdown: BreakdownRow[];
  methodologyNote?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-accent hover:underline"
      >
        {open ? "Hide calculation ▲" : "Why this rating? ▼"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2 p-4 text-sm animate-fade-in">
          <p className="font-semibold">{title}</p>
          <p className="tabular mt-0.5 text-2xl font-bold text-accent">
            {score != null ? score.toFixed(1) : "N/A"}
            <span className="ml-1 text-sm font-normal text-muted">{scoreLabel}</span>
          </p>
          {methodologyNote && <p className="mt-1 text-xs text-muted">{methodologyNote}</p>}
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-1 font-medium">Factor</th>
                <th className="pb-1 text-right font-medium">Component score</th>
                <th className="pb-1 text-right font-medium">Weight used</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.key} className="border-t border-border">
                  <td className="py-1.5 pr-2">{row.key}</td>
                  <td className="tabular py-1.5 text-right">
                    {row.value != null ? row.value.toFixed(1) : "unavailable"}
                  </td>
                  <td className="tabular py-1.5 text-right">
                    {row.usedWeight > 0 ? `${(row.usedWeight * 100).toFixed(0)}%` : "excluded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-muted">
            Missing components are excluded and their weight is redistributed among available,
            verified components — never defaulted to a guessed value. See{" "}
            <a href="/education#ratings" className="text-accent hover:underline">
              methodology
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
