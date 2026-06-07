"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listWebsiteSuggestions, addSuggestedPage, refineWebsiteContext } from "../wizard-actions";

/**
 * Post-build refine panel (Ali): after the lean 2-page start, surface the AI's
 * remaining suggested pages as one-click adds, and let the user tweak the context
 * (audience / services) the AI used, then regenerate added pages from it.
 */
export default function SuggestedPagesPanel({ tenantId, websiteId }: { tenantId: string; websiteId: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<string[]>([]);
  const [audience, setAudience] = useState("");
  const [services, setServices] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    listWebsiteSuggestions(tenantId, websiteId).then((s) => {
      setPages(s.suggestedPages); setAudience(s.audience); setServices(s.services); setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [tenantId, websiteId]);

  const add = (title: string) => {
    setBusy(title);
    start(async () => {
      const r = await addSuggestedPage(tenantId, websiteId, title);
      setBusy(null);
      if (r.ok) { setPages((p) => p.filter((t) => t !== title)); router.refresh(); }
    });
  };

  const saveContext = () => {
    start(async () => {
      await refineWebsiteContext(tenantId, websiteId, { audience, services });
      setSavedMsg("Saved — new pages will use this."); setTimeout(() => setSavedMsg(null), 2500);
    });
  };

  if (!loaded || (pages.length === 0 && !refineOpen)) {
    // Still offer the refine toggle even when no suggestions remain.
    if (loaded && pages.length === 0) {
      return (
        <div className="mb-4 text-right">
          <button onClick={() => setRefineOpen(true)} className="text-xs font-medium text-[#1e3a8a] hover:underline">Refine what the AI knows ✎</button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-5 rounded-xl border border-[#1e3a8a]/20 bg-[#1e3a8a]/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">✨ Add more pages the AI suggested</h3>
          <p className="mt-0.5 text-xs text-slate-500">We started lean with Home + Contact. Add any of these — each is drafted from your site&apos;s learned content + images.</p>
        </div>
        <button onClick={() => setRefineOpen((v) => !v)} className="flex-none text-xs font-medium text-[#1e3a8a] hover:underline">{refineOpen ? "Hide" : "Refine ✎"}</button>
      </div>

      {pages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pages.map((t) => (
            <button key={t} disabled={busy === t} onClick={() => add(t)}
              className="rounded-full border border-[#1e3a8a]/40 bg-white px-3 py-1.5 text-xs font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-50">
              {busy === t ? "Adding…" : `+ ${t}`}
            </button>
          ))}
        </div>
      )}

      {refineOpen && (
        <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target audience</label>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who you serve" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Services / what you offer</label>
            <textarea rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" value={services} onChange={(e) => setServices(e.target.value)} placeholder="What you offer" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveContext} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90">Save context</button>
            {savedMsg && <span className="text-xs text-emerald-600">{savedMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
