"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ListingsContent } from "@/lib/sections/schemas";
import type { ListingCard } from "@/lib/server/idx/store";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

/**
 * Live IDX Listings weblet (D-361 — the myRealPage parity element). Renders a real, sortable,
 * paginated grid of the tenant's synced MLS listings, bound to a saved search (content.filter).
 * Client-fetches the public JSON feed so it works in the editor, preview, and on any published or
 * custom domain. Cards: photo · NEW badge · price · address · beds/baths · brokerage attribution ·
 * ♡ favorite (localStorage). Footer carries the "last updated" stamp + the MLS® disclaimer.
 */

const DISCLAIMER =
  "The data relating to real estate on this website comes in part from the MLS® Reciprocity program. " +
  "The data is deemed reliable but is not guaranteed to be accurate. Listings are owned by their respective listing brokerages.";

function money(n: number | null, currency = "CAD"): string {
  if (n == null) return "Price on request";
  try { return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `$${Math.round(n).toLocaleString()}`; }
}

export default function SiteListings({ tenantId, content, theme = DEFAULT_THEME }: {
  tenantId: string; content: ListingsContent; theme?: ThemeTokens;
}) {
  const f = content.filter ?? {};
  const count = Math.min(Math.max(content.count ?? 6, 1), 24);
  const columns = Math.min(Math.max(content.columns ?? 3, 1), 4);
  const show = {
    sort: content.showSort ?? true, pagination: content.showPagination ?? true, favorites: content.showFavorites ?? true,
    badges: content.showBadges ?? true, attribution: content.showAttribution ?? true, disclaimer: content.showDisclaimer ?? true,
  };
  const accent = theme.colors?.primary ?? "#1e3a8a";

  const [rows, setRows] = useState<ListingCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(content.sort || "newest");
  const [favs, setFavs] = useState<Set<string>>(new Set());

  const favKey = `idx_favs_${tenantId}`;
  useEffect(() => { try { setFavs(new Set(JSON.parse(localStorage.getItem(favKey) || "[]"))); } catch { /* */ } }, [favKey]);
  const toggleFav = useCallback((id: string) => {
    setFavs((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); try { localStorage.setItem(favKey, JSON.stringify([...next])); } catch { /* */ } return next; });
  }, [favKey]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (f.city) q.set("city", f.city);
    if (f.municipality) q.set("municipality", f.municipality);
    if (f.community) q.set("community", f.community);
    if (f.propertyClass) q.set("class", f.propertyClass);
    if (f.transactionType) q.set("t", f.transactionType);
    if (f.propertyUse) q.set("use", f.propertyUse);
    if (f.minPrice != null) q.set("min", String(f.minPrice));
    if (f.maxPrice != null) q.set("max", String(f.maxPrice));
    if (f.beds != null) q.set("beds", String(f.beds));
    if (f.baths != null) q.set("baths", String(f.baths));
    if (f.minSqft != null) q.set("sqft", String(f.minSqft));
    return q;
  }, [f]);

  useEffect(() => {
    let live = true;
    setRows(null);
    const q = new URLSearchParams(query);
    q.set("limit", String(count)); q.set("page", String(page)); if (sort) q.set("sort", sort);
    fetch(`/api/sites/${tenantId}/listings?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!live) return; setRows(Array.isArray(d.rows) ? d.rows : []); setTotal(Number(d.total) || 0); setUpdatedAt(d.updatedAt ?? null); })
      .catch(() => { if (live) { setRows([]); setTotal(0); } });
    return () => { live = false; };
  }, [tenantId, query, count, page, sort]);

  const pages = Math.max(1, Math.ceil(total / count));
  const viewAll = content.ctaHref || `/sites/${tenantId}/listings${query.toString() ? `?${query.toString()}` : ""}`;
  const isNew = (iso: string) => { const t = Date.parse(iso); return Number.isFinite(t) && Date.now() - t < 14 * 864e5; };
  const grid = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[columns];

  return (
    <section style={{ background: theme.colors?.background, color: theme.colors?.text, fontFamily: theme.fonts?.body }} className="px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          {content.heading && <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: accent, fontFamily: theme.fonts?.heading }}>{content.heading}</h2>}
          {show.sort && (
            <label className="text-xs text-slate-500">Sort
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700">
                <option value="newest">Newest</option>
                <option value="price_asc">Price (low → high)</option>
                <option value="price_desc">Price (high → low)</option>
              </select>
            </label>
          )}
        </div>

        {rows && <div className="mb-3 text-sm text-slate-500">{total.toLocaleString()} listing{total === 1 ? "" : "s"}</div>}

        {rows === null ? (
          <div className={`grid gap-5 ${grid}`}>{Array.from({ length: count }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">No listings match this search right now. Check back soon.</div>
        ) : (
          <div className={`grid gap-5 ${grid}`}>
            {rows.map((r) => (
              <a key={r.id} href={`/sites/${tenantId}/listings/${r.id}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                <div className="relative aspect-[4/3] bg-slate-100">
                  {r.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover} alt={r.address ?? r.city ?? "Listing"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">🏠</div>
                  )}
                  {show.badges && isNew(r.modifiedAt) && (
                    <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/95 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white">New Listing</span>
                  )}
                  {show.favorites && (
                    <button type="button" aria-label="Save" onClick={(e) => { e.preventDefault(); toggleFav(r.id); }}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow hover:bg-white">
                      <span style={{ color: favs.has(r.id) ? "#e11d48" : "#94a3b8" }}>{favs.has(r.id) ? "♥" : "♡"}</span>
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-lg font-bold" style={{ color: accent }}>{money(r.listPrice, r.currency)}{r.transactionType === "For Lease" ? <span className="text-xs font-normal text-slate-400"> /mo</span> : null}</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{r.address ?? r.propertyType ?? "—"}</div>
                  <div className="truncate text-xs text-slate-500">{[r.community, r.city].filter(Boolean).join(" · ") || r.province}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {r.beds != null && <span>🛏 {r.beds}</span>}
                    {r.baths != null && <span>🛁 {r.baths}</span>}
                    {r.sqft != null && r.sqft > 0 && <span>📐 {r.sqft.toLocaleString()} sqft</span>}
                  </div>
                  {show.attribution && r.brokerage && <div className="mt-2 truncate text-[11px] text-slate-400">Listed by {r.brokerage}</div>}
                </div>
              </a>
            ))}
          </div>
        )}

        {show.pagination && pages > 1 && rows && rows.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <button disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40">‹ Prev</button>
            <span className="text-slate-500">Page {page + 1} of {pages}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40">Next ›</button>
          </div>
        )}

        {(content.ctaLabel || content.ctaHref) && (
          <div className="mt-6 text-center">
            <a href={viewAll} className="inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: accent }}>{content.ctaLabel || "View all listings →"}</a>
          </div>
        )}

        {show.disclaimer && (
          <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
            {updatedAt && <p>Data last updated {new Date(updatedAt).toLocaleString()}.</p>}
            <p className="mt-1">{DISCLAIMER}</p>
          </div>
        )}
      </div>
    </section>
  );
}
