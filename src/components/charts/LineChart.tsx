"use client";

import { useMemo, useState } from "react";

export interface Series {
  key: string;
  label: string;
  color: string;
  points: { date: string; value: number | null }[];
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const CHART_PADDING = 32;

export default function LineChart({ series }: { series: Series[] }) {
  const [visible, setVisible] = useState<Set<string>>(new Set(series.map((s) => s.key)));

  const activeSeries = series.filter((s) => visible.has(s.key) && s.points.some((p) => p.value != null));
  const width = CHART_WIDTH;
  const height = CHART_HEIGHT;
  const padding = CHART_PADDING;

  const paths = useMemo(() => {
    if (activeSeries.length === 0) return [];
    const allValues = activeSeries.flatMap((s) => s.points.map((p) => p.value).filter((v): v is number => v != null));
    if (allValues.length === 0) return [];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const span = max - min || 1;

    return activeSeries.map((s) => {
      const pts = s.points.filter((p) => p.value != null);
      const n = pts.length;
      const d = pts
        .map((p, i) => {
          const x = padding + (i / Math.max(n - 1, 1)) * (width - padding * 2);
          const y = padding + (1 - ((p.value as number) - min) / span) * (height - padding * 2);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return { key: s.key, color: s.color, d };
    });
  }, [activeSeries, width, height, padding]);

  const hasAnyData = series.some((s) => s.points.some((p) => p.value != null));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {series.map((s) => {
          const on = visible.has(s.key);
          const hasData = s.points.some((p) => p.value != null);
          return (
            <button
              key={s.key}
              disabled={!hasData}
              onClick={() =>
                setVisible((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.key)) next.delete(s.key);
                  else next.add(s.key);
                  return next;
                })
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity ${
                on ? "border-border" : "border-border opacity-40"
              } ${!hasData ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.label}
              {!hasData && <span className="text-muted">(no data)</span>}
            </button>
          );
        })}
      </div>
      {hasAnyData && paths.length > 0 ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Fund performance chart">
          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg bg-surface-2 text-sm text-muted">
          Insufficient verified history to chart this fund yet.
        </div>
      )}
    </div>
  );
}
