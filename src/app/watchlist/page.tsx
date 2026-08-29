"use client";

import Link from "next/link";
import { useWatchlist } from "@/lib/client-store";
import { computeFundRatings } from "@/lib/ratings/compute";
import FundCard from "@/components/fund/FundCard";

export default function WatchlistPage() {
  const { items } = useWatchlist();
  const ratings = items
    .map((i) => computeFundRatings(i.ticker))
    .filter((r) => r !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">My Watchlist</h1>
      <p className="mt-1 text-sm text-muted">
        Saved on this device. Tap a fund&rsquo;s ticker page and use &ldquo;Add to Watchlist&rdquo; to save more.
      </p>

      {ratings.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm text-muted">
          Your watchlist is empty.{" "}
          <Link href="/explore" className="text-accent hover:underline">
            Explore funds
          </Link>{" "}
          to add some.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ratings.map((r) => (
            <FundCard key={r!.fund.ticker} r={r!} />
          ))}
        </div>
      )}
    </div>
  );
}
