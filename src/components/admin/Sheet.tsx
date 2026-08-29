"use client";

import { useEffect } from "react";

export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-surface shadow-2xl animate-fade-in sm:max-h-[80vh] sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor">
              <path d="M5 5l10 10M15 5L5 15" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
