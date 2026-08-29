import { NextResponse } from "next/server";
import { getUpdateStatus } from "@/lib/ingest/status";
import type { UpdateHistoryEntry } from "@/lib/ingest/types";

export const dynamic = "force-dynamic";

// The manual "↻ UPDATE DATA" button's backend. Runs the same engine the
// weekly GitHub Action runs (scripts/ingest/fetch_daily_fmp.mjs), tagged
// update_type "manual" instead of "automatic" — see docs/ARCHITECTURE.md
// for why the automatic side runs out-of-process via CI rather than a
// server-side scheduler.
//
// This route requires a writable, persistent filesystem (a self-hosted or
// local Node server) to have any effect — see the module-level comment in
// src/lib/data/index.ts. On a read-only-filesystem serverless deployment
// this will fail cleanly rather than silently no-op.

let isRunning = false;

type UpdateEngine = {
  runUpdate: (args: { triggeredBy: "manual" | "automatic" }) => Promise<UpdateHistoryEntry>;
};

async function loadEngine(): Promise<UpdateEngine> {
  // Relative import across the src/ boundary into scripts/ — both live in
  // this repo; scripts/ is excluded from the app's TypeScript project only
  // to keep `next build`'s typecheck from requiring @supabase/supabase-js
  // (used by the other reference script in that folder), not because this
  // module is off-limits to import.
  const mod = (await import(
    /* webpackIgnore: false */ "../../../../scripts/ingest/fetch_daily_fmp.mjs"
  )) as UpdateEngine;
  return mod;
}

export async function POST() {
  if (isRunning) {
    return NextResponse.json(
      { error: "busy", message: "An update is already in progress. Try again shortly." },
      { status: 409 },
    );
  }

  isRunning = true;
  try {
    const engine = await loadEngine();
    const entry = await engine.runUpdate({ triggeredBy: "manual" });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json(
      { error: "update_failed", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  } finally {
    isRunning = false;
  }
}

export async function GET() {
  return NextResponse.json({ status: getUpdateStatus(), running: isRunning });
}
