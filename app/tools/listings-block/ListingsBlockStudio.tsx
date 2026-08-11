"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_OPTIONS, blockConfigToQuery, type BlockFilter, type BlockOptions } from "@/lib/idx/block-config";

/**
 * Listings block studio — pick the filters, watch the real block render beside them, copy the
 * snippet. The preview is the SAME document the published block loads (/embed/listings/<tenant>),
 * so "what you saw in the studio" and "what the GHL page shows after save" cannot diverge.
 */

const NAVY = "#1e3a8a";
const CLASSES = ["", "Residential", "Condo & Other", "Commercial"];

export default function ListingsBlockStudio({ appBase, initialTenantId }: { appBase: string; initialTenantId: string }) {
  const [tenantId, setTenantId] = useState(initialTenantId);
  const [filter, setFilter] = useState<BlockFilter>({});
  const [options, setOptions] = useState<BlockOptions>(DEFAULT_OPTIONS);
  const [copied, setCopied] = useState(false);

  const query = useMemo(() => blockConfigToQuery(filter, options).toString(), [filter, options]);

  // Debounce so typing a city doesn't reload the preview on every keystroke.
  const [previewQuery, setPreviewQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setPreviewQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const previewSrc = tenantId ? `/embed/listings/${encodeURIComponent(tenantId)}${previewQuery ? `?${previewQuery}` : ""}` : "";

  const snippet = useMemo(() => {
    if (!tenantId) return "";
    const attrs = [...new URLSearchParams(query).entries()].map(([k, v]) => ` data-${k}="${v.replace(/"/g, "&quot;")}"`).join("");
    return `<script src="${appBase}/api/listings-block/embed?t=${encodeURIComponent(tenantId)}"${attrs} async></script>`;
  }, [appBase, tenantId, query]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  };

  const setF = (k: keyof BlockFilter, v: string) => setFilter((p) => ({ ...p, [k]: v === "" ? undefined : v }));
  const setN = (k: keyof BlockFilter, v: string) => setFilter((p) => ({ ...p, [k]: v === "" ? undefined : Number(v) }));
  const num = (v: unknown) => (v == null ? "" : String(v));
  const toggle = (k: keyof BlockOptions) => setOptions((p) => ({ ...p, [k]: !p[k] }));

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const lbl = "flex flex-col gap-1 text-xs font-medium text-slate-500";

  const FLAGS: [keyof BlockOptions, string][] = [
    ["showSearch", "Visitor filter bar"],
    ["detail", "Open details inside the block"],
    ["showSort", "Sort dropdown"],
    ["showFavorites", "♡ Save button"],
    ["showBadges", "“New listing” badge"],
    ["showAttribution", "Brokerage attribution"],
    ["showDisclaimer", "MLS® disclaimer"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* ── config ── */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Your feed</div>
          <label className={`${lbl} mt-3`}>Tenant ID (the agent whose DDF feed powers this block)
            <input value={tenantId} onChange={(e) => setTenantId(e.target.value.trim())} placeholder="e.g. 8f31…" className={inp} />
          </label>
          <p className="mt-2 text-[11px] leading-snug text-slate-400">
            Each agent embeds their OWN tenant ID, so the block renders only listings synced from that agent’s CREA DDF credentials.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Saved search</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={lbl}>Property class
              <select value={filter.class ?? ""} onChange={(e) => setF("class", e.target.value)} className={inp}>
                {CLASSES.map((c) => <option key={c} value={c}>{c || "Any"}</option>)}
              </select></label>
            <label className={lbl}>Sale / Lease
              <select value={filter.t ?? ""} onChange={(e) => setF("t", e.target.value)} className={inp}>
                <option value="">Any</option><option>For Sale</option><option>For Lease</option>
              </select></label>
            <label className={`${lbl} col-span-2`}>City / area
              <input value={filter.city ?? ""} onChange={(e) => setF("city", e.target.value)} placeholder="e.g. Toronto" className={inp} /></label>
            <label className={lbl}>Min price
              <input type="number" value={num(filter.min)} onChange={(e) => setN("min", e.target.value)} className={inp} /></label>
            <label className={lbl}>Max price
              <input type="number" value={num(filter.max)} onChange={(e) => setN("max", e.target.value)} className={inp} /></label>
            <label className={lbl}>Beds (min)
              <input type="number" value={num(filter.beds)} onChange={(e) => setN("beds", e.target.value)} className={inp} /></label>
            <label className={lbl}>Baths (min)
              <input type="number" value={num(filter.baths)} onChange={(e) => setN("baths", e.target.value)} className={inp} /></label>
            {filter.class === "Commercial" && (
              <>
                <label className={lbl}>Property use
                  <input value={filter.use ?? ""} onChange={(e) => setF("use", e.target.value)} placeholder="Retail / Office…" className={inp} /></label>
                <label className={lbl}>Min sq ft
                  <input type="number" value={num(filter.sqft)} onChange={(e) => setN("sqft", e.target.value)} className={inp} /></label>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Look &amp; feel</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className={`${lbl} col-span-2`}>Heading (optional)
              <input value={options.heading ?? ""} onChange={(e) => setOptions((p) => ({ ...p, heading: e.target.value || undefined }))} placeholder="Featured listings" className={inp} /></label>
            <label className={lbl}>Cards per page
              <input type="number" min={1} max={24} value={options.count} onChange={(e) => setOptions((p) => ({ ...p, count: Math.min(24, Math.max(1, Number(e.target.value) || 1)) }))} className={inp} /></label>
            <label className={lbl}>Columns
              <select value={options.columns} onChange={(e) => setOptions((p) => ({ ...p, columns: Number(e.target.value) }))} className={inp}>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select></label>
            <label className={lbl}>Default sort
              <select value={options.sort} onChange={(e) => setOptions((p) => ({ ...p, sort: e.target.value }))} className={inp}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price (low → high)</option>
                <option value="price_desc">Price (high → low)</option>
              </select></label>
            <label className={lbl}>Accent colour
              <input type="color" value={options.accent ?? NAVY} onChange={(e) => setOptions((p) => ({ ...p, accent: e.target.value }))} className="h-9 w-full rounded-lg border border-slate-300" /></label>
          </div>
          <div className="mt-3 space-y-1.5">
            {FLAGS.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={!!options[k]} onChange={() => toggle(k)} />{label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── preview + snippet ── */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-800">Live preview</div>
            {previewSrc && <a href={previewSrc} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: NAVY }}>Open in a new tab →</a>}
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {previewSrc ? (
              <iframe key={previewSrc} src={previewSrc} title="Listings block preview" className="h-[760px] w-full border-0" />
            ) : (
              <div className="p-16 text-center text-sm text-slate-400">Enter a tenant ID to see the block.</div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            The preview loads the exact URL the embedded block loads. If it says “not found”, that tenant has no active DDF feed yet.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold text-slate-800">Paste this into your GoHighLevel page</div>
          <p className="mt-1 text-xs text-slate-500">Add a <b>Custom HTML / Code</b> element where you want the listings, paste the snippet, and save — the block renders live on the published page.</p>
          <div className="relative mt-3">
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-4 pr-24 text-[12px] leading-relaxed text-slate-100"><code>{snippet || "// enter a tenant ID above"}</code></pre>
            <button onClick={copy} disabled={!snippet} className="absolute right-3 top-3 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-40">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
