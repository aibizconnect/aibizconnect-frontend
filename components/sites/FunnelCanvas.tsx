"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addStepAction, deleteStepAction, reorderStepAction, generateFunnelAction, cloneStepAction, publishStepAction, unpublishStepAction } from "@/app/tenants/[tenantId]/sites/funnels/actions";
import { STEP_TYPES, STEP_LABEL, type Funnel, type FunnelStep, type StepType } from "@/lib/funnels";

/**
 * Funnel v2 — GHL-style: step list (left) + step-detail pane (right) with
 * Overview / Products / Publishing sub-tabs. Edit opens the step in the real builder
 * (?pageId deep-link); per-step Publish runs the O-3 critic gate; Clone/Delete; one-shot
 * AI generation. Drafts only; checkout never auto-charges.
 */
export default function FunnelCanvas({ tenantId, initial }: { tenantId: string; initial: Funnel }) {
  const [funnel, setFunnel] = useState<Funnel>(initial);
  const [selId, setSelId] = useState<string | null>(initial.steps[0]?.id ?? null);
  const [tab, setTab] = useState<"overview" | "products" | "publishing">("overview");
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const sel = funnel.steps.find((s) => s.id === selId) ?? null;
  const apply = (p: Promise<Funnel | null>) => start(async () => { const f = await p; if (f) { setFunnel(f); if (!f.steps.some((s) => s.id === selId)) setSelId(f.steps[0]?.id ?? null); } });

  function publish(step: FunnelStep) {
    setMsg(null);
    start(async () => {
      const r = await publishStepAction(tenantId, funnel.id, step.id);
      if (r.funnel) setFunnel(r.funnel);
      setMsg(r.ok ? `Published "${step.title}" (critic ${r.score}/100).` : `Blocked: ${r.reason}${r.score != null ? ` (score ${r.score})` : ""}.`);
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{funnel.name}</h1>
          <p className="text-sm text-slate-500">{funnel.steps.length} steps · drafts only — publish each step when ready.</p>
        </div>
        <Link href={`/tenants/${tenantId}/sites/funnels`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Funnels</Link>
      </div>

      {msg && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{msg}</div>}

      {funnel.steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Empty funnel. Let AI draft a complete funnel:</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={() => apply(generateFunnelAction(tenantId, funnel.id, "lead"))} disabled={pending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">✨ Lead funnel</button>
            <button onClick={() => apply(generateFunnelAction(tenantId, funnel.id, "sales"))} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">✨ Sales funnel</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* step list */}
          <div>
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {funnel.steps.map((s, i) => (
                <div key={s.id}>
                  <button onClick={() => { setSelId(s.id); setTab("overview"); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${selId === s.id ? "bg-[#1e3a8a]/10 text-[#1e3a8a]" : "hover:bg-slate-50"}`}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-[11px] font-bold text-slate-500">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.title}</span>
                      <span className="block text-[10px] uppercase text-slate-400">{STEP_LABEL[s.stepType]}</span>
                    </span>
                    <span className={`h-2 w-2 rounded-full ${s.isPublic ? "bg-emerald-500" : "bg-amber-400"}`} />
                  </button>
                  {i < funnel.steps.length - 1 && <div className="mx-auto h-3 w-px bg-slate-200" />}
                </div>
              ))}
            </div>
            {adding ? (
              <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-2">
                {STEP_TYPES.map((t) => <button key={t} onClick={() => { setAdding(false); apply(addStepAction(tenantId, funnel.id, t as StepType)); }} className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">{STEP_LABEL[t]}</button>)}
                <button onClick={() => setAdding(false)} className="px-2 text-xs text-slate-400">cancel</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">＋ Add new step</button>
            )}
          </div>

          {/* detail pane */}
          {sel && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="font-medium text-slate-900">{sel.title} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{STEP_LABEL[sel.stepType]}</span></div>
                <div className="flex gap-4 text-sm">
                  {(["overview", "products", "publishing"] as const).map((k) => (
                    <button key={k} onClick={() => setTab(k)} className={`capitalize ${tab === k ? "font-medium text-[#1e3a8a]" : "text-slate-500 hover:text-slate-700"}`}>{k}</button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                {tab === "overview" && (
                  <div>
                    <div className="mb-3 font-mono text-[11px] text-slate-400">/{sel.slug}</div>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <div className="h-32 bg-gradient-to-br from-[#0f1b33] to-[#1e3a8a]" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/tenants/${tenantId}/website/builder?pageId=${sel.id}`} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Edit in builder</Link>
                      <a href={`/tenants/${tenantId}/website/preview/${sel.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Preview</a>
                      <button onClick={() => apply(cloneStepAction(tenantId, funnel.id, sel.id))} disabled={pending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Clone step</button>
                      <button onClick={() => apply(reorderStepAction(tenantId, funnel.id, sel.id, "up"))} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-30">▲</button>
                      <button onClick={() => apply(reorderStepAction(tenantId, funnel.id, sel.id, "down"))} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-30">▼</button>
                      <button onClick={() => { if (confirm("Delete this step?")) apply(deleteStepAction(tenantId, funnel.id, sel.id)); }} className="ml-auto rounded-lg border border-slate-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                )}

                {tab === "products" && (
                  <div className="text-sm text-slate-500">
                    {sel.stepType === "checkout" || sel.stepType === "upsell" || sel.stepType === "downsell" ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <p className="font-medium">Products &amp; payments</p>
                        <p className="mt-1">Attach products to this {STEP_LABEL[sel.stepType]} step. Checkout <strong>never auto-charges</strong> — live payments require connecting Stripe and your approval (financial boundary).</p>
                        <button disabled className="mt-3 cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-xs text-slate-500">Connect payments (coming soon)</button>
                      </div>
                    ) : <p>Products apply to checkout / upsell / downsell steps.</p>}
                  </div>
                )}

                {tab === "publishing" && (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sel.isPublic ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{sel.isPublic ? "Published" : "Draft"}</span>
                      <span className="text-xs text-slate-400">Publishing runs the AI quality gate (O-3) before going live.</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {sel.isPublic ? (
                        <>
                          <button onClick={() => apply(unpublishStepAction(tenantId, funnel.id, sel.id))} disabled={pending} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Unpublish</button>
                          <a href={`/sites/${tenantId}/${sel.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-emerald-600 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50">View live ↗</a>
                        </>
                      ) : (
                        <button onClick={() => publish(sel)} disabled={pending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">{pending ? "Checking…" : "Publish step"}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
