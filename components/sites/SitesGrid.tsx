"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createPageAction, duplicatePageAction, deletePageAction, type SitePage } from "@/app/tenants/[tenantId]/sites/actions";

/**
 * polished Sites → Websites page-management grid. Cards per page (thumbnail, status,
 * Edit → builder, Preview, ⋮ Duplicate/Delete) + "Add new page". Data-only; new pages are
 * private drafts. Publishing still runs the O-3 critic gate in the editor.
 */
export default function SitesGrid({ tenantId, initialPages }: { tenantId: string; initialPages: SitePage[] }) {
  const [pages, setPages] = useState<SitePage[]>(initialPages);
  const [pending, start] = useTransition();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const editorHref = `/tenants/${tenantId}/website`;

  const act = (fn: () => Promise<{ pages: SitePage[] }>) => start(async () => { const r = await fn(); setPages(r.pages); setMenuFor(null); });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Websites</h1>
          <p className="text-sm text-slate-500">Manage the pages of your site. Edit in the builder, then publish when ready.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tenants/${tenantId}/sites/funnels`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Funnels</Link>
          <Link href={`/tenants/${tenantId}/sites/popups`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Popups</Link>
          <Link href={`/tenants/${tenantId}/sites/assets`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Saved Assets</Link>
          <button onClick={() => act(() => createPageAction(tenantId))} disabled={pending}
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1e40af] disabled:opacity-50">
            {pending ? "Working…" : "＋ Add new page"}
          </button>
        </div>
      </div>

      {/* sub-tabs (best-in-class) */}
      <div className="mb-6 flex gap-6 border-b border-slate-200 text-sm">
        <span className="-mb-px border-b-2 border-[#1e3a8a] pb-2 font-medium text-[#1e3a8a]">Pages</span>
        {["Stats", "Sales", "Security", "Events", "Settings"].map((t) => (
          <span key={t} className="pb-2 text-slate-400" title="Coming soon">{t}</span>
        ))}
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-500">No pages yet.</p>
          <button onClick={() => act(() => createPageAction(tenantId))} className="mt-3 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Create your first page</button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pages.map((p) => (
            <div key={p.id} className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between p-4 pb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900">{p.title}</span>
                    {p.is_home && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">home</span>}
                  </div>
                  <div className="truncate font-mono text-[11px] text-slate-400">/{p.slug}</div>
                </div>
                <button onClick={() => setMenuFor(menuFor === p.id ? null : p.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100">⋮</button>
              </div>

              {/* thumbnail placeholder */}
              <Link href={editorHref} className="mx-4 block overflow-hidden rounded-lg border border-slate-100">
                <div className="h-28 bg-gradient-to-br from-[#0f1b33] to-[#1e3a8a]" />
              </Link>

              <div className="flex items-center justify-between gap-2 p-4">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.is_public ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {p.is_public ? "Published" : "Draft"}
                </span>
                <div className="flex gap-2">
                  <Link href={editorHref} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e40af]">Edit</Link>
                  <Link href={`/sites/${tenantId}/${p.slug}`} target="_blank" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">↗</Link>
                </div>
              </div>

              {menuFor === p.id && (
                <div className="absolute right-3 top-12 z-10 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button onClick={() => act(() => duplicatePageAction(tenantId, p.id))} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Duplicate</button>
                  <button onClick={() => { if (confirm(`Delete "${p.title}"? This cannot be undone.`)) act(() => deletePageAction(tenantId, p.id)); }}
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
