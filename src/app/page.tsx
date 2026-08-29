import Link from "next/link";
import { getActiveFunds, getManagers } from "@/lib/data";
import { rankBy } from "@/lib/ratings/rankings";
import FundCard from "@/components/fund/FundCard";
import InvestorWarning from "@/components/ui/InvestorWarning";
import UpdateStatusCard from "@/components/admin/UpdateStatusCard";

// Dynamic (not statically cached): the "↻ UPDATE DATA" button's effect —
// fresh update-history.json / seed data written to disk — must show up on
// the next render without a rebuild. See docs/ARCHITECTURE.md for the
// tradeoffs of the current JSON-file-as-database interim architecture.
export const dynamic = "force-dynamic";

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="text-xs font-semibold text-accent hover:underline">
            View all →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-6 text-center text-sm text-muted">{message}</div>
  );
}

function CardRow({
  items,
  highlight,
}: {
  items: ReturnType<typeof rankBy>;
  highlight?: (r: ReturnType<typeof rankBy>[number]) => { label: string; value: string; tone?: "positive" | "negative" | "neutral" } | undefined;
}) {
  if (items.length === 0) {
    return (
      <EmptyState message="Building verified history for this ranking — check back as daily data accumulates." />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((r) => (
        <FundCard key={r.fund.ticker} r={r} highlight={highlight?.(r)} />
      ))}
    </div>
  );
}

function sixMonthHighlight(r: ReturnType<typeof rankBy>[number]) {
  const p = r.periodReturns.find((p) => p.period === "6M");
  const value = p?.totalReturnReinvestedPct ?? p?.totalReturnPct;
  if (value == null) return undefined;
  const reported = p?.source === "reported";
  const tone: "positive" | "negative" | "neutral" = value > 0 ? "positive" : value < 0 ? "negative" : "neutral";
  return {
    label: `6M Total Return${reported ? " (reported)" : ""}`,
    value: `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
    tone,
  };
}

function yieldIqScoreHighlight(r: ReturnType<typeof rankBy>[number]) {
  if (r.yieldIqScore.score == null) return undefined;
  return { label: "YieldIQ Score", value: r.yieldIqScore.score.toFixed(1) + " / 100", tone: "neutral" as const };
}

export default function DashboardPage() {
  const funds = getActiveFunds();
  const managers = getManagers();

  const highestYield = rankBy("yield", 4);
  const bestNavGrowth = rankBy("nav_growth", 4);
  const bestTotalReturn = rankBy("total_return_6m", 4);
  const bestIncomeQuality = rankBy("income_quality", 4);
  const bestYieldIq = rankBy("yieldiq_score", 8);
  const newest = rankBy("newest", 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="animate-fade-in">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          YIELD<span className="text-accent">IQ</span>
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Know the Yield. Understand the Risk. Grow the Income. A research dashboard for
          dividend, covered-call, and option-income ETFs — built to never confuse a big
          distribution with a good investment return.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="card px-4 py-3">
            <p className="text-2xl font-bold tabular">{funds.length}</p>
            <p className="text-xs text-muted">Funds tracked</p>
          </div>
          <div className="card px-4 py-3">
            <p className="text-2xl font-bold tabular">{managers.length}</p>
            <p className="text-xs text-muted">Managers tracked</p>
          </div>
        </div>
      </section>

      <div className="mt-6">
        <UpdateStatusCard />
      </div>

      <div className="mt-6">
        <InvestorWarning />
      </div>

      <Section
        title="YieldIQ Score — Top Ranked"
        subtitle="Composite of NAV preservation, total return, income quality, sustainability, risk, yield, cost, liquidity and track record. Never yield alone."
        href="/screener"
      >
        {bestYieldIq.length === 0 ? (
          <EmptyState message="YieldIQ Score requires verified multi-period history and appears once a fund has accumulated enough daily snapshots." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bestYieldIq.map((r) => (
              <FundCard key={r.fund.ticker} r={r} highlight={yieldIqScoreHighlight(r)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Highest Yield" subtitle="Ranked by TTM / headline distribution yield only — not a quality signal." href="/high-yield">
        <CardRow items={highestYield} />
      </Section>

      <Section title="Best NAV Preservation" subtitle="NAV trend, drawdown, volatility and stability — never based on yield." href="/screener?sort=nav_growth">
        <CardRow items={bestNavGrowth} />
      </Section>

      <Section title="Best Total Return" subtitle="Price return + distributions, trailing 6 months." href="/screener?sort=total_return">
        <CardRow items={bestTotalReturn} highlight={sixMonthHighlight} />
      </Section>

      <Section title="Best Income Quality" subtitle="Consistency, NAV preservation, ROC prudence, sustainability and more." href="/screener?sort=income_quality">
        <CardRow items={bestIncomeQuality} />
      </Section>

      <Section title="Newest Funds" subtitle="Recently launched — limited history, rate accordingly." href="/explore?sort=newest">
        <CardRow items={newest} />
      </Section>

      <Section title="Explore by Manager">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {managers.slice(0, 8).map((m) => (
            <Link key={m.slug} href={`/managers/${m.slug}`} className="card p-4 hover:border-accent/50">
              <p className="font-bold">{m.name}</p>
              <p className="mt-1 text-xs text-muted">
                {funds.filter((f) => f.manager_slug === m.slug).length} funds
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-3 text-right">
          <Link href="/managers" className="text-xs font-semibold text-accent hover:underline">
            View all managers →
          </Link>
        </div>
      </Section>
    </div>
  );
}
