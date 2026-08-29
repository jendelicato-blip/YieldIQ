export default function DistinctionBanner() {
  return (
    <div className="card p-4">
      <p className="text-center text-sm font-bold tracking-wide text-foreground sm:text-base">
        DISTRIBUTION <span className="text-muted">≠</span> TOTAL RETURN{" "}
        <span className="text-muted">≠</span> TAXABLE INCOME
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3 sm:text-sm">
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="font-semibold text-info">Distribution</p>
          <p className="mt-1 text-muted">Cash paid to shareholders.</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="font-semibold text-accent">Total Return</p>
          <p className="mt-1 text-muted">Change in investment value plus distributions.</p>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <p className="font-semibold text-caution">Taxable Income</p>
          <p className="mt-1 text-muted">
            The portion of distributions classified as taxable under applicable tax rules.
          </p>
        </div>
      </div>
    </div>
  );
}
