// Server-only reader for update history / status. Reads update-history.json
// fresh from disk on every call (not a cached static import) so that a
// manual update (which writes to this file at runtime) is reflected
// immediately, without needing a server restart. Never import this from a
// "use client" file — it uses Node's fs module.

import fs from "node:fs";
import path from "node:path";
import type { UpdateHistoryEntry, UpdateStatus } from "./types";

const SEED_DIR = path.join(process.cwd(), "src/data/seed");
const HISTORY_FILE = path.join(SEED_DIR, "update-history.json");

export function getUpdateHistory(): UpdateHistoryEntry[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const entries = JSON.parse(raw) as UpdateHistoryEntry[];
    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

export function getUpdateEntry(id: string): UpdateHistoryEntry | null {
  return getUpdateHistory().find((e) => e.id === id) ?? null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getUpdateStatus(): UpdateStatus {
  const history = getUpdateHistory();
  const last = history[0] ?? null;
  const lastAutomatic = history.find((e) => e.update_type === "automatic") ?? null;

  let nextAutomaticDue: string | null = null;
  let isAutomaticOverdue = false;
  if (lastAutomatic) {
    const due = new Date(new Date(lastAutomatic.timestamp).getTime() + SEVEN_DAYS_MS);
    nextAutomaticDue = due.toISOString();
    isAutomaticOverdue = due.getTime() < Date.now();
  }

  return { last, nextAutomaticDue, isAutomaticOverdue };
}
