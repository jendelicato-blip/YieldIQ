import type { VerificationStatus } from "@/lib/types";
import type { RiskResult } from "@/lib/ratings/engine";
import type { NavDecayLevel } from "@/lib/ratings/engine";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const map: Record<VerificationStatus, { label: string; className: string }> = {
    verified: { label: "VERIFIED", className: "bg-positive/15 text-positive" },
    partially_verified: { label: "PARTIALLY VERIFIED", className: "bg-caution/15 text-caution" },
    stale: { label: "STALE DATA", className: "bg-caution/15 text-caution" },
    unavailable: { label: "DATA UNAVAILABLE", className: "bg-border text-muted" },
  };
  const cfg = map[status];
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: RiskResult }) {
  if (risk.score == null || !risk.label) {
    return <span className="text-sm text-muted">Insufficient data</span>;
  }
  const colorMap: Record<string, string> = {
    LOW: "text-positive bg-positive/15",
    MODERATE: "text-caution bg-caution/15",
    HIGH: "text-negative bg-negative/15",
    "VERY HIGH": "text-negative bg-negative/20",
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular text-lg font-bold">{risk.score.toFixed(1)} / 10</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${colorMap[risk.label]}`}>
        {risk.label}
      </span>
    </span>
  );
}

export function NavDecayBadge({ level }: { level: NavDecayLevel }) {
  if (!level) return <span className="text-sm text-muted">Insufficient data</span>;
  const map: Record<string, { emoji: string; label: string; className: string }> = {
    LOW: { emoji: "🟢", label: "LOW NAV DECAY RISK", className: "bg-positive/15 text-positive" },
    MODERATE: { emoji: "🟡", label: "MODERATE NAV DECAY RISK", className: "bg-caution/15 text-caution" },
    HIGH: { emoji: "🔴", label: "HIGH NAV DECAY RISK", className: "bg-negative/15 text-negative" },
  };
  const cfg = map[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.className}`}>
      <span>{cfg.emoji}</span>
      {cfg.label}
    </span>
  );
}

export function FrequencyBadge({ frequency }: { frequency: string }) {
  const map: Record<string, string> = {
    weekly: "bg-info/15 text-info",
    monthly: "bg-accent/15 text-accent",
    quarterly: "bg-caution/15 text-caution",
    annually: "bg-border text-muted",
    irregular: "bg-negative/10 text-negative",
    unknown: "bg-border text-muted",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${map[frequency] ?? map.unknown}`}>
      {frequency}
    </span>
  );
}

export function ReturnValue({ value, decimals = 2 }: { value: number | null; decimals?: number }) {
  if (value == null) return <span className="text-muted">Insufficient history</span>;
  const positive = value > 0;
  const negative = value < 0;
  return (
    <span
      className={`tabular font-semibold ${positive ? "text-positive" : negative ? "text-negative" : "text-foreground"}`}
    >
      {positive ? "+" : ""}
      {value.toFixed(decimals)}%
    </span>
  );
}
