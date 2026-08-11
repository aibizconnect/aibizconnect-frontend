"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListingCard } from "@/lib/server/idx/store";
import { narrowFilter, type BlockFilter, type BlockOptions } from "@/lib/idx/block-config";
import ListingInquiry from "@/components/idx/ListingInquiry";
import MortgagePayment from "@/components/idx/MortgagePayment";

/**
 * The embeddable Listings weblet (D-361) — what a GoHighLevel page actually renders inside the
 * block iframe. Search → results → detail all happen in-place (no host-page navigation), against
 * the agent's own DDF feed via /api/sites/<tenantId>/listings. Reports its height to the parent
 * frame on every layout change so the loader script can keep the iframe exactly as tall as the
 * content, which is what makes it feel like a native GHL block instead of a scrollbox.
 */

const DISCLAIMER =
  "The data relating to real estate on this website comes in part from the MLS® Reciprocity program. " +
  "The data is deemed reliable but is not guaranteed to be accurate. Listings are owned by their respective listing brokerages.";

const CLASSES = ["Residential", "Condo & Other", "Commercial"] as const;
const USES = ["", "Retail", "Office", "Industrial", "Business", "Multi", "Hospitality", "Agriculture", "Land"];

interface DetailListing {
  id: string; mlsNumber: string | null; status: string | null; propertyType: string | null;
  transactionType: string | null; listPrice: number | null; currency: string;
  addressStreet: string | null; addressUnit: string | null; city: string | null; province: string | null;
  postalCode: string | null; community: string | null; beds: number | null; baths: number | null;
  sqft: number | null; lotSizeSqft: number | null; yearBuilt: number | null; associationFee: number | null;
  parkingTotal: number | null; publicRemarks: string | null; brokerage: string | null; agent: string | null;
  modifiedAt: string;
}

function money(n: number | null, currency = "CAD"): string {
  if (n == null) return "Price on request";
  try { return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `$${Math.round(n).toLocaleString()}`; }
}

/** Tell the parent frame how tall we are (the loader listens for this message). */
function useHeightReporter(dep: unknown) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const post = () => {
      const h = Math.ceil(ref.current?.getBoundingClientRect().height ?? document.documentElement.scrollHeight);
      if (h > 0) window.parent?.postMessage({ type: "abc-listings:height", height: h }, "*");
    };
    post();
    const ro = new ResizeObserver(post);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", post);
    const t = window.setInterval(post, 1000); // catches late image reflow / font swap
    return () => { ro.disconnect(); window.removeEventListener("resize", post); window.clearInterval(t); };
  }, [dep]);
  return ref;
}

