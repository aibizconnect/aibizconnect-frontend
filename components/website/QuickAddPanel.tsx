"use client";

import { useEffect, useState } from "react";
import type { SectionType, SectionContent } from "@/lib/sections/schemas";
import { PREBUILT_TEMPLATES, PREBUILT_CATEGORIES, applyTemplateImages, type PrebuiltTemplate } from "@/lib/sections/prebuilt-templates";
import { LAYOUT_RECIPES, composeSection, type LayoutRecipe } from "@/lib/sections/layout-recipes";
import { PAGE_ARCHETYPES, type PageArchetype } from "@/lib/sites/page-archetypes";
import { listMedia } from "@/app/tenants/[tenantId]/website/actions";
import { SectionView } from "@/components/sections/registry";
import { DEFAULT_THEME } from "@/lib/sections/theme";

/**
 * polished Add-Elements panel rendered as the LEFT column. A functional left sub-nav
 * (Quick Add · Sections · Rows · Elements · Prebuilt Sections · Saved Assets · …) where
 * each tab shows its own content. `onPick(type, cols?)` inserts a real element.
 */

export type QuickItem = { label: string; icon: string; type?: SectionType; cols?: number; soon?: boolean };
type Group = { group: string; items: QuickItem[] };

const I = {
  text: "M4 7V5h16v2M9 5v14M7 19h4", img: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6", btn: "M4 9h16v6H4zM8 12h8",
  hero: "M3 4h18v7H3zM7 15h10M7 19h6", grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  star: "M12 2l3 7 7 .5-5 4.5 1.5 7L12 17l-6 4 1.5-7-5-4.5 7-.5z", form: "M5 4h14v16H5zM8 9h8M8 13h8M8 17h4",
  divider: "M3 12h18", spacer: "M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4", video: "M4 5h16v14H4zM10 9l5 3-5 3z",
  code: "M8 6l-5 6 5 6M16 6l5 6-5 6", clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4l3 2",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3z", price: "M4 7h16v10H4zM8 12h8", faq: "M9 9a3 3 0 1 1 4 2.8c-1 .5-1 1.2-1 2.2M12 17h.01",
  cols: "M4 5h16v14H4zM10 5v14M14 5v14", map: "M9 4l6 2 6-2v14l-6 2-6-2-6 2V6z", social: "M18 8a3 3 0 1 0-2.8-4M6 12a3 3 0 1 0 0 .1M18 16a3 3 0 1 0-2.8 4M8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", numlist: "M10 6h11M10 12h11M10 18h11M4 6h1v4M4 16h2M4 16a1 1 0 1 1 1.7.7L4 20h2",
};

