"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import FontPicker from "@/components/design/FontPicker";

/**
 * Floating text-format popup (GHL-style). Appears anchored to the currently-selected text
 * element (the one tagged with data-abc-selected="1"), floating ABOVE it — or flipping BELOW
 * when there isn't room — so it never crowds the element. Holds the high-frequency text
 * controls (Font, Size, Style, Colour, Align, Link) so the sticky side panel stays short.
 */
type PageOpt = { title: string; slug: string };

export default function TextFormatPopup({
  content, onPatch, customFonts, tenantId, selKey,
}: {
  content: any;
  onPatch: (partial: Record<string, unknown>) => void;
  customFonts: string[];
  tenantId: string;
  selKey: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [pages, setPages] = useState<PageOpt[]>([]);

  // Load the site's pages once for the URL picker.
  useEffect(() => {
    const supabase = createClient();
    supabase.from("website_pages").select("title, slug, draft_slug").eq("tenant_id", tenantId).then(({ data }) => {
      if (Array.isArray(data)) setPages(data.map((p: any) => ({ title: p.title, slug: p.draft_slug || p.slug })).filter((p) => p.slug));
    });
  }, [tenantId]);

  // Position above the selected element; flip below if it would clip the top.
  const reposition = () => {
    const anchor = document.querySelector('[data-abc-selected="1"]') as HTMLElement | null;
    const el = ref.current;
    if (!anchor || !el) return;
    const a = anchor.getBoundingClientRect();
    const h = el.offsetHeight || 80;
    const w = el.offsetWidth || 320;
    const gap = 10;
    let below = false;
    let top = a.top - h - gap;
    if (top < 8) { top = a.bottom + gap; below = true; }       // not enough room above → below
    let left = a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8)); // keep on-screen
    setPos({ top, left, below });
  };

  useLayoutEffect(reposition, [selKey, showLink]);
  useEffect(() => {
    const f = () => reposition();
    window.addEventListener("scroll", f, true);
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f, true); window.removeEventListener("resize", f); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  const bold = String(content.fontWeight ?? "") === "700" || content.fontWeight === "bold";
  const hasLink = !!content.href;

  const btn = (active: boolean) =>
    `grid h-7 w-7 place-items-center rounded-md border text-sm ${active ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`;

  return (
    <div
      ref={ref}
      // Don't steal selection from the element while interacting.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 2147483000 }}
      className="editor-compact flex max-w-[92vw] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Font */}
        <div className="w-36"><FontPicker value={content.fontFamily} onChange={(v) => onPatch({ fontFamily: v })} customFonts={customFonts} /></div>
        {/* Size */}
        <input type="number" min={8} max={200} value={content.fontSize ?? ""} placeholder="Size"
          onChange={(e) => onPatch({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
          className="h-7 w-16 rounded-md border border-slate-200 px-2 text-xs" title="Font size (px)" />
        {/* Style */}
        <button type="button" className={btn(bold)} title="Bold" onClick={() => onPatch({ fontWeight: bold ? "400" : "700" })}><b>B</b></button>
        <button type="button" className={btn(!!content.italic)} title="Italic" onClick={() => onPatch({ italic: !content.italic })}><i>I</i></button>
        {/* Text colour */}
        <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-slate-200" title="Text colour">
          <span className="text-[9px] font-bold leading-none" style={{ color: content.color || "#0f172a" }}>A</span>
          <input type="color" value={/^#/.test(content.color || "") ? content.color : "#0f172a"} onChange={(e) => onPatch({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {/* Background colour */}
        <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-slate-200" title="Background colour">
          <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-bold" style={{ background: content.bgColor || "#fde68a", color: "#0f172a" }}>A</span>
          <input type="color" value={/^#/.test(content.bgColor || "") ? content.bgColor : "#fde68a"} onChange={(e) => onPatch({ bgColor: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
          {content.bgColor && <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPatch({ bgColor: undefined }); }} title="Clear background" className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-slate-700 text-[8px] text-white">×</button>}
        </label>
        {/* Align */}
        <div className="flex overflow-hidden rounded-md border border-slate-200">
          {(["left", "center", "right"] as const).map((a) => (
            <button key={a} type="button" title={`Align ${a}`} onClick={() => onPatch({ align: a })}
              className={`grid h-7 w-7 place-items-center text-xs ${content.align === a ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {a === "left" ? "⯇" : a === "center" ? "≡" : "⯈"}
            </button>
          ))}
        </div>
        {/* Link toggle */}
        <button type="button" className={btn(showLink || hasLink)} title="Link" onClick={() => setShowLink((s) => !s)}>🔗</button>
      </div>

      {showLink && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
          <input value={content.href ?? ""} onChange={(e) => onPatch({ href: e.target.value || undefined })}
            placeholder="https://… or /page" className="h-7 min-w-[150px] flex-1 rounded-md border border-slate-200 px-2 text-xs" />
          <select value="" onChange={(e) => { if (e.target.value) onPatch({ href: e.target.value }); }}
            className="h-7 rounded-md border border-slate-200 px-1 text-xs" title="Pick a page">
            <option value="">Page…</option>
            {pages.map((p) => <option key={p.slug} value={`/${p.slug}`}>{p.title || p.slug}</option>)}
          </select>
          <select value={content.target ?? "_self"} onChange={(e) => onPatch({ target: e.target.value })}
            className="h-7 rounded-md border border-slate-200 px-1 text-xs" title="Open in">
            <option value="_self">Same tab</option>
            <option value="_blank">New window</option>
          </select>
          {hasLink && <button type="button" onClick={() => onPatch({ href: undefined, target: undefined })} className="h-7 rounded-md border border-slate-200 px-2 text-xs text-red-500 hover:bg-red-50">Remove</button>}
        </div>
      )}
    </div>
  );
}
