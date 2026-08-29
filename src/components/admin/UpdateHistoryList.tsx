"use client";

import { useState } from "react";
import type { UpdateHistoryEntry } from "@/lib/ingest/types";
import { fundsUpdatedCount } from "@/lib/ingest/types";
import { formatDate } from "@/lib/format";
import Sheet from "./Sheet";
import UpdateResultsReport from "./UpdateResultsReport";

export default function UpdateHistoryList({ history }: { history: UpdateHistoryEntry[] }) {
  const [selected, setSelected] = useState<UpdateHistoryEntry | null>(null);

  if (history.length === 0) {
    return <p className="text-sm text-muted">No updates recorded yet.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-border">
        {history.map((entry) => {
          const changeCount = entry.changes.length;
          return (
            <li key={entry.id}>
              <button
                onClick={() => setSelected(entry)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-surface-2"
              >
                <div>
                  <p className="font-semibold">{formatDate(entry.date)}</p>
                  <p className="text-xs text-muted">
                    {entry.update_type === "automatic" ? "AUTOMATIC WEEKLY" : "MANUAL"} ·{" "}
                    {entry.status === "failed" ? "Failed" : entry.status === "partial" ? "Partially complete" : "Complete"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p className="tabular">{entry.funds_scanned} funds scanned</p>
                  <p className="tabular">
                    {changeCount} change{changeCount === 1 ? "" : "s"} · {fundsUpdatedCount(entry.changes)} funds
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <Sheet title={`Update — ${formatDate(selected.date)}`} onClose={() => setSelected(null)}>
          <UpdateResultsReport entry={selected} />
        </Sheet>
      )}
    </div>
  );
}
