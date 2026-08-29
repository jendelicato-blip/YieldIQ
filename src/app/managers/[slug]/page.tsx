import Link from "next/link";
import { notFound } from "next/navigation";
import { getFundsByManager, getManagerBySlug, getManagers, getLatestMetrics } from "@/lib/data";
import { computeFundRatings } from "@/lib/ratings/compute";
import FundCard from "@/components/fund/FundCard";
import { VerificationBadge } from "@/components/ui/Badges";
import { formatCompactUsd, formatPct, STRATEGY_LABELS } from "@/lib/format";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getManagers().map((m) => ({ slug: m.slug }));
}

export default async function ManagerPage({ params }: PageProps<"/managers/[slug]">) {
  const { slug } = await params;
  const manager = getManagerBySlug(slug);
  if (!manager) notFound();

  const funds = getFundsByManager(slug);
  const active = funds.filter((f) => f.status === "active");
  const changed = funds.filter((f) => f.status !== "active");

  const ratings = active.map((f) => computeFundRatings(f.ticker)).filter((r) => r !== null);

  const yields = active
    .map((f) => getLatestMetrics(f.ticker))
    .map((m) => m?.ttm_yield_pct ?? m?.distribution_yield_pct)
    .filter((y): y is number => y != null);
  const avgYield = yields.length ? yields.reduce((a, b) => a + b, 0) / yields.length : null;

  const expenses = active
    .map((f) => getLatestMetrics(f.ticker)?.expense_ratio_pct)
    .filter((e): e is number => e != null);
  const avgExpense = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : null;

  const totalAum = active
    .map((f) => getLatestMetrics(f.ticker)?.aum_usd)
    .filter((a): a is number => a != null);
  const aumSum = totalAum.length === active.length && totalAum.length > 0
    ? totalAum.reduce((a, b) => a + b, 0)
    : null; // only show a total when every active fund has verified AUM

  function top(sortKey: "yield" | "nav_growth" | "income_quality", n = 5) {
    const withValue = ratings
      .map((r) => {
        let v: number | null = null;
        if (sortKey === "yield") v = r!.metrics?.ttm_yield_pct ?? r!.metrics?.distribution_yield_pct ?? null;
        if (sortKey === "nav_growth") v = r!.navGrowth.score;
        if (sortKey === "income_quality") v = r!.incomeQuality.score;
        return { r: r!, v };
      })
      .filter((x) => x.v != null)
      .sort((a, b) => (b.v as number) - (a.v as number));
    return withValue.slice(0, n).map((x) => x.r);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/managers" className="text-xs text-muted hover:text-accent">
        ← All managers
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{manager.name}</h1>
          {manager.website && (
            <a
              href={manager.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              {manager.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {manager.primary_strategies.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {manager.primary_strategies.map((s) => STRATEGY_LABELS[s] ?? s).join(" · ")}
            </p>
          )}
        </div>
        <VerificationBadge status={manager.verification_status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active Funds" value={String(active.length)} />
        <Stat label="Avg. Distribution Yield" value={formatPct(avgYield)} />
        <Stat label="Avg. Expense Ratio" value={formatPct(avgExpense, 2)} />
        <Stat label="Total AUM (verified funds)" value={aumSum != null ? formatCompactUsd(aumSum) : "Data unavailable"} />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Ranked by Yield</h2>
        <Grid ratings={top("yield")} />
      </section>
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Ranked by NAV Growth</h2>
        <Grid ratings={top("nav_growth")} />
      </section>
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Ranked by Income Quality</h2>
        <Grid ratings={top("income_quality")} />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">All Active Funds ({active.length})</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ratings.map((r) => (
            <FundCard key={r!.fund.ticker} r={r!} />
          ))}
        </div>
      </section>

      {changed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-bold">Recently Changed / Closed Funds</h2>
          <div className="card divide-y divide-border">
            {changed.map((f) => (
              <div key={f.ticker} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold">{f.ticker}</span>{" "}
                  <span className="text-muted">{f.fund_name}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium uppercase text-caution">{f.status.replace(/_/g, " ")}</p>
                  {f.status_note && <p className="text-xs text-muted">{f.status_note}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="tabular text-xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Grid({ ratings }: { ratings: (ReturnType<typeof computeFundRatings>)[] }) {
  if (ratings.length === 0) {
    return <div className="card p-6 text-center text-sm text-muted">No verified data available yet for this ranking.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ratings.map((r) => (
        <FundCard key={r!.fund.ticker} r={r!} />
      ))}
    </div>
  );
}
