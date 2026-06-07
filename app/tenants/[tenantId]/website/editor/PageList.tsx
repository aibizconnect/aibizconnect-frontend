"use client";

import { useEffect, useState, useTransition } from "react";
import { listSitePages, createPage, duplicatePage, deletePage, renamePageDraft, canDeletePages, type SitePage } from "../actions";

/**
 * polished Pages panel (editor left column). Clean list: drag handle · file icon ·
 * page name · search · "+ Add new page". No scary inline Delete — Rename / Duplicate /
 * Delete live in a subtle ⋯ menu. All CRUD goes through SERVER ACTIONS (service-role)
 * so writes actually persist (the old version wrote via the RLS-blocked browser client).
 */
interface PageListProps {
  tenantId: string;
  websiteId?: string | null;
  reloadKey?: number;
  onSelectPage?: (pageId: string | null, page?: { id: string; slug: string; title: string; is_public?: boolean } | null) => void;
  canLeavePage?: () => boolean; // returns false to block switching (unsaved-changes guard)
  currentPageId?: string | null; // the page currently open in the editor
}

export default function PageList({ tenantId, websiteId, reloadKey, onSelectPage, canLeavePage, currentPageId }: PageListProps) {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  useEffect(() => { if (currentPageId) setSelectedId(currentPageId); }, [currentPageId]);
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [canDelete, setCanDelete] = useState(false); // does THIS user have delete rights?
  const [pending, start] = useTransition();

  const reload = () => start(async () => setPages(await listSitePages(tenantId, websiteId ?? undefined)));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [tenantId, reloadKey]);
  useEffect(() => { canDeletePages(tenantId).then(setCanDelete).catch(() => setCanDelete(false)); }, [tenantId]);

  function select(p: SitePage) {
    if (p.id === selectedId) return;
    // Unsaved-changes guard: confirm before leaving the current page.
    if (selectedId && canLeavePage && !canLeavePage()) return;
    setSelectedId(p.id);
    onSelectPage?.(p.id, { id: p.id, slug: p.slug, title: p.title, is_public: p.is_public });
  }

  function add() {
    const title = window.prompt("New page title?");
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    start(async () => {
      try { const p = await createPage(tenantId, { title, slug, websiteId: websiteId ?? undefined }); setPages(await listSitePages(tenantId, websiteId ?? undefined)); select({ ...p, is_public: false, hasDraft: true } as SitePage); }
      catch (e) { window.alert((e as Error).message); }
    });
  }
  function rename(p: SitePage) {
    setMenuFor(null);
    const title = window.prompt("Rename page", p.title);
    if (!title || title === p.title) return;
    start(async () => { await renamePageDraft(p.id, tenantId, title); setPages(await listSitePages(tenantId, websiteId ?? undefined)); });
  }
  function dup(p: SitePage) { setMenuFor(null); start(async () => { await duplicatePage(p.id, tenantId); setPages(await listSitePages(tenantId, websiteId ?? undefined)); }); }
  function del(p: SitePage) {
    setMenuFor(null);
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    start(async () => {
      try {
        await deletePage(p.id, tenantId); // secure-delete guard runs server-side
        setPages((prev) => prev.filter((x) => x.id !== p.id));
        if (selectedId === p.id) onSelectPage?.(null, null);
      } catch (e: any) {
        alert(e?.message ?? "You can't delete this page.");
      }
    });
  }

  const filtered = pages.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      {/* search */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full bg-transparent text-slate-700 outline-none" />
      </div>

      {/* page list */}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {filtered.map((p) => (
          <div key={p.id}
            className={`group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${selectedId === p.id ? "bg-[#1e3a8a]/8 text-[#1e3a8a]" : "text-slate-700 hover:bg-slate-50"}`}>
            <span className="cursor-grab text-slate-300" title="Drag to reorder">⠿</span>
            <button onClick={() => select(p)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0 text-slate-400"><path d="M6 2h9l5 5v15H6zM15 2v5h5" /></svg>
              <span className="truncate">{p.title}</span>
              {p.is_home && <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] uppercase text-amber-700">home</span>}
            </button>
            <button onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}
              className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100">⋯</button>

            {/* Small, deliberately-subtle delete affordance on the RIGHT of each page row.
                Only rendered for users who actually have delete rights (sole user / admin /
                owner / granted). It's tiny and nearly invisible until you hover/focus the row
                and then the control itself — so it can't be clicked by accident. Home pages
                never show it (must reassign Home first). Users without rights see nothing and
                must ask their admin. */}
            {canDelete && !p.is_home && (
              <button
                onClick={() => del(p)}
                title={`Delete "${p.title}" (focus to confirm)`}
                aria-label={`Delete ${p.title}`}
                className="ml-0.5 shrink-0 rounded p-0.5 text-red-500 opacity-60 outline-none transition group-hover:opacity-80 hover:!opacity-100 hover:text-red-600 focus-visible:opacity-100 focus-visible:text-red-700 focus-visible:ring-1 focus-visible:ring-red-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
              </button>
            )}

            {menuFor === p.id && (
              <div className="absolute right-2 top-9 z-10 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                <button onClick={() => rename(p)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Rename</button>
                <button onClick={() => dup(p)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Duplicate</button>
                {p.is_home ? (
                  <div className="block w-full px-3 py-2 text-left text-[11px] text-slate-400" title="Set another page as Home first">Delete (set a new Home first)</div>
                ) : canDelete ? (
                  <button onClick={() => del(p)} className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Delete</button>
                ) : (
                  <div className="block w-full px-3 py-2 text-left text-[11px] text-slate-400" title="Ask an admin to grant delete access">Delete (ask your admin)</div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">No pages found.</p>}
      </div>

      {/* add */}
      <button onClick={add} disabled={pending}
        className="mt-3 w-full rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60">
        ＋ Add new page
      </button>
    </div>
  );
}
