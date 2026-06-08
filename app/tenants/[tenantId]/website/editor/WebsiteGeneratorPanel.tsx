"use client";

import { useState } from "react";
import { generateWebsitePlan, generateWebsiteDraft } from "../actions";
import type { SitePreviewPage } from "@/lib/agent/website-generator";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

/**
 * AI Website Generator (Path B — draft-only). Flow: brief -> Generate (plan PREVIEW) ->
 * review pages + sections -> "Looks good, create drafts" -> draft pages written. It never
 * publishes; everything lands as editable drafts the user reviews before going live.
 */
export default function WebsiteGeneratorPanel({
  tenantId, onApplied,
}: { tenantId: string; onApplied?: () => void }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ pages: SitePreviewPage[]; warnings: string[]; source?: string } | null>(null);
  const [done, setDone] = useState<{ created: { id: string; title: string; slug: string }[]; notes: string[] } | null>(null);

  async function onGenerate() {
    setBusy(true); setDone(null); setPreview(null);
    try {
      const p = await generateWebsitePlan(tenantId, brief);
      setPreview(p);
    } catch (e: any) { notifyError(e?.message ?? "Could not generate a plan."); }
    finally { setBusy(false); }
  }

  async function onCreate() {
    if (!preview) return;
    if (!(await confirmDialog(`Create ${preview.pages.length} draft page${preview.pages.length === 1 ? "" : "s"}? Nothing is published — you can edit everything first.`))) return;
    setBusy(true);
    try {
      const r = await generateWebsiteDraft(tenantId, { pages: preview.pages });
      setDone(r); setPreview(null); onApplied?.();
    } catch (e: any) { notifyError(e?.message ?? "Could not create the draft pages."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Generate Website</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          Describe the business and AI drafts a full multi‑page site. It creates <b>drafts only</b> — review &amp; edit before publishing.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Business brief</span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder="e.g. A boutique real‑estate brokerage in downtown Toronto specializing in luxury condos. Friendly, premium tone. Services: buying, selling, leasing, staging. Want Home, About, Services, Pricing, Contact."
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </label>

      <button
        onClick={onGenerate}
        disabled={busy || brief.trim().length < 8}
        className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy && !preview ? "Generating…" : "✨ Generate plan"}
      </button>

      {/* PLAN PREVIEW — pages + section outline. Nothing written yet. */}
      {preview && (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Plan preview · {preview.pages.length} pages</span>
            {preview.source && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">{preview.source === "llm" ? "AI" : "template"}</span>}
          </div>
          {preview.pages.map((pg, i) => (
            <div key={i} className="rounded-md border border-slate-200 bg-white px-2.5 py-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                {pg.isHome && <span className="rounded bg-[#1e3a8a] px-1 py-0.5 text-[9px] text-white">HOME</span>}
                {pg.title} <span className="text-[11px] font-normal text-slate-400">/{pg.slug}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {pg.sections.map((s, j) => (
                  <span key={j} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600" title={s.heading}>{s.type}</span>
                ))}
              </div>
            </div>
          ))}
          {preview.warnings.length > 0 && (
            <ul className="list-disc pl-4 text-[11px] text-amber-600">{preview.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          )}
          <div className="flex gap-2">
            <button onClick={onCreate} disabled={busy} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Creating…" : "✓ Looks good, create drafts"}
            </button>
            <button onClick={() => setPreview(null)} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Discard</button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {done && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-medium">Created {done.created.length} draft page{done.created.length === 1 ? "" : "s"} ✓</p>
          <ul className="mt-1 list-disc pl-4 text-[12px]">{done.created.map((p) => <li key={p.id}>{p.title} <span className="text-emerald-600">/{p.slug}</span></li>)}</ul>
          {done.notes.length > 0 && <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-600">{done.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          <p className="mt-1 text-[11px] text-emerald-700">Open them from Pages and edit — nothing is published yet.</p>
        </div>
      )}
    </div>
  );
}
