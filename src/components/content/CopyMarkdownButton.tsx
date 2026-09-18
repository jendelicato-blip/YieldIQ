"use client";

import { useState } from "react";

export default function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2"
    >
      {copied ? "Copied ✓" : "Copy full report as Markdown"}
    </button>
  );
}
