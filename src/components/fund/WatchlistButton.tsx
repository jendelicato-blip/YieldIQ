"use client";

import { useWatchlist } from "@/lib/client-store";

export default function WatchlistButton({ ticker }: { ticker: string }) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(ticker);
  return (
    <button
      onClick={() => toggle(ticker)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        watched ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-foreground"
      }`}
    >
      <svg viewBox="0 0 20 20" fill={watched ? "currentColor" : "none"} stroke="currentColor" className="h-3.5 w-3.5">
        <path d="M10 3.5 12.2 8l5 .7-3.6 3.5.85 5-4.45-2.35L5.55 17.2l.85-5L2.8 8.7l5-.7L10 3.5Z" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      {watched ? "On Watchlist" : "Add to Watchlist"}
    </button>
  );
}
