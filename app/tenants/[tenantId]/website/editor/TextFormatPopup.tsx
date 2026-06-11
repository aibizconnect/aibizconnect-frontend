"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import FontPicker from "@/components/design/FontPicker";
import LinkEditor from "./LinkEditor";
import type { LinkValue } from "@/lib/sections/links";
import { roleForElement, roleStyleFor, type ThemeTokens } from "@/lib/sections/theme";

/**
 * Floating text-format popup (D-220, Ali's spec). Anchors to the selected text-bearing element
 * (tagged data-abc-selected="1"), floating ABOVE it — flipping BELOW when there's no room. Holds
 * the high-frequency text controls: Font, Size, B/I/U, text/background colour, Align, Link
 * (page/url/anchor + open behavior via the shared LinkEditor).
 *
 * Covers H1–H6 (heading/subheading), Body/Quote (text), Button and List — Menu/Submenu are
 * EXCLUDED (Ali: they're handled by the Menu inspector + link plumbing).
 *
 * B/I/U are selection-aware on rich text elements: with a live text selection inside the
 * element they wrap just the selection (inline <b>/<i>/<u>, sanitized on commit); without one
 * they toggle the whole element's style fields.
 */

type Caps = {
  font: boolean;
  size: boolean;
  biu: "rich" | "element" | "none"; // rich = selection-aware; element = whole-element only
  underline: boolean;
  colorKey: string;                 // schema key for text colour
  bgKey?: string;                   // schema key for background colour
  align: boolean;
  /** schema key the Align control writes (default "align"; button → "labelAlign" — the popup
   *  is a TEXT popup, so its Align means the text INSIDE the element. The element's position
   *  in its cell lives in Styles → Size & alignment. Ali 2026-06-11.) */
  alignKey?: string;
  link: boolean;
  /** extra keys patched together with colorKey (list marker follows text colour) */
  colorAlsoKeys?: string[];
  /** href fallback when the link is removed (button.href is required) */
  hrefFallback?: string;
};

function capsFor(type: string): Caps {
  if (type === "button") {
    return { font: true, size: true, biu: "element", underline: false, colorKey: "textColor", bgKey: "bgColor", align: true, alignKey: "labelAlign", link: true, hrefFallback: "#" };
  }
  if (type === "bullet-list") {
    // link: true → edits the FOCUSED ITEM's link (lists carry per-item links, D-219).
    return { font: true, size: true, biu: "none", underline: false, colorKey: "textColor", align: false, link: true, colorAlsoKeys: ["color"] };
  }
  // heading / subheading / text (Body, Quote)
  return { font: true, size: true, biu: "rich", underline: true, colorKey: "color", bgKey: "bgColor", align: true, link: true };
}