// Leaf + composite ELEMENT groups (everything except Rows). Used by the Elements tab,
// the Quick Add tab, and the category shortcuts.
const ELEMENT_GROUPS: Group[] = [
  // TEXT = the plain H-scale (Ali): H1–H5, Body (P), Quote. Each maps 1:1 to a Typography role,
  // so the site-wide Typography panel drives every instance.
  { group: "Text", items: [
    { label: "H1", icon: I.text, type: "heading@h1" as SectionType },
    { label: "H2", icon: I.text, type: "heading@h2" as SectionType },
    { label: "H3", icon: I.text, type: "heading@h3" as SectionType },
    { label: "H4", icon: I.text, type: "heading@h4" as SectionType },
    { label: "H5", icon: I.text, type: "heading@h5" as SectionType },
    { label: "Body (P)", icon: I.text, type: "text" },
    { label: "Quote", icon: I.text, type: "text@quote" as SectionType },
  ]},
  { group: "Lists", items: [
    { label: "Bullet List", icon: I.list, type: "bullet-list" },
    { label: "Numbered List", icon: I.list, type: "bullet-list@numbered" as SectionType },
  ]},
  { group: "Buttons", items: [{ label: "Button", icon: I.btn, type: "button" }] },
  { group: "Icon", items: [{ label: "Icon", icon: I.star, type: "icon" }] },
  { group: "Images", items: [
    { label: "Image", icon: I.img, type: "image" }, { label: "Photo Gallery", icon: I.img, type: "gallery" },
    { label: "Slideshow", icon: I.img, type: "slider" }, { label: "Logo Showcase", icon: I.img, type: "logos" },
  ]},
  { group: "Media", items: [
    { label: "Video", icon: I.video, type: "video" }, { label: "Audio", icon: I.video, type: "audio" }, { label: "Map", icon: I.map, type: "map" }, { label: "QR Code", icon: I.qr, type: "qr" },
  ]},
  { group: "Sections", items: [
    { label: "Hero", icon: I.hero, type: "hero" }, { label: "Features", icon: I.grid, type: "features" },
    { label: "Testimonials", icon: I.star, type: "testimonials" },
    { label: "Listings (live MLS)", icon: I.grid, type: "listings" }, { label: "Pricing Table", icon: I.price, type: "pricing" },
    { label: "FAQ", icon: I.faq, type: "faq" }, { label: "Tabs", icon: I.grid, type: "tabs" }, { label: "Call to Action", icon: I.btn, type: "cta" },
  ]},
  { group: "Forms & Surveys", items: [{ label: "Contact Form", icon: I.form, type: "contact-form" }, { label: "Survey", icon: I.form, type: "survey" }] },
  { group: "Calendar", items: [{ label: "Calendar / Booking", icon: I.clock, type: "booking" }] },
  { group: "Social Media Icons", items: [{ label: "Social Icons", icon: I.social, type: "social" }] },
  { group: "Ticker", items: [
    { label: "Text Ticker", icon: I.clock, type: "ticker" },
    { label: "Image Ticker", icon: I.img, type: "ticker@images" as SectionType },
  ]},
  { group: "Countdown Timers", items: [
    { label: "Countdown", icon: I.clock, type: "countdown" }, { label: "Minute Timer", icon: I.clock, type: "countdown@minute" as SectionType }, { label: "Day Countdown", icon: I.clock, type: "countdown@day" as SectionType },
  ]},
  // Number Counter = a Countdown counter-mode preset (D-198) — the legacy number-counter element
  // keeps rendering on existing pages but is no longer offered as a separate thing.
  { group: "Progress Bar", items: [{ label: "Progress Bar", icon: I.price, type: "progress-bar" }, { label: "Number Counter", icon: I.price, type: "countdown@counter" as SectionType }] },
  { group: "Layout", items: [{ label: "Divider", icon: I.divider, type: "divider" }, { label: "Spacer", icon: I.spacer, type: "spacer" }] },
  { group: "Custom", items: [{ label: "Custom HTML", icon: I.code, type: "html" }, { label: "SVG", icon: I.code, soon: true }] },
];

const ROWS_GROUP: Group = { group: "Rows", items: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ label: `${n} Column`, icon: I.cols, type: "row" as SectionType, cols: n })) };

// REAL width tiers (Ali — these four used to create identical rows): full = edge-to-edge,
// wide = 1200px, medium = 960px, small = 720px. The tier is editable later in the inspector.
const SECTION_PRESETS: Group = { group: "Add a Section", items: [
  { label: "Full Width", icon: I.cols, type: "row@full" as SectionType },
  { label: "Wide", icon: I.cols, type: "row@wide" as SectionType },
  { label: "Medium", icon: I.cols, type: "row@medium" as SectionType },
  { label: "Small", icon: I.cols, type: "row@small" as SectionType },
] };

// The whole panel = one collapsible accordion: Sections, Rows, every element group.
const ADD_GROUPS: Group[] = [SECTION_PRESETS, ROWS_GROUP, ...ELEMENT_GROUPS];
const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
);

function Tile({ it, onPick }: { it: QuickItem; onPick: (type: SectionType, cols?: number) => void }) {
  // One per row — a full-width horizontal item (icon + label), stacked in a single column.
  return (
    <button disabled={!!it.soon} draggable={!it.soon}
      onDragStart={(e) => { if (it.type) e.dataTransfer.setData("text/abc-element", it.cols ? `row:${it.cols}` : it.type); }}
      onClick={() => it.type && onPick(it.type, it.cols)}
      className={`group flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${it.soon ? "cursor-not-allowed border-slate-100 opacity-50" : "cursor-grab border-slate-200 hover:border-slate-400 hover:bg-slate-50 active:cursor-grabbing"}`}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-900">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d={it.icon} /></svg>
      </span>
      <span className="text-[13px] font-medium text-slate-700">{it.label}</span>
      {it.soon && <span className="ml-auto text-[8px] uppercase text-slate-400">soon</span>}
    </button>
  );
}

type HoverState = { t: PrebuiltTemplate; sections: SectionContent[]; top: number; left: number } | null;

/** One Phase-3 layout recipe as an insertable row. Composes the recipe with on-brand
 *  fact-free defaults; the section inherits the site theme via --abc-* tokens. */
