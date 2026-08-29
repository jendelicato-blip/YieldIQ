import { getUpdateHistory, getUpdateStatus } from "@/lib/ingest/status";
import { formatDate } from "@/lib/format";
import UpdateDataButton from "./UpdateDataButton";
import UpdateHistoryList from "./UpdateHistoryList";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function UpdateStatusCard() {
  const status = getUpdateStatus();
  const history = getUpdateHistory().slice(0, 8);

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Last Updated</p>
          <p className="tabular text-lg font-bold">
            {status.last ? `${formatDate(status.last.date)} (${relativeTime(status.last.timestamp)})` : "Never"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Update Type:{" "}
            <span className="font-semibold text-foreground">
              {status.last ? (status.last.update_type === "automatic" ? "Automatic Weekly" : "Manual") : "—"}
            </span>
          </p>
          <p className="text-xs text-muted">
            Next Automatic Update:{" "}
            <span className={`font-semibold ${status.isAutomaticOverdue ? "text-caution" : "text-foreground"}`}>
              {status.nextAutomaticDue ? formatDate(status.nextAutomaticDue) : "Not yet scheduled"}
            </span>
          </p>
        </div>
        <UpdateDataButton />
      </div>

      <p className="mt-4 text-xs text-muted">
        Your database automatically stays current once a week. You can force an immediate,
        comprehensive update at any time — it never waits for the weekly schedule.
      </p>

      {history.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-accent">
            Update History
          </summary>
          <div className="mt-2">
            <UpdateHistoryList history={history} />
          </div>
        </details>
      )}
    </div>
  );
}