export default function EmbedListings({ tenantId, initialFilter, scopeFilter, options, brandAccent, businessName }: {
  tenantId: string; initialFilter: BlockFilter; scopeFilter?: BlockFilter; options: BlockOptions; brandAccent: string; businessName: string;
}) {
  // Layer 2 floor: whatever the visitor types in the filter bar still gets narrowed into the
  // domain's slice, so a block on a Toronto-condos domain can't be searched out of that market.
  const scope = scopeFilter ?? {};
  const accent = options.accent || brandAccent;
  const [filter, setFilter] = useState<BlockFilter>(initialFilter);
  const [draft, setDraft] = useState<BlockFilter>(initialFilter);
  const [result, setResult] = useState<{ key: string; rows: ListingCard[]; total: number; updatedAt: string | null } | null>(null);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(options.sort);
  const [favs, setFavs] = useState<Set<string> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(Date.now);

  const favKey = `idx_favs_${tenantId}`;
  const readFavs = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(favKey) || "[]")); } catch { return new Set(); }
  };
  // Hydrate saved favourites after mount (localStorage is not available during render).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavs(readFavs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);
  const toggleFav = useCallback((id: string) => {
    setFavs((prev) => {
      const next = new Set(prev ?? readFavs());
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(favKey, JSON.stringify([...next])); } catch { /* */ }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (filter.city) q.set("city", filter.city);
    if (filter.municipality) q.set("municipality", filter.municipality);
    if (filter.community) q.set("community", filter.community);
    if (filter.class) q.set("class", filter.class);
    if (filter.t) q.set("t", filter.t);
    if (filter.use) q.set("use", filter.use);
    if (filter.min != null) q.set("min", String(filter.min));
    if (filter.max != null) q.set("max", String(filter.max));
    if (filter.beds != null) q.set("beds", String(filter.beds));
    if (filter.baths != null) q.set("baths", String(filter.baths));
    if (filter.sqft != null) q.set("sqft", String(filter.sqft));
    return q.toString();
  }, [filter]);

  // One fetch key per (feed + search + page + sort); `result.key` mismatching means "still loading",
  // which keeps the skeleton state out of an extra setState-in-effect render pass.
  const fetchKey = `${tenantId}|${query}|${options.count}|${page}|${sort}`;
  useEffect(() => {
    let live = true;
    const q = new URLSearchParams(query);
    q.set("limit", String(options.count)); q.set("page", String(page)); if (sort) q.set("sort", sort);
    fetch(`/api/sites/${tenantId}/listings?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (live) setResult({ key: fetchKey, rows: Array.isArray(d.rows) ? d.rows : [], total: Number(d.total) || 0, updatedAt: d.updatedAt ?? null }); })
      .catch(() => { if (live) setResult({ key: fetchKey, rows: [], total: 0, updatedAt: null }); });
    return () => { live = false; };
  }, [fetchKey, tenantId, query, options.count, page, sort]);

  const loaded = result && result.key === fetchKey ? result : null;
  const rows = loaded?.rows ?? null;
  const total = loaded?.total ?? 0;
  const updatedAt = loaded?.updatedAt ?? null;
  const pages = Math.max(1, Math.ceil(total / options.count));
  const isNew = (iso: string) => { const t = Date.parse(iso); return Number.isFinite(t) && now - t < 14 * 864e5; };
  const grid = { 1: "grid-cols-1", 2: "grid-cols-1 sm:grid-cols-2", 3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[options.columns] ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  const rootRef = useHeightReporter(`${openId}|${query}|${page}|${rows?.length ?? -1}`);

  const num = (v: number | undefined) => (v == null ? "" : String(v));
  const setDraftNum = (k: keyof BlockFilter, raw: string) => setDraft((p) => ({ ...p, [k]: raw === "" ? undefined : Number(raw) }));
  const apply = () => { setFilter(narrowFilter(scope, draft)); setPage(0); setOpenId(null); };
  const reset = () => { setDraft(initialFilter); setFilter(initialFilter); setPage(0); setOpenId(null); };

  const inp = "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none";
  const cls = draft.class ?? "Residential";

  return (
    <div ref={rootRef} className="bg-white px-4 py-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        {openId ? (
          <ListingDetailPane tenantId={tenantId} id={openId} accent={accent} onBack={() => setOpenId(null)} />
        ) : (
          <>
            {options.heading && <h2 className="mb-4 text-2xl font-bold sm:text-3xl" style={{ color: accent }}>{options.heading}</h2>}

            {options.showSearch && (
              <div className="mb-5">
                <div className="flex gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-1">
                  {CLASSES.map((c) => (
                    <button key={c} type="button" onClick={() => setDraft((p) => ({ ...p, class: c }))}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${cls === c ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      style={cls === c ? { color: accent } : undefined}>{c}</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2 rounded-b-lg border border-slate-200 bg-white p-3">
                  <label className="flex flex-col gap-0.5 text-xs text-slate-500">Sale / Lease
                    <select value={draft.t ?? "For Sale"} onChange={(e) => setDraft((p) => ({ ...p, t: e.target.value }))} className={inp}>
                      <option>For Sale</option><option>For Lease</option>
                    </select></label>
                  <label className="flex flex-col gap-0.5 text-xs text-slate-500">City / area
                    <input value={draft.city ?? ""} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value || undefined }))} placeholder="e.g. Toronto" className={`${inp} w-36`} /></label>
                  <label className="flex flex-col gap-0.5 text-xs text-slate-500">Min $
                    <input type="number" value={num(draft.min)} onChange={(e) => setDraftNum("min", e.target.value)} className={`${inp} w-28`} /></label>
                  <label className="flex flex-col gap-0.5 text-xs text-slate-500">Max $
                    <input type="number" value={num(draft.max)} onChange={(e) => setDraftNum("max", e.target.value)} className={`${inp} w-28`} /></label>
                  {cls !== "Commercial" ? (
                    <>
                      <label className="flex flex-col gap-0.5 text-xs text-slate-500">Beds
                        <select value={num(draft.beds)} onChange={(e) => setDraftNum("beds", e.target.value)} className={inp}>
                          <option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                        </select></label>
                      <label className="flex flex-col gap-0.5 text-xs text-slate-500">Baths
                        <select value={num(draft.baths)} onChange={(e) => setDraftNum("baths", e.target.value)} className={inp}>
                          <option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                        </select></label>
                    </>
                  ) : (
                    <>
                      <label className="flex flex-col gap-0.5 text-xs text-slate-500">Property use
                        <select value={draft.use ?? ""} onChange={(e) => setDraft((p) => ({ ...p, use: e.target.value || undefined }))} className={inp}>
                          {USES.map((u) => <option key={u} value={u}>{u || "Any use"}</option>)}
                        </select></label>
                      <label className="flex flex-col gap-0.5 text-xs text-slate-500">Min sq ft
                        <input type="number" value={num(draft.sqft)} onChange={(e) => setDraftNum("sqft", e.target.value)} className={`${inp} w-28`} /></label>
                    </>
                  )}
                  <button type="button" onClick={apply} className="rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ background: accent }}>Search</button>
                  <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Reset</button>
                </div>
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              {rows && <div className="text-sm text-slate-500">{total.toLocaleString()} listing{total === 1 ? "" : "s"}</div>}
              {options.showSort && (
                <label className="text-xs text-slate-500">Sort
                  <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700">
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price (low → high)</option>
                    <option value="price_desc">Price (high → low)</option>
                  </select>
                </label>
              )}
            </div>

            {rows === null ? (
              <div className={`grid gap-5 ${grid}`}>{Array.from({ length: options.count }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />)}</div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">No listings match this search right now. Try widening your filters.</div>
            ) : (
              <div className={`grid gap-5 ${grid}`}>
                {rows.map((r) => {
                  const href = `/sites/${tenantId}/listings/${r.id}`;
                  return (
                    <a key={r.id} href={options.detail ? undefined : href} target={options.detail ? undefined : "_top"}
                      onClick={options.detail ? (e) => { e.preventDefault(); setOpenId(r.id); window.parent?.postMessage({ type: "abc-listings:scroll" }, "*"); } : undefined}
                      className="group block cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <div className="relative aspect-[4/3] bg-slate-100">
                        {r.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.cover} alt={r.address ?? r.city ?? "Listing"} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">🏠</div>
                        )}
                        {options.showBadges && isNew(r.modifiedAt) && (
                          <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/95 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white">New Listing</span>
                        )}
                        {options.showFavorites && (
                          <button type="button" aria-label="Save" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(r.id); }}
                            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow hover:bg-white">
                            <span style={{ color: favs?.has(r.id) ? "#e11d48" : "#94a3b8" }}>{favs?.has(r.id) ? "♥" : "♡"}</span>
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
                        {options.showAttribution && r.brokerage && <div className="mt-2 truncate text-[11px] text-slate-400">Listed by {r.brokerage}</div>}
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {pages > 1 && rows && rows.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-3 text-sm">
                <button type="button" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40">‹ Prev</button>
                <span className="text-slate-500">Page {page + 1} of {pages}</span>
                <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 disabled:opacity-40">Next ›</button>
              </div>
            )}
          </>
        )}

        {options.showDisclaimer && (
          <div className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
            {updatedAt && <p>Data last updated {new Date(updatedAt).toLocaleString()}.</p>}
            <p className="mt-1">{DISCLAIMER}</p>
            <p className="mt-1">{businessName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** In-place detail view: gallery · facts · remarks · contact / book-a-tour · payment estimate. */
function ListingDetailPane({ tenantId, id, accent, onBack }: { tenantId: string; id: string; accent: string; onBack: () => void }) {
  const [state, setState] = useState<{ id: string; data: { listing: DetailListing; media: string[] } | null }>({ id: "", data: null });

  useEffect(() => {
    let live = true;
    fetch(`/api/sites/${tenantId}/listings/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d) => { if (live) setState({ id, data: d.listing ? d : null }); })
      .catch(() => { if (live) setState({ id, data: null }); });
    return () => { live = false; };
  }, [tenantId, id]);

  const settled = state.id === id;
  const data = settled ? state.data : null;

  const back = (
    <button type="button" onClick={onBack} className="text-sm font-medium" style={{ color: accent }}>← Back to results</button>
  );
  if (!settled) return <div>{back}<div className="mt-4 h-96 animate-pulse rounded-xl bg-slate-100" /></div>;
  if (!data) return <div>{back}<p className="mt-4 text-sm text-slate-500">This listing is no longer available.</p></div>;

  const l = data.listing;
  const addr = [l.addressStreet, l.addressUnit && `#${l.addressUnit}`, l.city, l.province, l.postalCode].filter(Boolean).join(", ");
  const ref = l.mlsNumber ? `MLS® ${l.mlsNumber}` : addr || "this listing";
  const facts: [string, string][] = [
    ["Type", l.propertyType ?? "—"],
    ["Beds", l.beds != null ? String(l.beds) : "—"],
    ["Baths", l.baths != null ? String(l.baths) : "—"],
    ["Interior", l.sqft ? `${l.sqft.toLocaleString()} sqft` : "—"],
    ["Lot", l.lotSizeSqft ? `${l.lotSizeSqft.toLocaleString()} sqft` : "—"],
    ["Built", l.yearBuilt ? String(l.yearBuilt) : "—"],
    ["Parking", l.parkingTotal != null ? String(l.parkingTotal) : "—"],
    ["Condo fee", l.associationFee ? money(l.associationFee, l.currency) : "—"],
  ];

  return (
    <div>
      {back}
      {data.media.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.media.slice(0, 6).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className={`w-full rounded-lg object-cover ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-square"}`} loading="lazy" />
          ))}
        </div>
      )}
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="text-3xl font-bold text-slate-900">{money(l.listPrice, l.currency)}</div>
          <div className="mt-1 text-slate-500">{addr || l.community || l.city}</div>
          {l.status && <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{l.status}{l.transactionType ? ` · ${l.transactionType}` : ""}</span>}
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k}><dt className="text-[11px] uppercase tracking-wide text-slate-400">{k}</dt><dd className="font-medium text-slate-700">{v}</dd></div>
            ))}
          </dl>
          {l.publicRemarks && <p className="mt-5 whitespace-pre-wrap leading-relaxed text-slate-700">{l.publicRemarks}</p>}
          <div className="mt-6 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
            {ref}{l.brokerage ? ` · Listed by ${l.brokerage}` : ""}. Data provided by CREA DDF®; deemed reliable but not guaranteed. Last updated {new Date(l.modifiedAt).toLocaleDateString()}.
          </div>
        </div>
        <div className="space-y-4">
          <ListingInquiry tenantId={tenantId} listingRef={ref} accent={accent} />
          <MortgagePayment price={l.listPrice} accent={accent} currency={l.currency} />
        </div>
      </div>
    </div>
  );
}
