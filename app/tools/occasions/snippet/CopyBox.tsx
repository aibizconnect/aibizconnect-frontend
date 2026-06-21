"use client";

import { useState } from "react";

/** Read-only code box with a one-click copy button. */
export default function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 pr-24 text-[13px] leading-relaxed text-slate-100"><code>{value}</code></pre>
      <button onClick={copy} className="absolute right-3 top-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20">
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
