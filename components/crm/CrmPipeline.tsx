"use client";

import { useState, useTransition } from "react";
import { createOppAction, moveOppAction, deleteOppAction } from "@/app/tenants/[tenantId]/pipelines/crm-actions";
import type { Opportunity, Pipeline } from "@/lib/crm";

/** Opportunities kanban — stages as columns, drag cards across (HTML5 DnD) + per-stage value. */
export default function CrmPipeline({ tenantId, pipeline, initial }: { tenantId: string; pipeline: Pipeline; initial: Opportunity[] }) {
  const [opps, setOpps] = useState<Opportunity[]>(initial);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", value: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const byStage = (stage: string) => opps.filter((o) => o.stage === stage);
  const stageTotal = (stage: string) => byStage(stage).reduce((a, o) => a + o.value, 0);
  const move = (id: string, stage: string) => start(async () => setOpps(await moveOppAction(tenantId, pipeline.id, id, stage)));
  const del = (id: string) => start(async () => setOpps(await deleteOppAction(tenantId, pipeline.id, id)));
  const add = (stage: string) => start(async () => { const o = await createOppAction(tenantId, pipeline.id, { name: form.name || "New deal", value: parseFloat(form.value) || 0, stage }); setOpps(o); setForm({ name: "", value: "" }); setAdding(null); });

  const fmt = (n: number) => n ? `$${n.toLocaleString()}` : "$0";

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Opportunities</h1>
        <p className="text-sm text-slate-500">{pipeline.name} · {opps.length} deals · {fmt(opps.reduce((a, o) => a + o.value, 0))} total pipeline value</p>
      </div>

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
                    <span className="text-sm font-medium text-slate-900">{o.name}</span>
                    <button onClick={() => del(o.id)} className="text-xs text-slate-300 hover:text-red-500">✕</button>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-emerald-600">{fmt(o.value)}</div>
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
      <p className="mt-2 text-xs text-slate-400">Drag a card between columns to move a deal through your pipeline.</p>
    </div>
  );
}
