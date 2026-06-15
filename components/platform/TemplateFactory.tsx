"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STITCH_PROMPTS } from "@/lib/sections/stitch-prompts";
import type { SectionTemplate } from "@/lib/server/section-templates";
import {
  listTemplatesAction, seedPrebuiltsAction, setStatusAction, deleteTemplateAction, importTemplateAction,
} from "@/app/platform/template-factory/actions";

/**
 * Section Template Factory admin UI (D-363..367). Three tabs:
 *  • Library — the shared section-template store (seed from prebuilts, approve/reject/delete).
 *  • Stitch prompts — the Gemini-authored prompts, copy-to-clipboard, to paste into Stitch.
 *  • Import — paste a translated SectionContent[] to land it as a template (manual path for now).
 */
const CATEGORIES = ["Headers", "Hero", "About & Services", "Team", "Features", "Social Proof", "Conversion", "Content", "Footers", "Contemporary Luxury", "Split / Photo"];
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]";

export default function TemplateFactory({ initial }: { initial: SectionTemplate[] }) {
  const [tab, setTab] = useState<"library" | "prompts" | "import">("library");
  const [rows, setRows] = useState<SectionTemplate[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => setRows(await listTemplatesAction().catch(() => rows));
  const byCategory = useMemo(() => {
    const m = new Map<string, SectionTemplate[]>();
    for (const t of rows) { const c = t.manifest.category || "Other"; (m.get(c) ?? m.set(c, []).get(c)!).push(t); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  async function seed() {
    setBusy("seed"); setMsg(null);
    const r = await seedPrebuiltsAction();
    setMsg(r.ok ? `Seeded ${r.inserted} template(s); ${r.skipped} already present.` : (r.error ?? "Seed failed."));
    await refresh(); setBusy(null);
  }

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Section Template Factory</h1>
          <p className="mt-1 text-sm text-slate-500">Build a shared library of section templates — seed from prebuilts, or generate with the Stitch prompts and import the result.</p>
        </div>
        <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-800">← Platform</Link>
      </div>

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {tabBtn("library", `Library (${rows.length})`)}
        {tabBtn("prompts", `Stitch prompts (${STITCH_PROMPTS.length})`)}
        {tabBtn("import", "Import")}
      </div>

      {msg && <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{msg}</div>}

      {tab === "library" && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-2">
            <button onClick={seed} disabled={busy === "seed"} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "seed" ? "Seeding…" : "Seed from prebuilts"}</button>
            <button onClick={refresh} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Refresh</button>
          </div>
          {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No templates yet — seed from prebuilts to populate the library.</p>}
          {byCategory.map(([cat, list]) => (
            <section key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat} <span className="text-slate-300">({list.length})</span></h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{t.manifest.name}</div>
                      <div className="truncate text-xs text-slate-400">{t.sections.length} section{t.sections.length === 1 ? "" : "s"} · {t.manifest.generatedBy ?? "factory"} · <span className={t.status === "active" ? "text-emerald-600" : "text-amber-600"}>{t.status}</span></div>
                    </div>
                    <div className="flex shrink-0 gap-1.5 text-xs">
                      {t.status !== "active"
                        ? <button onClick={async () => { await setStatusAction(t.id, "active"); await refresh(); }} className="rounded-lg border border-emerald-300 px-2 py-1 text-emerald-700">Approve</button>
                        : <button onClick={async () => { await setStatusAction(t.id, "rejected"); await refresh(); }} className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600">Hide</button>}
                      <button onClick={async () => { if (confirm(`Delete "${t.manifest.name}"?`)) { await deleteTemplateAction(t.id); await refresh(); } }} className="rounded-lg px-2 py-1 text-slate-400 hover:text-red-600">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "prompts" && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-slate-500">Paste a prompt into Stitch (generate from text), then bring the result back via the <b>Import</b> tab. Prompts are tuned to import cleanly into our elements.</p>
          {STITCH_PROMPTS.map((s) => (
            <div key={s.key} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-900">{s.label} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{s.category} · {s.variant}</span></div>
                <button onClick={() => { navigator.clipboard?.writeText(s.prompt).then(() => { setMsg(`Copied "${s.label}" prompt.`); }); }} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">Copy</button>
              </div>
              <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">{s.prompt}</pre>
            </div>
          ))}
        </div>
      )}

      {tab === "import" && <ImportTab onDone={async (m) => { setMsg(m); setTab("library"); await refresh(); }} />}
    </div>
  );
}

function ImportTab({ onDone }: { onDone: (msg: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Hero");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    const r = await importTemplateAction({ name, category, json });
    setBusy(false);
    if (r.ok) await onDone(`Imported "${name || "section"}" into the library.`);
    else setErr(r.error ?? "Import failed.");
  }
  return (
    <div className="mt-5 max-w-2xl space-y-3">
      <p className="text-sm text-slate-500">Paste a translated <code>SectionContent[]</code> (or one section) — e.g. the JSON produced by the Stitch import path — to land it as a reusable template.</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Hero — Centered + dual CTA" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Section JSON</span>
        <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={12} className={`${inp} font-mono text-xs`} placeholder='[{ "type": "row", "columns": 1, "children": [...] }]' /></label>
      {err && <div className="rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
      <button onClick={save} disabled={busy || !json.trim()} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Importing…" : "Import as template"}</button>
    </div>
  );
}