function RecipeRow({ r, onInsert, tenantId }: { r: LayoutRecipe; onInsert?: (sections: SectionContent[]) => void; tenantId?: string }) {
  const [busy, setBusy] = useState(false);
  const compose = () => [composeSection(r) as unknown as SectionContent];
  // Smart fill: ask the server (Gemini 2.5 Flash) to write on-brand copy for this recipe,
  // then insert. Falls back to the default-copy section if the model is unavailable.
  const aiInsert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenantId || busy) return;
    setBusy(true);
    try {
      const { aiFillRecipe } = await import("@/app/tenants/[tenantId]/website/editor/recipe-actions");
      const res = await aiFillRecipe(tenantId, r.key);
      onInsert?.([(res.ok && res.content ? res.content : composeSection(r)) as unknown as SectionContent]);
    } catch {
      onInsert?.(compose());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/abc-template", JSON.stringify(compose())); }}
      onClick={() => onInsert?.(compose())}
      title={`${r.name} — generated, on-brand`}
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm active:cursor-grabbing">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-[12px] text-white">✦</span>
      <span className="flex-1 truncate text-[13px] font-medium text-slate-900">{r.name}</span>
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{r.semanticType}</span>
      {tenantId && (
        <button type="button" onClick={aiInsert} disabled={busy} title="Write on-brand copy with AI, then insert"
          className="shrink-0 rounded-md bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-1.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60">
          {busy ? "…" : "✨ AI"}
        </button>
      )}
    </div>
  );
}

/** One Phase-4 page archetype as an insertable row. Inserts a full ordered page of recipe
 *  sections — default (free, instant) on click, or AI-written copy via the ✨ button. */
function PageRow({ a, onInsert, tenantId }: { a: PageArchetype; onInsert?: (sections: SectionContent[]) => void; tenantId?: string }) {
  const [busy, setBusy] = useState(false);
  const run = async (ai: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!tenantId || busy) return;
    setBusy(true);
    try {
      const { generatePageSections } = await import("@/app/tenants/[tenantId]/website/editor/recipe-actions");
      const res = await generatePageSections(tenantId, a.key, ai);
      if (res.ok && res.sections?.length) onInsert?.(res.sections as unknown as SectionContent[]);
    } catch { /* ignore — nothing inserted */ } finally { setBusy(false); }
  };
  return (
    <div onClick={() => run(false)} title={`${a.name} — ${a.sections.length} sections`}
      className="group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 text-[12px] text-white">▤</span>
      <span className="flex-1 truncate text-[13px] font-medium text-slate-900">{a.name}</span>
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{a.sections.length} sec</span>
      {tenantId && (
        <button type="button" onClick={(e) => run(true, e)} disabled={busy} title="Build the page with AI-written on-brand copy"
          className="shrink-0 rounded-md bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-1.5 py-1 text-[10px] font-semibold text-white disabled:opacity-60">
          {busy ? "…" : "✨ AI"}
        </button>
      )}
    </div>
  );
}

/** One prebuilt template as a list row (GHL-style). Minimal icon + name; hovering opens
 *  the larger FLOATING preview to the right. Drag onto the canvas or click to insert. */
function PrebuiltRow({ t, onInsert, imgUrls, onHover }: { t: PrebuiltTemplate; onInsert?: (sections: SectionContent[]) => void; imgUrls: string[]; onHover: (h: HoverState) => void }) {
  const filled = () => applyTemplateImages(t.sections, imgUrls);
  const enter = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.min(r.right + 14, vw - 440);   // park to the right of the panel
    const top = Math.max(12, Math.min(r.top - 8, vh - 360));
    onHover({ t, sections: filled(), top, left });
  };
  return (
    <button
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/abc-template", JSON.stringify(filled())); onHover(null); }}
      onClick={() => onInsert?.(filled())}
      onMouseEnter={enter}
      onMouseLeave={() => onHover(null)}
      title={t.blurb}
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-sm active:cursor-grabbing">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-base text-slate-900">{t.icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-medium text-slate-800">{t.name}</span>
        <span className="block truncate text-[10px] text-slate-400">{t.blurb}</span>
      </span>
    </button>
  );
}

/** Larger floating preview window — renders the actual sections (scaled) so you can see
 *  exactly what the block looks like before dropping it. */
function FloatingPreview({ hover }: { hover: NonNullable<HoverState> }) {
  return (
    <div className="pointer-events-none fixed z-[9999] w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      style={{ top: hover.top, left: hover.left, maxHeight: "80vh" }}>
      <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
        {hover.t.name}<span className="font-normal text-slate-400"> — {hover.t.blurb}</span>
      </div>
      {/* Render at desktop width, then zoom down so the proportions are faithful. */}
      <div style={{ zoom: 0.38 } as React.CSSProperties}>
        <div style={{ width: 1100 }}>
          {hover.sections.map((s, i) => <SectionView key={i} content={s as Record<string, unknown>} theme={DEFAULT_THEME} />)}
        </div>
      </div>
    </div>
  );
}

