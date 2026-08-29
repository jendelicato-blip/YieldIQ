import type { RocWarning } from "@/lib/tax";

export default function RocWarningBanner({ warning }: { warning: RocWarning }) {
  if (warning.level === "none" || warning.avgRocPct == null) return null;

  if (warning.level === "high_roc_nav_decline") {
    return (
      <div className="rounded-xl border border-negative/30 bg-negative/10 p-4 text-sm">
        <p className="font-bold text-negative">🔴 ROC + NAV DECLINE</p>
        <p className="mt-1 text-negative/90">
          {warning.avgRocPct.toFixed(0)}% of recent distributions have been classified as
          Return of Capital, alongside a substantial NAV decline. High ROC combined with
          declining NAV deserves additional investigation — it is not, on its own, proof the
          fund is unsafe, but it warrants a closer look at total return and strategy.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-caution/30 bg-caution/10 p-4 text-sm">
      <p className="font-bold text-caution">🟡 HIGH ROC</p>
      <p className="mt-1 text-caution/90">
        {warning.avgRocPct.toFixed(0)}% of recent distributions have been classified as Return
        of Capital. ROC is generally not immediately taxable when received in a taxable
        account, but it can reduce your tax basis. Investigate the fund&apos;s NAV and total
        return before interpreting a high ROC percentage as a benefit or a problem on its own.
      </p>
    </div>
  );
}
