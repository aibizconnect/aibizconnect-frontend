"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveWorkflowAction } from "@/app/tenants/[tenantId]/automations/actions";
import { TRIGGERS, STEP_DEFS, isGated, type Workflow, type WfStep, type StepType, type TriggerType } from "@/lib/workflows";

/** Workflow editor — trigger + vertical step list (our node-canvas-lite). AI-safe: send
 * steps are flagged "needs approval"; Publish only flips status (no live execution). */
export default function WorkflowEditor({ tenantId, initial }: { tenantId: string; initial: Workflow }) {
  const [wf, setWf] = useState<Workflow>(initial);
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);

  const save = (next: Workflow) => { setWf(next); start(async () => { const r = await saveWorkflowAction(tenantId, wf.id, { name: next.name, status: next.status, trigger: next.trigger, steps: next.steps }); if (r) setWf(r); }); };
  const sid = () => `s_${wf.steps.length}_${(wf.steps.length + 3) * 17 % 9999}`;
  const addStep = (type: StepType) => { const def = STEP_DEFS.find((s) => s.type === type)!; save({ ...wf, steps: [...wf.steps, { id: sid(), type, label: def.label, config: def.gated ? { gated: true } : {} }] }); setAdding(false); };
  const removeStep = (id: string) => save({ ...wf, steps: wf.steps.filter((s) => s.id !== id) });
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= wf.steps.length) return; const steps = [...wf.steps]; [steps[i], steps[j]] = [steps[j], steps[i]]; save({ ...wf, steps }); };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href={`/tenants/${tenantId}/automations`} className="text-sm text-slate-500 hover:text-slate-700">← Workflows</Link>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${wf.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{wf.status}</span>
          <button onClick={() => save({ ...wf, status: wf.status === "published" ? "draft" : "published" })} disabled={pending}
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">
            {wf.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      <input value={wf.name} onChange={(e) => setWf({ ...wf, name: e.target.value })} onBlur={() => save(wf)}
        className="mb-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900" />
      <p className="mb-6 text-xs text-slate-400">Publishing approves this workflow&apos;s definition — the automation engine that enrolls contacts and runs steps is coming next, and send/SMS steps will always require connected channels + your approval before anything goes out.</p>

      {/* trigger */}
      <div className="rounded-xl border border-[#1e3a8a]/30 bg-[#1e3a8a]/5 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#1e3a8a]">Trigger</div>
        <select value={wf.trigger.type} onChange={(e) => { const t = TRIGGERS.find((x) => x.type === e.target.value as TriggerType)!; save({ ...wf, trigger: { type: t.type, label: t.label } }); }}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {TRIGGERS.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
      </div>

      {/* steps */}
      <div className="mt-2 flex flex-col items-center">
        {wf.steps.map((s, i) => (
          <div key={s.id} className="w-full">
            <div className="mx-auto h-4 w-px bg-slate-300" />
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{i + 1}</span>
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.label}</div>
                  <div className="text-[11px] text-slate-400">{s.type}{isGated(s.type) && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-700">needs approval</span>}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0 || pending} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === wf.steps.length - 1 || pending} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:opacity-30">▼</button>
                <button onClick={() => removeStep(s.id)} className="rounded border border-slate-200 px-2 py-1 text-xs text-red-600">✕</button>
              </div>
            </div>
          </div>
        ))}
        <div className="mx-auto h-4 w-px bg-slate-300" />
        {adding ? (
          <div className="flex flex-wrap justify-center gap-1 rounded-xl border border-slate-200 bg-white p-3">
            {STEP_DEFS.map((d) => <button key={d.type} onClick={() => addStep(d.type)} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">{d.label}</button>)}
            <button onClick={() => setAdding(false)} className="px-2 text-xs text-slate-400">cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="rounded-full border border-dashed border-slate-300 px-5 py-2 text-sm text-slate-500 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">＋ Add step</button>
        )}
      </div>
    </div>
  );
}
