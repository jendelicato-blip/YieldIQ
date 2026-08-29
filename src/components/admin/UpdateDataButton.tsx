"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UpdateHistoryEntry } from "@/lib/ingest/types";
import UpdateResultsReport from "./UpdateResultsReport";

const PROGRESS_STEPS = [
  "Scanning fund managers…",
  "Checking new funds…",
  "Updating distributions…",
  "Updating yields…",
  "Updating NAV…",
  "Updating performance…",
  "Checking tax information…",
  "Recalculating ratings…",
];

type Phase = "idle" | "running" | "done" | "error";

export default function UpdateDataButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<UpdateHistoryEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function onClick() {
    setPhase("running");
    setStepIndex(0);
    setErrorMessage(null);
    setJustUpdated(false);

    // Progress messaging is UX chrome for an in-flight request — it does
    // not represent per-item results. The only numbers ever shown to the
    // user are the real ones in the API response below.
    timerRef.current = setInterval(() => {
      setStepIndex((i) => (i < PROGRESS_STEPS.length - 1 ? i + 1 : i));
    }, 900);

    try {
      const res = await fetch("/api/update-data", { method: "POST" });
      const data = await res.json();
      if (timerRef.current) clearInterval(timerRef.current);

      if (!res.ok) {
        setPhase("error");
        setErrorMessage(data?.message ?? "Update failed.");
        return;
      }

      setResult(data.entry as UpdateHistoryEntry);
      setPhase("done");
      setJustUpdated(true);
      router.refresh();
    } catch (e) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("error");
      setErrorMessage(e instanceof Error ? e.message : "Network error.");
    }
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={phase === "running"}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[#06110c] disabled:opacity-60"
      >
        <span className={phase === "running" ? "animate-spin" : ""}>↻</span>
        UPDATE DATA
      </button>
      {justUpdated && phase === "done" && <p className="mt-1 text-xs text-positive">Data updated just now.</p>}

      {phase === "running" && (
        <p className="mt-3 text-sm text-muted">
          <span className="animate-pulse">{PROGRESS_STEPS[stepIndex]}</span>
        </p>
      )}

      {phase === "error" && (
        <div className="mt-3 rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative">
          Update failed: {errorMessage}. Previously verified data has not been changed.
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-4">
          <UpdateResultsReport entry={result} />
        </div>
      )}
    </div>
  );
}
