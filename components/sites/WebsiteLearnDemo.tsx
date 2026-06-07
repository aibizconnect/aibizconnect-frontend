"use client";

import { useState } from "react";
import { analyzeIntake, analyzeBusiness, classifyMainPagesStep, type IntakeResult, type BusinessAnalysisResult, type ClassifyMainPagesResult } from "@/app/tenants/[tenantId]/website/pipeline-actions";

/**
 * "Learn a site" demo — paste a URL and watch the AI-first pipeline run Step 0 (intake gate),
 * Step 1a (business analysis), Step 1b (classify + content-verify main pages). Read-only: it
 * uses a throwaway pipeline id and urlOverride, so nothing is created and no AI image spend.
 */
export default function WebsiteLearnDemo({ tenantId }: { tenantId: string }) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  const [profile, setProfile] = useState<BusinessAnalysisResult | null>(null);
  const [pages, setPages] = useState<ClassifyMainPagesResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null); setIntake(null); setProfile(null); setPages(null);
    const websiteId = (globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}`);
    try {
      setStage("Validating the link…");
      const i = await analyzeIntake(tenantId, websiteId, url);
      setIntake(i);
      if (i.status !== "passed") { setStage(null); return; }

      setStage("Analyzing the business (AI)…");
      const p = await analyzeBusiness(tenantId, websiteId, url);
      setProfile(p);

      setStage("Finding & verifying the real main pages…");
      const pg = await classifyMainPagesStep(tenantId, websiteId, url);
      setPages(pg);
      setStage(null);
    } catch (e: any) { setErr(e?.message ?? "Something went wrong."); setStage(null); }
  }

  const prof = (profile?.profile ?? {}) as Record<string, any>;
  const Badge = ({ ok }: { ok: boolean }) => <span className={ok ? "text-emerald-600" : "text-rose-600"}>{ok ? "✓" : "✕"}</span>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Learn a website</h1>
      <p className="mt-1 text-sm text-slate-500">Paste any business website — the AI reads it: validates it, extracts the business, and lists the real main pages (ignoring shop/blog/system pages).</p>

      <div className="mt-5 flex gap-2">
        <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) run(); }}
          placeholder="example.com" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={run} disabled={!url.trim() || !!stage}
          className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">
          {stage ? "Working…" : "Analyze"}
        </button>
      </div>
      {stage && <p className="mt-3 text-sm text-[#1e3a8a]">⏳ {stage}</p>}
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

      {/* Step 0 — intake gate */}
      {intake && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Step 0 — Intake gate {intake.status === "passed" ? "✅" : "⛔"}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {intake.checks.map((c) => <li key={c.id}><Badge ok={c.pass} /> {c.assertion}{c.detail ? <span className="text-slate-400"> · {c.detail}</span> : null}</li>)}
            {!intake.checks.length && intake.errors.map((e) => <li key={e.id}><Badge ok={false} /> {e.assertion}</li>)}
          </ul>
        </section>
      )}

      {/* Step 1a — business profile */}
      {profile && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Step 1a — Business profile {profile.status === "passed" ? "✅" : "⚠️"}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {[["Business", prof.business_name], ["Industry", prof.industry], ["Services", (prof.services_products ?? []).join(", ")], ["Audience", prof.audience], ["Tone", prof.tone], ["Location", prof.location], ["Brand color", (prof.brand_colors ?? [])[0]], ["Template", prof.template_family]].map(([k, v]) => (
              <div key={k as string} className="flex gap-2"><dt className="w-24 shrink-0 text-slate-400">{k}</dt><dd className="text-slate-700">{v || "—"}</dd></div>
            ))}
          </dl>
          {!!profile.checks.length && (
            <ul className="mt-3 space-y-0.5 text-xs text-slate-500">{profile.checks.map((c) => <li key={c.id}><Badge ok={c.pass} /> {c.assertion}</li>)}</ul>
          )}
        </section>
      )}

      {/* Step 1b — main pages */}
      {pages && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Step 1b — Real main pages found: {pages.count} {pages.status === "passed" ? "✅" : "⚠️"}</h2>
          <ul className="mt-2 divide-y divide-slate-100">
            {pages.mainPages.map((p) => (
              <li key={p.url} className="flex items-center gap-2 py-1.5 text-sm">
                <Badge ok={p.verified_content_present} />
                <span className="font-medium text-slate-700">{p.title}</span>
                <span className="truncate text-xs text-slate-400">{p.url}</span>
              </li>
            ))}
            {!pages.mainPages.length && <li className="py-2 text-sm text-slate-400">No verified main pages found.</li>}
          </ul>
          <p className="mt-2 text-xs text-slate-400">✓ = content verified (hero + sections + CTA). Next step (1c) extracts these into reusable blocks.</p>
        </section>
      )}
    </div>
  );
}
