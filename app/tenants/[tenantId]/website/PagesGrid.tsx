"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyError, confirmDialog, promptDialog } from "@/lib/ui/dialogs";
import {
  listSitePages, createPage, deletePage, duplicatePage, renamePageDraft, setHomePage,
  type SitePage,
} from "./actions";

// Cohesive, on-brand gradient palette (blues/cyans/violets/teals). Cards cycle
// through it by index → colorful + varied, but uniform in look.
const GRADS = [
  "from-[#2563eb] to-[#22d3ee]",
  "from-[#6366f1] to-[#a855f7]",
  "from-[#0ea5e9] to-[#22d3ee]",
  "from-[#8b5cf6] to-[#3b82f6]",
  "from-[#0891b2] to-[#3b82f6]",
  "from-[#7c3aed] to-[#2563eb]",
  "from-[#06b6d4] to-[#3b82f6]",
  "from-[#4f46e5] to-[#06b6d4]",
];

/** A uniform "website preview" wireframe drawn on the card's gradient — gives every
 * thumbnail a designed, stylish look without per-page assets. */
function PageWire() {
  const w = "rgba(255,255,255,0.9)", w5 = "rgba(255,255,255,0.45)", w2 = "rgba(255,255,255,0.22)";
  return (
    <svg viewBox="0 0 320 150" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      {/* browser bar */}
      <rect x="40" y="20" width="240" height="112" rx="8" fill="rgba(255,255,255,0.10)" stroke={w2} />
      <circle cx="52" cy="32" r="3" fill={w5} /><circle cx="62" cy="32" r="3" fill={w5} /><circle cx="72" cy="32" r="3" fill={w5} />
      {/* hero */}
      <rect x="52" y="46" width="120" height="10" rx="3" fill={w} />
      <rect x="52" y="62" width="80" height="6" rx="3" fill={w5} />
      <rect x="52" y="76" width="44" height="13" rx="4" fill={w} />
      {/* cards row */}
      <rect x="188" y="46" width="80" height="56" rx="6" fill="rgba(255,255,255,0.16)" stroke={w2} />
      <rect x="52" y="102" width="64" height="20" rx="5" fill={w2} />
      <rect x="124" y="102" width="64" height="20" rx="5" fill={w2} />
      <rect x="196" y="108" width="72" height="6" rx="3" fill={w5} />
      <rect x="196" y="120" width="52" height="6" rx="3" fill={w2} />
    </svg>
  );
}

/**
 * Live page thumbnail: a real, scaled-down iframe of the page's preview (embed mode,
 * so no editor chrome). Measures its own width and scales a 1280px-wide render to fit,
 * showing the top of the page. Falls back to the gradient + wireframe motif while the
 * iframe loads (and if it never does). pointer-events disabled so the card stays
 * clickable. lazy-loaded so off-screen cards don't fetch until scrolled into view.
 */
function PageThumb({ src, grad, title }: { src: string; grad: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [loaded, setLoaded] = useState(false);
  const BASE_W = 1280;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => { if (el.clientWidth) setScale(el.clientWidth / BASE_W); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative h-56 w-full overflow-hidden bg-gradient-to-br ${grad}`}>
      {/* Loading / fallback motif (covered by the iframe once it paints). */}
      {!loaded && <PageWire />}
      <iframe
        src={src}
        title={`${title} preview`}
        loading="lazy"
        scrolling="no"
        onLoad={() => setLoaded(true)}
        tabIndex={-1}
        aria-hidden
        style={{
          width: `${BASE_W}px`,
          height: `${224 / scale}px`, // fill the 14rem (224px) box height after scaling
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          border: 0,
          pointerEvents: "none",
          background: "#fff",
          opacity: loaded ? 1 : 0,
          transition: "opacity .25s",
        }}
      />
    </div>
  );
}

/**
 * polished Pages grid. Each page is a card with a live thumbnail (scaled iframe of
 * the page preview), an Edit button (opens the builder), an open-in-new preview, and
 * a ⋮ menu (Rename · Duplicate · Set as home · Delete). "+ Add new page" creates one.
 * All CRUD goes through SERVER ACTIONS (service-role) so writes actually persist.
 */
export default function PagesGrid({ tenantId, initial, websiteId }: { tenantId: string; initial: SitePage[]; websiteId?: string }) {
  const [pages, setPages] = useState<SitePage[]>(initial);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const refresh = () => start(async () => setPages(await listSitePages(tenantId, websiteId)));

  const add = async () => {
    const title = await promptDialog("New page title?");
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    start(async () => {
      try {
        const p = await createPage(tenantId, { title, slug, websiteId });
        setPages(await listSitePages(tenantId, websiteId));
        router.push(`/tenants/${tenantId}/website/builder?pageId=${p.id}`);
      } catch (e) { notifyError((e as Error).message); }
    });
  };

  const edit = (id: string) => router.push(`/tenants/${tenantId}/website/builder?pageId=${id}`);

  const rename = async (p: SitePage) => {
    const title = await promptDialog("Rename page", { defaultValue: p.title });
    setMenuFor(null);
    if (!title || title === p.title) return;
    start(async () => { await renamePageDraft(p.id, tenantId, title); setPages(await listSitePages(tenantId, websiteId)); });
  };

  const dup = (p: SitePage) => { setMenuFor(null); start(async () => { await duplicatePage(p.id, tenantId); setPages(await listSitePages(tenantId, websiteId)); }); };
  const home = (p: SitePage) => { setMenuFor(null); start(async () => { await setHomePage(p.id, tenantId); setPages(await listSitePages(tenantId, websiteId)); }); };
  const del = async (p: SitePage) => {
    setMenuFor(null);
    if (!(await confirmDialog(`Delete "${p.title}" and all its sections?`, { danger: true, confirmText: "Delete" }))) return;
    start(async () => { await deletePage(p.id, tenantId); setPages((prev) => prev.filter((x) => x.id !== p.id)); });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{pages.length} page{pages.length === 1 ? "" : "s"}</p>
        <button onClick={add} disabled={pending}
          className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60">
          + Add new page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">No pages yet. Click <span className="font-medium">+ Add new page</span> to start building.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pages.map((p, i) => (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              {/* header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-800">{p.title}</span>
                  {p.is_home && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-700">Home</span>}
                </div>
                <button onClick={() => setMenuFor(menuFor === p.id ? null : p.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">⋮</button>
              </div>

              {/* thumbnail — REAL live preview of the page (scaled iframe) */}
              <div className="relative border-y border-slate-100">
                <PageThumb src={`/website-embed/${tenantId}/${p.id}`} grad={GRADS[i % GRADS.length]} title={p.title} />
                <span className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ${p.is_public ? "bg-emerald-400/90 text-emerald-950" : "bg-white/85 text-slate-600"}`}>
                  {p.is_public ? "Live" : "Draft"}
                </span>
              </div>

              {/* actions */}
              <div className="flex items-center justify-between gap-2 p-3">
                <button onClick={() => edit(p.id)} className="flex-1 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e3a8a]/90">Edit</button>
                <a href={`/sites/${tenantId}/${p.slug}`} target="_blank" rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:bg-slate-50" title="Open preview">↗</a>
              </div>

              {/* ⋮ menu */}
              {menuFor === p.id && (
                <div className="absolute right-3 top-9 z-10 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <button onClick={() => rename(p)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Rename</button>
                  <button onClick={() => dup(p)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Duplicate</button>
                  {!p.is_home && <button onClick={() => home(p)} className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">Set as home</button>}
                  <button onClick={() => del(p)} className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {pending && <p className="mt-3 text-xs text-slate-400">Working…</p>}
    </div>
  );
}
