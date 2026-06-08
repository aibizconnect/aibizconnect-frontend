"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createWorkflowAction, deleteWorkflowAction, generateWorkflowAction } from "@/app/tenants/[tenantId]/automations/actions";
import type { Workflow } from "@/lib/workflows";
import { confirmDialog } from "@/lib/ui/dialogs";

export default function WorkflowsList({ tenantId, initial }: { tenantId: string; initial: Workflow[] }) {
  const [wfs, setWfs] = useState<Workflow[]>(initial);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const create = () => start(async () => { const r = await createWorkflowAction(tenantId, name || "New workflow"); if (r.ok) { setName(""); setWfs(r.workflows); } });
  const gen = (k: "nurture" | "scoring" | "booking") => start(async () => setWfs((await generateWorkflowAction(tenantId, k)).workflows));
  const del = async (id: string) => { if (await confirmDialog("Delete this workflow?", { danger: true, confirmText: "Delete" })) start(async () => setWfs((await deleteWorkflowAction(tenantId, id)).workflows)); };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Automation</h1>
          <p className="text-sm text-slate-500">Workflows that run themselves — AI drafts them; nothing sends until you connect channels &amp; approve.</p>
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New workflow name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={create} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">＋ Create</button>
        </div>
      </div>

      {/* AI build */}
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
        <div className="text-sm font-medium text-indigo-900">✨ Build with AI</div>
        <p className="mb-3 text-xs text-indigo-700/70">Generate a complete, on-brand workflow in one click.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => gen("nurture")} disabled={pending} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm hover:border-indigo-400 disabled:opacity-50">Lead nurture</button>
          <button onClick={() => gen("scoring")} disabled={pending} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm hover:border-indigo-400 disabled:opacity-50">Lead scoring (ABC)</button>
          <button onClick={() => gen("booking")} disabled={pending} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm hover:border-indigo-400 disabled:opacity-50">Appointment follow-up</button>
        </div>
      </div>

      {wfs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No workflows yet. Create one or let AI draft a starter.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Trigger</th><th className="px-4 py-3">Steps</th><th className="px-4 py-3">Enrolled</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {wfs.map((w) => (
                <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/tenants/${tenantId}/automations/${w.id}`} className="font-medium text-[#1e3a8a] hover:underline">{w.name}</Link></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${w.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{w.status}</span></td>
                  <td className="px-4 py-3 text-slate-600">{w.trigger?.label ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{w.steps.length}</td>
                  <td className="px-4 py-3 text-slate-600">{w.enrolled}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => del(w.id)} className="text-xs text-red-500 hover:underline">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
