"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { editPageAI, generateSectionAI, createPage, type SitePage } from "@/app/tenants/[tenantId]/website/actions";

/**
 * AI Studio — a slim, AI-first companion to the full website editor (which it does NOT replace).
 * Very little chrome: a thin left rail (websites + pages + add page + the editor's menu), a live
 * preview, and an "Ask AI" box that changes the page in plain language. Multi-website / many-page.
 */
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export default function AiStudio({ tenantId, websiteId, websiteName, websites, pages: initialPages, initialPageId }:
  { tenantId: string; websiteId: string; websiteName: string; websites: { id: string; name: string }[]; pages: SitePage[]; initialPageId?: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<SitePage[]>(initialPages);
  // Focus the page we were opened on (PagesGrid "AI Edit" / new page), else home, else first.
  const [activeId, setActiveId] = useState<string>(
    (initialPageId && initialPages.some((p) => p.id === initialPageId) ? initialPageId : "") ||
    initialPages.find((p) => p.is_home)?.id || initialPages[0]?.id || "");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<null | "ai" | "add" | "section">(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [k, setK] = useState(0); // preview cache-buster

  const active = pages.find((p) => p.id === activeId) || null;
  const base = `/tenants/${tenantId}/website`;

  const refreshPreview = () => setK((x) => x + 1);

  const askAI = async () => {
    if (!active || !instruction.trim()) return;
    setBusy("ai"); setMsg(null);
    try { await editPageAI(active.id, tenantId, instruction); setInstruction(""); setMsg({ ok: true, t: "✓ Done — preview updated. (It's a draft until you publish from the full editor.)" }); refreshPreview(); }
    catch (e: any) { setMsg({ ok: false, t: e?.message ?? "AI edit failed." }); }
    setBusy(null);
  };
  const addSection = async () => {
    if (!active) return;
    const p = window.prompt("Describe the section to add (e.g. “a 3-step how-it-works”, “an FAQ about pricing”):");
    if (!p) return;
    setBusy("section"); setMsg(null);
    try { await generateSectionAI(active.id, tenantId, p); setMsg({ ok: true, t: "✓ Section added to the draft." }); refreshPreview(); }
    catch (e: any) { setMsg({ ok: false, t: e?.message ?? "Could not add section." }); }
    setBusy(null);
  };
  const addPage = async () => {
    const title = window.prompt("New page title (e.g. “Careers”):");
    if (!title) return;
    setBusy("add"); setMsg(null);
    try {
      const created = await createPage(tenantId, { title, slug: slug(title), websiteId });
      const np: SitePage = { id: created.id, title: created.title, slug: created.slug, is_home: created.is_home, is_public: false, order_index: created.order_index, hasDraft: false };
      setPages((ps) => [...ps, np]); setActiveId(created.id); setMsg({ ok: true, t: `✓ Added “${created.title}”. Use Ask AI to build it out.` });
    } catch (e: any) { setMsg({ ok: false, t: e?.message ?? "Could not add page." }); }
    setBusy(null);
  };

  const railBtn = (selected: boolean) => `block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm ${selected ? "bg-[#1e3a8a] text-white" : "text-slate-700 hover:bg-slate-100"}`;

  return (
    <div className="flex gap-4" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* ── slim left rail ── */}
      <aside className="w-56 flex-none">
        {websites.length > 1 && (
          <select value={websiteId} onChange={(e) => router.push(`${base}/${e.target.value}/studio`)}
            className="mb-3 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
        <div className="mb-1 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pages</span>
          <button type="button" onClick={addPage} disabled={busy === "add"} className="text-xs font-medium text-[#1e3a8a] hover:underline disabled:opacity-40">+ Add</button>
        </div>
        <nav className="space-y-0.5">
          {pages.map((p) => (
            <button key={p.id} type="button" onClick={() => { setActiveId(p.id); setMsg(null); }} className={railBtn(p.id === activeId)}>
              {p.is_home ? "🏠 " : ""}{p.title}{p.hasDraft ? " •" : ""}
            </button>
          ))}
        </nav>
        <div className="my-3 border-t border-slate-200" />
        <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">More</div>
        <nav className="mt-1 space-y-0.5 text-sm">
          {["SEO & GEO", "Occasions", "Settings"].map((m) => (
            <Link key={m} href={`${base}/${websiteId}`} className="block rounded-md px-2.5 py-1.5 text-slate-600 hover:bg-slate-100">{m} ↗</Link>
          ))}
        </nav>
      </aside>

      {/* ── main ── */}
      <section className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{active?.title ?? "No page"}</h2>
          {active && (
            <div className="flex items-center gap-3 text-xs">
              <a href={`/tenants/${tenantId}/website/preview/${active.id}`} target="_blank" rel="noreferrer" className="font-medium text-[#1e3a8a] hover:underline">Preview ↗</a>
              <Link href={`${base}/${websiteId}`} className="text-slate-500 hover:underline">Full editor ↗</Link>
            </div>
          )}
        </div>

        {/* Ask AI */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm font-semibold text-slate-800">Ask AI to change this page</label>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} disabled={!active}
            placeholder="e.g. Make the headline punchier and change the button to “Start free”. Add a testimonial from a happy customer."
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none disabled:bg-slate-50" />
          {msg && <div className={`mt-2 text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.t}</div>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={askAI} disabled={!active || busy === "ai" || !instruction.trim()} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "ai" ? "Working…" : "Ask AI"}</button>
            <button type="button" onClick={addSection} disabled={!active || busy === "section"} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">{busy === "section" ? "…" : "+ Add a section"}</button>
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {active ? (
            <iframe key={k} src={`/tenants/${tenantId}/website/preview/${active.id}?k=${k}`} title="Page preview" className="w-full" style={{ height: "calc(100vh - 360px)", minHeight: 480 }} />
          ) : (
            <div className="p-10 text-center text-sm text-slate-400">Add a page to get started.</div>
          )}
        </div>
      </section>
    </div>
  );
}
