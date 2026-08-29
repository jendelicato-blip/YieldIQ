"use client";

// Client-side persistence for watchlist / portfolio / alerts.
//
// This is an MVP store (localStorage, single device, no auth) that mirrors
// the `user_watchlist` / `user_portfolio_holdings` / `user_alerts` tables in
// supabase/migrations/0001_init.sql field-for-field. Swapping this module
// for a Supabase-backed one (keyed by auth.uid()) is a drop-in change — no
// UI component needs to change, since everything here reads through the
// same hook shapes.

import { useCallback, useSyncExternalStore } from "react";
import type { Alert, AlertType, PortfolioHolding, WatchlistItem } from "./types";

const KEYS = {
  watchlist: "yieldiq.watchlist.v1",
  portfolio: "yieldiq.portfolio.v1",
  alerts: "yieldiq.alerts.v1",
};

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("yieldiq-store", { detail: key }));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

const EMPTY: unknown[] = [];

function useLocalCollection<T>(key: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function onUpdate(e: Event) {
        const detail = (e as CustomEvent).detail;
        if (!detail || detail === key) onStoreChange();
      }
      window.addEventListener("yieldiq-store", onUpdate);
      window.addEventListener("storage", onUpdate);
      return () => {
        window.removeEventListener("yieldiq-store", onUpdate);
        window.removeEventListener("storage", onUpdate);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key]);
  const getServerSnapshot = () => null;

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items: T[] = raw ? safeParse<T[]>(raw, EMPTY as T[]) : (EMPTY as T[]);

  const update = useCallback(
    (next: T[]) => {
      writeLocal(key, next);
    },
    [key],
  );

  return [items, update] as const;
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useWatchlist() {
  const [items, setItems] = useLocalCollection<WatchlistItem>(KEYS.watchlist);

  const isWatched = useCallback((ticker: string) => items.some((i) => i.ticker === ticker), [items]);

  const toggle = useCallback(
    (ticker: string) => {
      if (isWatched(ticker)) {
        setItems(items.filter((i) => i.ticker !== ticker));
      } else {
        setItems([...items, { ticker, added_at: new Date().toISOString() }]);
      }
    },
    [items, isWatched, setItems],
  );

  return { items, isWatched, toggle };
}

export function usePortfolio() {
  const [holdings, setHoldings] = useLocalCollection<PortfolioHolding>(KEYS.portfolio);

  const add = useCallback(
    (h: Omit<PortfolioHolding, "id">) => {
      setHoldings([...holdings, { ...h, id: crypto.randomUUID() }]);
    },
    [holdings, setHoldings],
  );

  const remove = useCallback((id: string) => setHoldings(holdings.filter((h) => h.id !== id)), [holdings, setHoldings]);

  return { holdings, add, remove };
}

export function useAlerts() {
  const [alerts, setAlerts] = useLocalCollection<Alert>(KEYS.alerts);

  const add = useCallback(
    (a: { ticker: string | null; alert_type: AlertType; threshold: number | null }) => {
      setAlerts([
        ...alerts,
        { id: crypto.randomUUID(), active: true, created_at: new Date().toISOString(), ...a },
      ]);
    },
    [alerts, setAlerts],
  );

  const remove = useCallback((id: string) => setAlerts(alerts.filter((a) => a.id !== id)), [alerts, setAlerts]);

  const toggleActive = useCallback(
    (id: string) => setAlerts(alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a))),
    [alerts, setAlerts],
  );

  return { alerts, add, remove, toggleActive };
}
