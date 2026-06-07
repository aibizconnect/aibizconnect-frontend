"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { saveDraft, generateSeoAI } from "../actions";
import MediaPickerModal from "./MediaPickerModal";
import { scoreSeo, type SeoReport } from "@/lib/seo/geo-score";

interface SeoPanelProps {
  tenantId: string;
  selectedPageId: string | null;
}

interface MetaTag { name: string; content: string }
interface SeoState {
  seo_title: string; seo_description: string; seo_image_url: string; seo_image_alt: string; canonical_url: string;
  noindex: boolean; nofollow: boolean; keywords: string;
  focus_keyword: string; author: string; language: string; schema_type: string;
  meta_tags: MetaTag[]; schemas: string[];
}
const empty: SeoState = {
  seo_title: "", seo_description: "", seo_image_url: "", seo_image_alt: "", canonical_url: "",
  noindex: false, nofollow: false, keywords: "", focus_keyword: "", author: "", language: "en", schema_type: "",
  meta_tags: [], schemas: [],
};

const SCHEMA_OPTIONS = ["Organization", "WebPage", "LocalBusiness", "Service", "Product", "Article", "FAQPage", "Event", "BreadcrumbList", "Person", "Review"];
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" }, { code: "en-CA", label: "English (Canada)" }, { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" }, { code: "fr", label: "French" }, { code: "fr-CA", label: "French (Canada)" },
  { code: "es", label: "Spanish" }, { code: "de", label: "German" }, { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" }, { code: "nl", label: "Dutch" }, { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" }, { code: "ja", label: "Japanese" }, { code: "hi", label: "Hindi" },
];

