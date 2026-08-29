export default function InvestorWarning({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-lg border border-caution/30 bg-caution/10 px-3 py-2 text-xs text-caution">
        Distribution yield is not the same as investment return. High yield does not
        necessarily mean high return.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-caution">
      <p className="font-semibold">A note before you sort by yield</p>
      <p className="mt-1 text-caution/90">
        Distribution yield is not the same as investment return. Past distributions do not
        guarantee future distributions. High distribution rates can involve substantial risk
        and may include Return of Capital. Highest yield ≠ best investment.
      </p>
    </div>
  );
}