export default function TextFormatPopup({
  content, onPatch, customFonts, tenantId, selKey, theme,
}: {
  content: any;
  onPatch: (partial: Record<string, unknown>) => void;
  customFonts: string[];
  tenantId: string;
  selKey: string;
  /** D-223: resolved theme tokens so every control pre-populates with what actually renders. */
  theme?: ThemeTokens;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [showLink, setShowLink] = useState(false);
  const caps = capsFor(String(content.type));

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
  const hasLink = !!content.href || !!content.link?.href;
  // D-223 (Ali): controls PRE-POPULATE with the value the element actually renders — the
  // theme/role cascade — never a blank/black default.
  const role = roleStyleFor(theme, content._role || roleForElement(String(content.type), content.level));
  const resolvedColor = String(content.type) === "button"
    ? (role.color || "#ffffff")
    : (role.color || theme?.colors.text);
  const resolvedBg = String(content.type) === "button" ? (role.backgroundColor || theme?.colors.primary) : role.backgroundColor;
  const resolvedSize = typeof role.fontSize === "number" ? role.fontSize : undefined;
  const color = (content[caps.colorKey] as string | undefined) || resolvedColor;
  const bg = caps.bgKey ? ((content[caps.bgKey] as string | undefined) || resolvedBg) : undefined;

  // Selection-aware inline formatting: when the user selected TEXT inside the element being
  // edited, wrap just that selection (execCommand emits <b>/<i>/<u>; InlineText sanitizes on
  // commit). Otherwise fall back to the whole-element toggle.
  const applyBiu = (cmd: "bold" | "italic" | "underline", fallback: () => void) => {
    if (caps.biu === "rich") {
      const sel = window.getSelection();
      const anchor = document.querySelector('[data-abc-selected="1"]');
      if (sel && !sel.isCollapsed && anchor && sel.anchorNode && anchor.contains(sel.anchorNode)) {
        document.execCommand("styleWithCSS", false, "false");
        document.execCommand(cmd);
        return;
      }
    }
    fallback();
  };

  const setColor = (v: string) => {
    const patch: Record<string, unknown> = { [caps.colorKey]: v };
    for (const k of caps.colorAlsoKeys ?? []) patch[k] = v;
    onPatch(patch);
  };

  const btn = (active: boolean) =>
    `grid h-7 w-7 place-items-center rounded-md border text-sm ${active ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`;
  // Format buttons must NOT steal focus/selection from the contentEditable → preventDefault.
  const keepSel = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

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
        {caps.font && <div className="w-36"><FontPicker value={content.fontFamily} onChange={(v) => onPatch({ fontFamily: v })} customFonts={customFonts} /></div>}
        {/* Size */}
        {caps.size && (
          <input type="number" min={8} max={200} value={content.fontSize ?? ""} placeholder={resolvedSize ? String(resolvedSize) : "Size"}
            onChange={(e) => onPatch({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
            className="h-7 w-16 rounded-md border border-slate-200 px-2 text-xs" title="Font size (px)" />
        )}
        {/* B / I / U */}
        {caps.biu !== "none" && (
          <>
            <button type="button" className={btn(bold)} title="Bold (selection or whole element)" onMouseDown={keepSel}
              onClick={() => applyBiu("bold", () => onPatch({ fontWeight: bold ? "400" : "700" }))}><b>B</b></button>
            <button type="button" className={btn(!!content.italic)} title="Italic" onMouseDown={keepSel}
              onClick={() => applyBiu("italic", () => onPatch({ italic: !content.italic }))}><i>I</i></button>
            {caps.underline && (
              <button type="button" className={btn(!!content.underline)} title="Underline" onMouseDown={keepSel}
                onClick={() => applyBiu("underline", () => onPatch({ underline: !content.underline }))}><u>U</u></button>
            )}
          </>
        )}
        {/* Text colour */}
        <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-slate-200" title="Text colour">
          <span className="text-[9px] font-bold leading-none" style={{ color: color || "#0f172a" }}>A</span>
          <input type="color" value={/^#/.test(color || "") ? color : "#0f172a"} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        {/* Background colour */}
        {caps.bgKey && (
          <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-slate-200" title="Background colour">
            <span className="grid h-4 w-4 place-items-center rounded text-[9px] font-bold" style={{ background: bg || "#fde68a", color: "#0f172a" }}>A</span>
            <input type="color" value={/^#/.test(bg || "") ? bg : "#fde68a"} onChange={(e) => onPatch({ [caps.bgKey!]: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
            {bg && <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPatch({ [caps.bgKey!]: undefined }); }} title="Clear background" className="absolute -right-1.5 -top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-slate-700 text-[8px] text-white">×</button>}
          </label>
        )}
        {/* Align */}
        {caps.align && (
          <div className="flex overflow-hidden rounded-md border border-slate-200">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} type="button" title={`Align text ${a}`} onClick={() => onPatch({ [caps.alignKey ?? "align"]: a })}
                className={`grid h-7 w-7 place-items-center text-xs ${content[caps.alignKey ?? "align"] === a ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                {a === "left" ? "⯇" : a === "center" ? "≡" : "⯈"}
              </button>
            ))}
          </div>
        )}
        {/* Link toggle */}
        {caps.link && <button type="button" className={btn(showLink || hasLink)} title="Link" onClick={() => setShowLink((s) => !s)}>🔗</button>}
      </div>

      {caps.link && showLink && (
        <div className="border-t border-slate-100 pt-2">
          {/* D-222: the shared LinkEditor — page / URL / anchor + open behavior. href stays
              materialized so renderers (and legacy data) keep working unchanged. */}
          {content.type === "bullet-list" ? (() => {
            // Lists: the link belongs to the item LAST FOCUSED on the canvas (the list root
            // records data-abc-focus-idx). No focused item yet → ask the user to click one.
            const root = document.querySelector('[data-abc-selected="1"] [data-abc-list]') as HTMLElement | null;
            const idxRaw = root?.getAttribute("data-abc-focus-idx");
            const idx = idxRaw != null ? Number(idxRaw) : NaN;
            const items: any[] = Array.isArray(content.items) ? content.items : [];
            if (!Number.isInteger(idx) || idx < 0 || idx >= items.length) {
              return <span className="text-[11px] text-slate-400">Click into a list item first, then set its link here.</span>;
            }
            return (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Link for item {idx + 1}: “{String(items[idx]?.text ?? "").slice(0, 40)}”</span>
                <LinkEditor
                  value={items[idx]?.link}
                  onChange={(lv) => onPatch({ items: items.map((it, j) => (j === idx ? { ...it, link: lv } : it)) })}
                  tenantId={tenantId}
                />
              </div>
            );
          })() : (
            <LinkEditor
              value={(content.link as LinkValue | undefined) ?? content.href}
              onChange={(lv) => onPatch({ link: lv, href: lv?.href ?? caps.hrefFallback, target: lv?.target })}
              tenantId={tenantId}
            />
          )}
        </div>
      )}
    </div>
  );
}
