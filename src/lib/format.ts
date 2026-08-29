export function formatCurrency(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatSignedPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value + (value.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

export function titleCase(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const STRATEGY_LABELS: Record<string, string> = {
  single_stock_option_income: "Single-Stock Option Income",
  crypto_option_income: "Crypto Option Income",
  diversified_option_income: "Diversified Option Income",
  index_covered_call: "Index Covered Call",
  yieldboost_synthetic: "YieldBOOST / Synthetic Income",
  zero_dte_income: "0DTE Income",
  weekly_pay: "WeeklyPay Income",
  leveraged_option_income: "Leveraged Option Income",
  convertible_income: "Convertible Income",
  volatility_income: "Volatility Income",
  traditional_dividend: "Traditional Dividend",
  enhanced_income: "Enhanced Income",
  other: "Other Income Strategy",
};

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  irregular: "Irregular",
  unknown: "Unknown",
};
