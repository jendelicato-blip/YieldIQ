import Link from "next/link";
import { rankBy } from "@/lib/ratings/rankings";
import ScreenerTable from "@/components/fund/ScreenerTable";
import InvestorWarning from "@/components/ui/InvestorWarning";

export default function HighYieldPage() {
  const rows = rankBy("yield", 250);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">High Yield</h1>
      <p className="mt-1 text-sm text-muted">
        All tracked funds ranked purely by verified distribution yield. This is one input, not a
        verdict — pair it with NAV Growth, Risk, and Income Quality on the{" "}
        <Link href="/screener" className="text-accent hover:underline">
          full screener
        </Link>
        .
      </p>
      <div className="mt-4">
        <InvestorWarning />
      </div>
      <div className="mt-6">
        <ScreenerTable rows={rows} />
      </div>
    </div>
  );
}