function ScoreRing({ value }: { value: number }) {
  const color = value >= 80 ? "#16a34a" : value >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative grid h-14 w-14 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #e5e7eb 0)` }}>
      <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

/** Small "write with AI" sparkle button used inline on a field (polished). */
function AiButton({ onClick, busy, label = "AI" }: { onClick: () => void; busy: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50">
      <span aria-hidden>{busy ? "…" : "✨"}</span>{label}
    </button>
  );
}

export default function SeoPanel({ tenantId, selectedPageId }: SeoPanelProps) {
  const supabase = createClient();
  const [seo, setSeo] = useState<SeoState>(empty);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<null | "all" | "title" | "desc">(null);

  useEffect(() => {
    async function load() {
      if (!selectedPageId) return;
      const { data } = await supabase.from("website_pages")
        .select("title, slug, seo_title, seo_description, seo_image_url, canonical_url, noindex, nofollow, draft_seo, draft_sections")
        .eq("tenant_id", tenantId).eq("id", selectedPageId).single();
      if (data) {
        const d = (data.draft_seo && typeof data.draft_seo === "object" ? data.draft_seo : {}) as Record<string, any>;
        setTitle(data.title ?? ""); setSlug(data.slug ?? "");
        setSections(Array.isArray(data.draft_sections) ? data.draft_sections : []);
        setSeo({
          seo_title: d.seo_title ?? data.seo_title ?? "", seo_description: d.seo_description ?? data.seo_description ?? "",
          seo_image_url: d.seo_image_url ?? data.seo_image_url ?? "", seo_image_alt: d.seo_image_alt ?? "",
          canonical_url: d.canonical_url ?? data.canonical_url ?? "",
          noindex: Boolean(d.noindex ?? data.noindex), nofollow: Boolean(d.nofollow ?? data.nofollow),
          keywords: d.keywords ?? "",
          focus_keyword: d.focus_keyword ?? "", author: d.author ?? "", language: d.language ?? "en", schema_type: d.schema_type ?? "",
          meta_tags: Array.isArray(d.meta_tags) ? d.meta_tags : [],
          schemas: Array.isArray(d.schemas) && d.schemas.length ? d.schemas : (d.schema_type ? [d.schema_type] : []),
        });
      } else setSeo(empty);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedPageId]);

  const report: SeoReport = useMemo(() => scoreSeo({
    title: seo.seo_title || title, description: seo.seo_description, sections,
    author: seo.author, language: seo.language, schemaType: seo.schema_type,
    focusKeyword: seo.focus_keyword, canonical: seo.canonical_url,
  }), [seo, title, sections]);

  if (!selectedPageId) return <div className="text-sm text-gray-500">Select a page to optimize its SEO.</div>;

  async function commit(next: SeoState) {
    try { await saveDraft(selectedPageId!, tenantId, { draft_seo: next as unknown as Record<string, unknown> }); }
    catch (e: any) { alert(e?.message ?? "Failed to save SEO."); }
  }
  const upd = (patch: Partial<SeoState>) => { const next = { ...seo, ...patch }; setSeo(next); commit(next); };

  async function runAi(scope: "all" | "title" | "desc") {
    if (!selectedPageId) return;
    setBusy(scope);
    try {
      const g = await generateSeoAI(selectedPageId, tenantId);
      const patch: Partial<SeoState> =
        scope === "title" ? { seo_title: g.seo_title }
        : scope === "desc" ? { seo_description: g.seo_description }
        : {
            seo_title: g.seo_title, seo_description: g.seo_description,
            keywords: g.keywords, focus_keyword: g.focus_keyword,
            schema_type: g.schema_type || seo.schema_type,
            schemas: seo.schemas.length ? seo.schemas : Array.from(new Set(["Organization", "WebPage", ...(g.schema_type ? [g.schema_type] : [])])),
            seo_image_alt: g.image_alt || seo.seo_image_alt,
          };
      upd(patch);
    } catch (e: any) {
      alert(e?.message ?? "AI generation failed.");
    } finally {
      setBusy(null);
    }
  }

  const field = "w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200";
  const cardCls = "rounded-lg border border-gray-200 bg-white p-4";
  const lenCls = (n: number, max: number) => (n > max ? "text-red-600" : n > max * 0.85 ? "text-amber-600" : "text-gray-400");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">SEO &amp; AI search optimization</h2>
          <p className="text-xs text-gray-400">Get found across AI &amp; search engines. Saved to draft, applied on Publish.</p>
        </div>
        <button type="button" onClick={() => runAi("all")} disabled={busy !== null}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-60">
          <span aria-hidden>{busy === "all" ? "…" : "✨"}</span>{busy === "all" ? "Writing…" : "Auto-fill with AI"}
        </button>
      </div>

      {/* search preview + score (the leading builder shows a Google preview; we add a score ring) */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <ScoreRing value={report.overall} />
        <div className="min-w-0">
          <div className="truncate text-sm text-blue-700">{seo.seo_title || title || "Page title"}</div>
          <div className="truncate text-xs text-green-700">aibizconnect.app/{slug}</div>
          <div className="line-clamp-2 text-xs text-gray-500">{seo.seo_description || "Add a meta description to control how this page appears in results."}</div>
        </div>
      </div>

      {/* === SEO Meta Data (best-in-class card) === */}
      <div className={cardCls}>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-800">SEO Meta Data</h3>
          <p className="text-xs text-gray-400">Control how this page appears on search engines and social media.</p>
        </div>

        <label className="mb-3 flex flex-col gap-1">
          <span className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Meta Title</span>
            <span className="flex items-center gap-2">
              <span className={`text-xs ${lenCls(seo.seo_title.length, 60)}`}>{seo.seo_title.length}/60</span>
              <AiButton busy={busy === "title"} onClick={() => runAi("title")} label="Write" />
            </span>
          </span>
          <input className={field} value={seo.seo_title} placeholder="Your page title for search results"
            onChange={(e) => setSeo((s) => ({ ...s, seo_title: e.target.value }))} onBlur={() => commit(seo)} />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Meta Description</span>
            <span className="flex items-center gap-2">
              <span className={`text-xs ${lenCls(seo.seo_description.length, 160)}`}>{seo.seo_description.length}/160</span>
              <AiButton busy={busy === "desc"} onClick={() => runAi("desc")} label="Write" />
            </span>
          </span>
          <textarea className={field} rows={3} value={seo.seo_description} placeholder="A short, benefit-led summary of this page"
            onChange={(e) => setSeo((s) => ({ ...s, seo_description: e.target.value }))} onBlur={() => commit(seo)} />
        </label>

        <label className="mb-3 flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Keywords</span>
          <input className={field} value={seo.keywords} placeholder="Comma-separated keywords"
            onChange={(e) => setSeo((s) => ({ ...s, keywords: e.target.value }))} onBlur={() => commit(seo)} />
        </label>

        {/* Share image (Open Graph) — the leading builder's "Page Share Image" */}
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Share Image</span>
          {seo.seo_image_url ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={seo.seo_image_url} alt={seo.seo_image_alt || "Share preview"} className="h-16 w-28 rounded border border-gray-200 object-cover" />
              <div className="flex flex-col gap-1">
                <button type="button" onClick={() => setPickerOpen(true)} className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">Replace</button>
                <button type="button" onClick={() => upd({ seo_image_url: "" })} className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setPickerOpen(true)}
              className="grid h-20 place-items-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-violet-300 hover:text-violet-600">
              + Add a share image (1200×630 recommended)
            </button>
          )}
          <input className={`${field} mt-1`} value={seo.seo_image_alt} placeholder="Image alt text (for accessibility & AI)"
            onChange={(e) => setSeo((s) => ({ ...s, seo_image_alt: e.target.value }))} onBlur={() => commit(seo)} />
        </div>
      </div>

      {/* === Custom meta tags (the leading builder's "custom meta tags") === */}
      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Custom meta tags</h3>
            <p className="text-xs text-gray-400">Extra Open Graph / social / verification tags injected into &lt;head&gt;.</p>
          </div>
          <button type="button" onClick={() => upd({ meta_tags: [...seo.meta_tags, { name: "", content: "" }] })}
            className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">+ Add</button>
        </div>
        {seo.meta_tags.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {[{ name: "og:type", content: "website" }, { name: "og:locale", content: (seo.language || "en").replace("-", "_") }, { name: "og:site_name", content: "" }].map((d) => (
              <button key={d.name} type="button" onClick={() => upd({ meta_tags: [...seo.meta_tags, d] })}
                className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-violet-300 hover:text-violet-600">+ {d.name}</button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {seo.meta_tags.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input className={`${field} w-2/5`} value={t.name} placeholder="og:type" onChange={(e) => { const m = seo.meta_tags.slice(); m[i] = { ...m[i], name: e.target.value }; upd({ meta_tags: m }); }} />
              <input className={field} value={t.content} placeholder="value" onChange={(e) => { const m = seo.meta_tags.slice(); m[i] = { ...m[i], content: e.target.value }; upd({ meta_tags: m }); }} />
              <button type="button" title="Remove" onClick={() => upd({ meta_tags: seo.meta_tags.filter((_, j) => j !== i) })}
                className="shrink-0 rounded border border-gray-200 px-2 py-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">🗑</button>
            </div>
          ))}
        </div>
        {seo.meta_tags.length > 0 && seo.meta_tags.every((t) => t.name && t.content) && (
          <p className="mt-2 text-xs text-green-700">✓ Page has custom meta tags</p>
        )}
      </div>

      {/* === Canonical + Language === */}
      <div className={cardCls}>
        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-sm font-medium text-gray-700"><span>Canonical link</span>
            {!seo.canonical_url && <button type="button" onClick={() => upd({ canonical_url: `https://aibizconnect.app/${slug}` })} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50">+ Add</button>}
          </span>
          <input className={field} value={seo.canonical_url} onChange={(e) => setSeo((s) => ({ ...s, canonical_url: e.target.value }))} onBlur={() => commit(seo)} placeholder="https://… (leave blank for default)" />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-700">Language</span>
            <select className={field} value={seo.language} onChange={(e) => upd({ language: e.target.value })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.code} - {l.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-sm font-medium text-gray-700">Focus keyword</span><input className={field} value={seo.focus_keyword} onChange={(e) => upd({ focus_keyword: e.target.value })} placeholder="e.g. AI automation" /></label>
        </div>
        <label className="mt-3 flex flex-col gap-1"><span className="text-sm font-medium text-gray-700">Author</span><input className={field} value={seo.author} onChange={(e) => upd({ author: e.target.value })} placeholder="Name" /></label>
        <div className="mt-3 flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={seo.noindex} onChange={(e) => upd({ noindex: e.target.checked })} /> noindex</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={seo.nofollow} onChange={(e) => upd({ nofollow: e.target.checked })} /> nofollow</label>
        </div>
      </div>

      {/* === Schema markup (the leading builder multi-schema, "rich results & AI citations") === */}
      <div className={cardCls}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Schema markup</h3>
            <p className="text-xs text-gray-400">Get rich results &amp; AI citations. Each schema is emitted as JSON-LD.</p>
          </div>
          <div className="relative shrink-0">
            <select value="" onChange={(e) => { if (e.target.value) upd({ schemas: [...seo.schemas, e.target.value] }); }}
              className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100">
              <option value="">+ New Schema</option>
              {SCHEMA_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {seo.schemas.length === 0 ? (
          <button type="button" onClick={() => upd({ schemas: ["Organization", "WebPage"] })}
            className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-xs text-gray-500 hover:border-violet-300 hover:text-violet-600">
            No active schemas — add Organization + WebPage (recommended)
          </button>
        ) : (
          <div className="mt-2">
            <div className="mb-1 text-xs font-medium text-gray-500">Active Schemas</div>
            <div className="flex flex-wrap gap-1.5">
              {seo.schemas.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
                  {t}
                  <button type="button" title="Remove" onClick={() => upd({ schemas: seo.schemas.filter((_, j) => j !== i) })}
                    className="text-gray-400 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">FAQ schema is added automatically from any FAQ section on the page.</p>
          </div>
        )}
      </div>

      {/* scored checklist */}
      <div className="rounded-lg border border-gray-200">
        {report.categories.map((c) => (
          <details key={c.key} className="border-b border-gray-100 last:border-0">
            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
              <span className="font-medium text-gray-700">{c.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.score >= 80 ? "bg-green-100 text-green-700" : c.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>{c.score}</span>
            </summary>
            {c.tips.length > 0 && (
              <ul className="list-inside list-disc px-4 pb-2 text-xs text-gray-500">{c.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            )}
          </details>
        ))}
      </div>

      <MediaPickerModal tenantId={tenantId} open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => upd({ seo_image_url: url })} />
    </div>
  );
}
