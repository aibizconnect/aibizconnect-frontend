"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listSiteTemplatesForTenant, createSiteFromTemplate, type SiteTemplateCard } from "@/app/tenants/[tenantId]/sites/site-template-actions";

/**
 * "Start from a template" (D-364) — pick a seeded site template, name the site, and we create a
 * new (blank) website + apply the full template (chrome + menu + brand + starter pages), then open
 * the editor. Always operates on a fresh site, so it never clobbers existing content.
 */
export default function StartFromTemplate({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<SiteTemplateCard[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open && cards === null) listSiteTemplatesForTenant(tenantId).then(setCards).catch(() => setCards([])); }, [open, cards, tenantId]);

  async function go() {
    if (!picked) { setErr("Pick a template first."); return; }
    if (!name.trim()) { setErr("Name your new website."); return; }
    setBusy(true); setErr(null);
    const r = await createSiteFromTemplate(tenantId, name.trim(), picked);
    setBusy(false);
    if (r.ok && r.websiteId) router.push(`/tenants/${tenantId}/website/${r.websiteId}`);
    else setErr(r.message ?? "Could not create the site.");
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-[#1e3a8a] px-4 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">✨ Start from a template</button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Start from a template</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-slate-700">Close</button>
      </div>
      {cards === null ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading templates…</p>
      ) : cards.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No site templates yet — a platform admin can seed them in /platform/template-factory → Site templates.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <button key={c.id} onClick={() => setPicked(c.id)} className={`rounded-xl border p-4 text-left transition ${picked === c.id ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                {c.blurb && <div className="mt-0.5 text-xs text-slate-500">{c.blurb}</div>}
                <div className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{c.industry.replace(/_/g, " ")} · {c.pages} pages</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New website name (e.g. On Dream Homes)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
            <button onClick={go} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Building…" : "Create site"}</button>
          </div>
          {err && <div className="mt-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
          <p className="mt-2 text-xs text-slate-400">Creates a new website and applies the template — header/footer chrome, menu, brand, and starter pages — then opens the editor.</p>
        </>
      )}
    </div>
  );
}
