"use client";

import { useState } from "react";
import Link from "next/link";
import { analyzeIntake, analyzeBusiness, classifyMainPagesStep } from "@/app/tenants/[tenantId]/website/pipeline-actions";
import { generateSite, type GenerateResult } from "@/app/tenants/[tenantId]/website/generate-actions";

/**
 * Build my site — runs the full AI pipeline against the tenant's REAL website id (persisting), then
 * generateSite (1c → blocks → tree → lean build). Shows every Supervisor check and links to the
 * editor to review the drafts. Drafts-only — nothing publishes.
 */
export default function GenerateSiteFlow({ tenantId, websiteId }: { tenantId: string; websiteId: string | null }) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const Badge = ({ ok }: { ok: boolean }) => <span className={ok ? "text-emerald-600" : "text-rose-600"}>{ok ? "✓" : "✕"}</span>;

  async function run() {
    if (!websiteId) { setErr("No website found for this account yet."); return; }
    setErr(null); setResult(null);
    try {
      setStage("Validating your link…");
      const i = await analyzeIntake(tenantId, websiteId, url);
      if (i.status !== "passed") { setErr("The link didn't pass the intake check. Try your homepage URL."); setStage(null); return; }

      setStage("Reading your business (AI)…");
      await analyzeBusiness(tenantId, websiteId, url);

      setStage("Finding your real main pages…");
      const pg = await classifyMainPagesStep(tenantId, websiteId, url);
      if (pg.status !== "passed") { setErr("Couldn't verify your main pages. Try a site with clear Home/About/Services/Contact pages."); setStage(null); return; }

      setStage("Building your superior, on-brand site…");
      const r = await generateSite(tenantId, websiteId);
      setResult(r);
      setStage(null);
    } catch (e: any) { setErr(e?.message ?? "Something went wrong."); setStage(null); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Build my website</h1>
      <p className="mt-1 text-sm text-slate-500">Paste your current website (or a social link). The AI learns it, then builds a better, on-brand draft — your real pages rebuilt cleanly, plus funnel &amp; SEO pages. Nothing is published; you review everything in the editor.</p>

      <div className="mt-5 flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) run(); }}
          placeholder="yourbusiness.com" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={run} disabled={!url.trim() || !!stage}
          className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{stage ? "Working…" : "Build my site"}</button>
      </div>
      {stage && <p className="mt-3 text-sm text-[#1e3a8a]">⏳ {stage}</p>}
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          <div className={`rounded-xl border p-4 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{result.ok ? "Your site is built (draft) 🎉" : "Built with some gaps"}</h2>
              <span className="text-sm font-medium text-slate-600">{result.createdPages.length} pages</span>
            </div>
            {result.message && <p className="mt-1 text-xs text-slate-500">{result.message}</p>}
            <div className="mt-3 flex gap-2">
              <Link href={`/tenants/${tenantId}/website/${websiteId}`} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Open in editor →</Link>
            </div>
          </div>

          {result.steps.map((s) => (
            <section key={s.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold capitalize text-slate-800">{s.key.replace(/_/g, " ")}</h3>
              <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
                {s.checks.map((c) => <li key={c.id}><Badge ok={c.pass} /> {c.assertion}{c.detail ? <span className="text-slate-400"> · {c.detail}</span> : null}</li>)}
              </ul>
            </section>
          ))}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Pages created</h3>
            <ul className="mt-2 divide-y divide-slate-100">
              {result.createdPages.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="font-medium text-slate-700">{p.title}</span>
                  <span className="text-xs text-slate-400">/{p.slug}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
