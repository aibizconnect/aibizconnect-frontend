"use client";

import { useEffect, useState, useTransition } from "react";
import { createOppAction, moveOppAction, deleteOppAction } from "@/app/tenants/[tenantId]/pipelines/crm-actions";
import type { Opportunity, Pipeline } from "@/lib/crm";

/** Opportunities kanban — stages as columns, drag cards across (HTML5 DnD) + per-stage value.
 *  Header/stat-bar live in the parent hub; this is the board surface only. Clicking a card
 *  opens the shared detail drawer; every mutation is reported up so the stat bar stays live. */
export default function CrmPipeline({ tenantId, pipeline, initial, onOpen, onChanged }: {
  tenantId: string; pipeline: Pipeline; initial: Opportunity[];
  onOpen?: (id: string) => void; onChanged?: (opps: Opportunity[]) => void;
}) {
  const [opps, setOpps] = useState<Opportunity[]>(initial);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", value: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => { setOpps(initial); }, [initial]);
  const commit = (next: Opportunity[]) => { setOpps(next); onChanged?.(next); };

  const byStage = (stage: string) => opps.filter((o) => o.stage === stage);
  const stageTotal = (stage: string) => byStage(stage).reduce((a, o) => a + o.value, 0);
  const move = (id: string, stage: string) => start(async () => commit(await moveOppAction(tenantId, pipeline.id, id, stage)));
  const del = (id: string) => start(async () => commit(await deleteOppAction(tenantId, pipeline.id, id)));
  const add = (stage: string) => start(async () => { const o = await createOppAction(tenantId, pipeline.id, { name: form.name || "New deal", value: parseFloat(form.value) || 0, stage }); commit(o); setForm({ name: "", value: "" }); setAdding(null); });

  const fmt = (n: number) => n ? `$${n.toLocaleString()}` : "$0";
  const tint: Record<string, string> = { won: "bg-emerald-100 text-emerald-700", lost: "bg-rose-100 text-rose-600" };

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => (
          <div key={stage} className="w-72 shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) move(dragId, stage); setDragId(null); }}>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-slate-700">{stage}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{byStage(stage).length} · {fmt(stageTotal(stage))}</span>
            </div>
            <div className="min-h-[120px] space-y-2 rounded-xl bg-slate-100/70 p-2">
              {byStage(stage).map((o) => (
                <div key={o.id} draggable onDragStart={() => setDragId(o.id)}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => onOpen?.(o.id)} className="text-left text-sm font-medium text-slate-900 hover:text-[#1e3a8a] hover:underline">{o.name}</button>
                    <button onClick={() => del(o.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-emerald-600">{fmt(o.value)}</span>
                    {o.status !== "open" && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${tint[o.status] ?? ""}`}>{o.status}</span>}
                  </div>
                  {o.ownerEmail && <div className="mt-1 truncate text-[11px] text-slate-400">{o.ownerEmail}</div>}
                </div>
              ))}

              {adding === stage ? (
                <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2">
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Deal name" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                  <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value $" className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
                  <div className="flex gap-1">
                    <button onClick={() => add(stage)} disabled={pending} className="flex-1 rounded bg-[#1e3a8a] px-2 py-1 text-xs text-white disabled:opacity-50">Add</button>
                    <button onClick={() => setAdding(null)} className="rounded px-2 py-1 text-xs text-slate-400">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAdding(stage)} className="w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs text-slate-400 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">＋ Add deal</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Drag a card between columns to move a deal through your pipeline. Click a deal to open its card.</p>
    </div>
  );
}
