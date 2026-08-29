import Link from "next/link";
import { getFunds, getManagers } from "@/lib/data";
import { STRATEGY_LABELS } from "@/lib/format";

export const dynamic = "force-static";

export default function ManagersPage() {
  const managers = [...getManagers()].sort((a, b) => a.name.localeCompare(b.name));
  const funds = getFunds();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Manager Directory</h1>
      <p className="mt-1 text-sm text-muted">
        Every fund sponsor YieldIQ tracks. New managers are added automatically once a
        newly-discovered fund passes verification — see{" "}
        <Link href="/education" className="text-accent hover:underline">
          how data is verified
        </Link>
        .
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {managers.map((m) => {
          const managerFunds = funds.filter((f) => f.manager_slug === m.slug);
          const active = managerFunds.filter((f) => f.status === "active");
          const strategies = m.primary_strategies
            .map((s) => STRATEGY_LABELS[s] ?? s)
            .slice(0, 2)
            .join(" / ");
          return (
            <Link key={m.slug} href={`/managers/${m.slug}`} className="card p-5 hover:border-accent/50">
              <p className="text-lg font-bold uppercase tracking-wide">{m.name}</p>
              <p className="tabular mt-1 text-2xl font-bold text-accent">{active.length}</p>
              <p className="text-xs text-muted">Active {active.length === 1 ? "Fund" : "Funds"}</p>
              {strategies && <p className="mt-2 text-xs text-muted">{strategies}</p>}
              {m.website && (
                <p className="mt-3 truncate text-[11px] text-muted">{m.website.replace(/^https?:\/\//, "")}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
