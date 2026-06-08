"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createFunnelAction, deleteFunnelAction } from "@/app/tenants/[tenantId]/sites/funnels/actions";
import type { Funnel } from "@/lib/funnels";
import { confirmDialog } from "@/lib/ui/dialogs";

export default function FunnelsList({ tenantId, initial }: { tenantId: string; initial: Funnel[] }) {
  const [funnels, setFunnels] = useState<Funnel[]>(initial);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();

  const create = () => start(async () => { const r = await createFunnelAction(tenantId, name || "New funnel"); if (r.ok) { setName(""); setFunnels(r.funnels); } });
  const del = async (id: string) => { if (await confirmDialog("Delete this funnel and its steps?", { danger: true, confirmText: "Delete" })) start(async () => setFunnels((await deleteFunnelAction(tenantId, id)).funnels)); };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Funnels</h1>
          <p className="text-sm text-slate-500">Multi-step journeys — landing → offer → checkout → thank-you. AI drafts them; you publish.</p>
        </div>
        <Link href={`/tenants/${tenantId}/sites`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Websites</Link>
      </div>

      <div className="mb-6 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New funnel name" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={create} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">＋ New funnel</button>
      </div>

      {funnels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No funnels yet. Create one, then let AI draft the steps.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {funnels.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-900">{f.name}</div>
                  <div className="text-xs text-slate-400">{f.steps.length} step{f.steps.length === 1 ? "" : "s"} · {f.status}</div>
                </div>
                <button onClick={() => del(f.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {f.steps.length === 0 ? <span className="text-xs text-slate-400">empty</span> :
                  f.steps.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5">{s.stepType}</span>{i < f.steps.length - 1 && <span>→</span>}
                    </span>
                  ))}
              </div>
              <Link href={`/tenants/${tenantId}/sites/funnels/${f.id}`} className="mt-4 block rounded-lg bg-[#1e3a8a] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[#1e40af]">Open builder</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
