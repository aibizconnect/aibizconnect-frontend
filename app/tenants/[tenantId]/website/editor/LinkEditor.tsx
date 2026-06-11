"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { LinkValue } from "@/lib/sections/links";

/**
 * Shared link editor (D-222, Gemini + Copilot ratified): ONE control for "where does this go
 * when clicked" — used by Menu/Submenu items, Buttons, List items and the floating text popup.
 * Kind = Page (internal page picker) | URL (free input) | Anchor (a section on this page);
 * plus open-behavior (same tab / new window). It MATERIALIZES `href` on every change, so
 * renderers keep emitting href+target and never resolve pages themselves.
 */

export type PageOpt = { id: string; title: string; slug: string };

// Module-level cache: a menu with 8 items mounts 8+ LinkEditors — fetch the page list once.
let pagesCache: { tenantId: string; pages: PageOpt[] } | null = null;

export function usePageOptions(tenantId: string): PageOpt[] {
  const [pages, setPages] = useState<PageOpt[]>(pagesCache?.tenantId === tenantId ? pagesCache.pages : []);
  useEffect(() => {
    if (pagesCache?.tenantId === tenantId) { setPages(pagesCache.pages); return; }
    const supabase = createClient();
    supabase.from("website_pages").select("id, title, slug, draft_slug").eq("tenant_id", tenantId).then(({ data }) => {
      const next = (Array.isArray(data) ? data : [])
        .map((p: any) => ({ id: String(p.id), title: (p.title || p.draft_slug || p.slug || "") as string, slug: (p.draft_slug || p.slug || "") as string }))
        .filter((p) => p.slug);
      pagesCache = { tenantId, pages: next };
      setPages(next);
    });
  }, [tenantId]);
  return pages;
}

/** Section anchors visible on the editor canvas (SectionView emits id + data-abc-anchor). */
export function collectCanvasAnchors(): string[] {
  if (typeof document === "undefined") return [];
  return Array.from(new Set(Array.from(document.querySelectorAll("[data-abc-anchor][id]")).map((el) => el.id).filter(Boolean)));
}

/** Lift whatever the caller stored (LinkValue, legacy href string, or nothing) into a LinkValue. */
function liftValue(value?: LinkValue | string | null): LinkValue {
  if (value && typeof value === "object") return value;
  const h = (typeof value === "string" ? value : "").trim();
  if (!h || h === "#") return { kind: "url" };
  if (h.startsWith("#")) return { kind: "anchor", anchor: h.slice(1), href: h };
  if (h.startsWith("/")) return { kind: "page", url: h, href: h }; // internal path — page picker preselects on match
  return { kind: "url", url: h, href: h };
}

export default function LinkEditor({ value, onChange, tenantId, anchors, label }: {
  value?: LinkValue | string | null;
  /** Receives the full LinkValue (href materialized) — or undefined when cleared. */
  onChange: (v: LinkValue | undefined) => void;
  tenantId: string;
  /** Anchor ids to offer; defaults to scanning the live editor canvas. */
  anchors?: string[];
  label?: string;
}) {
  const pages = usePageOptions(tenantId);
  const v = liftValue(value);
  const [anchorList, setAnchorList] = useState<string[]>(anchors ?? []);
  useEffect(() => { if (!anchors) setAnchorList(collectCanvasAnchors()); }, [anchors]);

  const emit = (next: LinkValue) => {
    const href = next.kind === "page"
      ? (next.pageId ? `/${pages.find((p) => p.id === next.pageId)?.slug ?? ""}`.replace(/\/$/, "") || undefined : next.href)
      : next.kind === "anchor"
        ? (next.anchor ? `#${next.anchor.replace(/^#/, "")}` : undefined)
        : (next.url || undefined);
    onChange({ ...next, href });
  };

  const sel = "h-7 rounded-md border border-slate-200 bg-white px-1 text-xs";
  // Page preselect: match stored pageId, else a legacy "/slug" href.
  const pageId = v.pageId ?? (v.kind === "page" && v.href ? pages.find((p) => `/${p.slug}` === v.href)?.id : undefined) ?? "";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="w-10 shrink-0 text-xs text-gray-500">{label}</span>}
      <select value={v.kind} onChange={(e) => emit({ ...v, kind: e.target.value as LinkValue["kind"] })} className={sel} title="Link type">
        <option value="page">Page</option>
        <option value="url">URL</option>
        <option value="anchor">Anchor</option>
      </select>
      {v.kind === "page" && (
        <select value={pageId} onChange={(e) => emit({ ...v, pageId: e.target.value || undefined })} className={`${sel} min-w-0 flex-1`} title="Pick a page">
          <option value="">Choose page…</option>
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title || p.slug}</option>)}
        </select>
      )}
      {v.kind === "url" && (
        <input value={v.url ?? ""} onChange={(e) => emit({ ...v, url: e.target.value })}
          placeholder="https://…" className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs" />
      )}
      {v.kind === "anchor" && (
        anchorList.length
          ? (
            <select value={v.anchor ?? ""} onChange={(e) => emit({ ...v, anchor: e.target.value || undefined })} className={`${sel} min-w-0 flex-1`} title="Section on this page">
              <option value="">Choose section…</option>
              {anchorList.map((a) => <option key={a} value={a}>#{a}</option>)}
            </select>
          )
          : <input value={v.anchor ?? ""} onChange={(e) => emit({ ...v, anchor: e.target.value.replace(/^#/, "") })}
              placeholder="section-id" className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 px-2 text-xs" />
      )}
      <select value={v.target ?? "_self"} onChange={(e) => emit({ ...v, target: e.target.value as LinkValue["target"] })} className={sel} title="Open in">
        <option value="_self">Same tab</option>
        <option value="_blank">New window</option>
      </select>
      {(v.href || v.url || v.anchor || v.pageId) && (
        <button type="button" onClick={() => onChange(undefined)} title="Remove link"
          className="h-7 rounded-md border border-slate-200 px-2 text-xs text-red-500 hover:bg-red-50">✕</button>
      )}
    </div>
  );
}
