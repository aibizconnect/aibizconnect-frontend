"use client";

import { useState } from "react";
import { bulkGenerateStrategies } from "@/app/platform/strategy-actions";

/**
 * Admin button to generate a deterministic Content Strategy for EVERY tenant in one click.
 * Safe to re-run (UPSERT overwrites). Each generation is audited.
 */
export default function BulkStrategy() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setMsg(null);
    const r = await bulkGenerateStrategies();
    setBusy(false);
    setMsg(r.ok ? `Done — ${r.generated} generated, ${r.failed} failed.` : (r.message ?? "Could not run."));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <button onClick={run} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
        {busy ? "Generating for all tenants…" : "Generate strategies for all tenants"}
      </button>
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