/** GHL-style prebuilt browser: a category list (left) + the selected category's templates
 *  as a vertical list (right). Hovering a template opens the floating preview. */
function PrebuiltTemplates({ q, onInsert, imgUrls, onHover, cat, setCat }: { q: string; onInsert?: (sections: SectionContent[]) => void; imgUrls: string[]; onHover: (h: HoverState) => void; cat: string; setCat: (c: string) => void }) {
  const ql = q.toLowerCase();
  const match = (t: PrebuiltTemplate) => t.name.toLowerCase().includes(ql) || t.blurb.toLowerCase().includes(ql) || t.category.toLowerCase().includes(ql);
  const byCat = PREBUILT_CATEGORIES.map((c) => ({ c, items: PREBUILT_TEMPLATES.filter((t) => t.category === c && match(t)) }));
  const visible = byCat.filter((x) => x.items.length); // hide empty categories (esp. while searching)
  const active = visible.find((x) => x.c === cat)?.c ?? visible[0]?.c ?? cat;
  const list = byCat.find((x) => x.c === active)?.items ?? [];
  if (!visible.length) return <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">No matching sections.</div>;
  return (
    <div className="flex h-full gap-2">
      {/* category list */}
      <div className="w-28 shrink-0 overflow-y-auto border-r border-slate-100 pr-1.5 text-sm">
        {visible.map(({ c, items }) => (
          <button key={c} onClick={() => setCat(c)}
            className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[12px] transition ${c === active ? "bg-slate-900 font-semibold text-white" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="truncate">{c}</span>
            <span className={`ml-1 shrink-0 text-[10px] ${c === active ? "text-white/70" : "text-slate-400"}`}>{items.length}</span>
          </button>
        ))}
      </div>
      {/* templates in the active category */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pr-1">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{active}</div>
        <div className="flex flex-col gap-2">
          {list.map((t) => <PrebuiltRow key={t.id} t={t} onInsert={onInsert} imgUrls={imgUrls} onHover={onHover} />)}
        </div>
      </div>
    </div>
  );
}

/** The entire Add panel as ONE column of collapsible items — element groups, then Prebuilt
 *  Sections, Saved Assets, and the coming-soon Marketplace/Store. Each item expands to its own
 *  content. Only the first group is open by default; searching auto-expands matching items. */
function AddAccordion(props: {
  mode: "elements" | "library";
  q: string; onPick: (t: SectionType, c?: number) => void; onInsert?: (s: SectionContent[]) => void;
  imgUrls: string[]; onHover: (h: HoverState) => void;
  savedSlot?: React.ReactNode; tenantId?: string;
}) {
  const { mode, q, onPick, onInsert, imgUrls, onHover, savedSlot, tenantId } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const searching = q.trim().length > 0;
  const ql = q.toLowerCase();

  type Item = { key: string; title: string } & (
    | { kind: "group"; items: QuickItem[] }
    | { kind: "prebuiltCat"; templates: PrebuiltTemplate[] }
    | { kind: "recipes"; recipes: LayoutRecipe[] }
    | { kind: "pages"; pages: PageArchetype[] }
    | { kind: "saved" } | { kind: "soon" }
  );
  const items: Item[] = [];
  if (mode === "elements") {
    for (const g of ADD_GROUPS) {
      const its = g.items.filter((it) => it.label.toLowerCase().includes(ql));
      if (its.length) items.push({ key: g.group, title: g.group, kind: "group", items: its });
    }
  } else {
    // AI Sections (Beta) — token-driven generated recipes (Phase-3). Insert composes the
    // recipe with on-brand fact-free defaults; --abc-* tokens make it match the site theme.
    const pages = PAGE_ARCHETYPES.filter((a) => a.name.toLowerCase().includes(ql));
    if (pages.length) items.push({ key: "pages", title: "Page Layouts (Beta)", kind: "pages", pages });
    const recs = LAYOUT_RECIPES.filter((r) => r.name.toLowerCase().includes(ql));
    if (recs.length) items.push({ key: "recipes", title: "AI Sections (Beta)", kind: "recipes", recipes: recs });
    // Each Prebuilt category is its own collapsible header (like the element groups),
    // expanding to its templates as one-per-row items.
    for (const cat of PREBUILT_CATEGORIES) {
      const ts = PREBUILT_TEMPLATES.filter((t) => t.category === cat && (t.name.toLowerCase().includes(ql) || t.blurb.toLowerCase().includes(ql)));
      if (ts.length) items.push({ key: `pb:${cat}`, title: cat, kind: "prebuiltCat", templates: ts });
    }
    items.push({ key: "saved", title: "Saved Assets", kind: "saved" });
    if (!searching) { items.push({ key: "market", title: "Widget Marketplace", kind: "soon" }); items.push({ key: "store", title: "Store", kind: "soon" }); }
  }

  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const isOpen = searching ? (it.kind === "group" || it.kind === "prebuiltCat" || it.kind === "recipes" || it.kind === "pages") : (it.key in open ? open[it.key] : false);
        const soon = it.kind === "soon";
        return (
          <div key={it.key} className="border-b border-slate-100 last:border-0">
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [it.key]: !isOpen }))}
              className="flex w-full items-center justify-between py-2.5 text-left">
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${soon ? "text-slate-300" : "text-slate-500"}`}>
                {it.title}{soon && <span className="ml-1 text-[8px]">soon</span>}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                {it.kind === "group" && <span className="text-[10px]">{it.items.length}</span>}
                {it.kind === "prebuiltCat" && <span className="text-[10px]">{it.templates.length}</span>}
                {it.kind === "recipes" && <span className="text-[10px]">{it.recipes.length}</span>}
                {it.kind === "pages" && <span className="text-[10px]">{it.pages.length}</span>}
                <Chevron open={isOpen} />
              </span>
            </button>
            {isOpen && (
              <div className="pb-3.5 pt-0.5">
                {it.kind === "group" && <div className="flex flex-col gap-1.5">{it.items.map((t) => <Tile key={t.label} it={t} onPick={onPick} />)}</div>}
                {it.kind === "prebuiltCat" && <div className="flex flex-col gap-2">{it.templates.map((t) => <PrebuiltRow key={t.id} t={t} onInsert={onInsert} imgUrls={imgUrls} onHover={onHover} />)}</div>}
                {it.kind === "recipes" && <div className="flex flex-col gap-1.5">{it.recipes.map((r) => <RecipeRow key={r.key} r={r} onInsert={onInsert} tenantId={tenantId} />)}</div>}
                {it.kind === "pages" && <div className="flex flex-col gap-1.5">{it.pages.map((a) => <PageRow key={a.key} a={a} onInsert={onInsert} tenantId={tenantId} />)}</div>}
                {it.kind === "saved" && (savedSlot ?? <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Save any section with its ⭐ on the canvas — your saved sections appear here.</div>)}
                {soon && <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">Coming soon.</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function QuickAddPanel({ onPick, onAi, savedSlot, onInsertSections, tenantId }: { onPick: (type: SectionType, cols?: number) => void; onAi?: () => void; savedSlot?: React.ReactNode; onInsertSections?: (sections: SectionContent[]) => void; tenantId?: string }) {
  const [view, setView] = useState<"elements" | "library">("elements");
  const [q, setQ] = useState("");
  const [imgUrls, setImgUrls] = useState<string[]>([]);
  const [hover, setHover] = useState<HoverState>(null);

  // Load the tenant's PHOTO images once so prebuilt templates can drop in using real photos.
  // Exclude brand assets (logos / wordmarks / mascot / icons) so a hero never gets a logo.
  useEffect(() => {
    if (!tenantId) return;
    listMedia(tenantId)
      .then((items) => {
        const photos = items.filter((m) =>
          /^image\//.test(m.mime_type || "") &&
          !/logo|mark|wordmark|robot|mascot|icon|favicon|emoji/i.test(`${m.filename || ""} ${m.storage_path || ""}`));
        setImgUrls(photos.map((m) => m.url).slice(0, 24));
      })
      .catch(() => {});
  }, [tenantId]);

  // Two views via a top toggle: "Elements & Rows" (the element accordion) and
  // "Prebuilt & Saved" (prebuilt + saved). One column, collapsible items in each.
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([["elements", "Elements & Rows"], ["library", "Prebuilt & Saved"]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[13px] font-medium transition ${view === v ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
        className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <AddAccordion mode={view} q={q} onPick={onPick} onInsert={onInsertSections} imgUrls={imgUrls} onHover={setHover} savedSlot={savedSlot} tenantId={tenantId} />
      </div>
      {onAi && <button onClick={onAi} className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-sm font-semibold text-white">✨ Describe it — AI builds a section</button>}

      {/* Floating preview of the hovered prebuilt block (rendered above everything). */}
      {hover && <FloatingPreview hover={hover} />}
    </div>
  );
}
