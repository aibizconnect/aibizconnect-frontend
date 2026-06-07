"use client";

import { useState, useTransition } from "react";
import { deleteRunAction } from "@/app/tenants/[tenantId]/tools/actions";
import type { SavedRun } from "@/lib/tools/run";

/** Saved draft outputs for a tool (or all tools, when toolKey is omitted). Read-only
 * reuse: expand to view, copy, or delete. Drafts never publish/send/charge. */
export default function SavedDrafts({ tenantId, toolKey, initial, toolNameOf }: {
  tenantId: string; toolKey?: string; initial: SavedRun[]; toolNameOf?: Record<string, string>;
}) {
  const [runs, setRuns] = useState<SavedRun[]>(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const del = (id: string) => start(async () => setRuns(await deleteRunAction(tenantId, id, toolKey)));

  if (!runs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-400">
        No saved drafts yet. Generate something above and hit <span className="font-medium text-slate-500">Save draft</span>.
      </div>
    );
  }

  const fmt = (s: string) => { try { return new Date(s).toLocaleString(); } catch { return s; } };

  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                {toolNameOf && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{toolNameOf[r.toolKey] || r.toolKey}</span>}
                <span className="truncate text-sm text-slate-700">{r.output.slice(0, 80) || "(empty draft)"}</span>
              </div>
              <span className="text-[11px] text-slate-400">{fmt(r.createdAt)} · draft</span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => navigator.clipboard?.writeText(r.output)} className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Copy</button>
              <button onClick={() => del(r.id)} disabled={pending} className="rounded px-2 py-1 text-xs text-slate-300 hover:text-red-500">✕</button>
            </div>
          </div>
          {open === r.id && (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-slate-100 px-4 py-3 font-sans text-sm leading-relaxed text-slate-800">{r.output}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
