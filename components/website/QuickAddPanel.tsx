"use client";

import { useEffect, useState } from "react";
import type { SectionType, SectionContent } from "@/lib/sections/schemas";
import { PREBUILT_TEMPLATES, PREBUILT_CATEGORIES, applyTemplateImages, type PrebuiltTemplate } from "@/lib/sections/prebuilt-templates";
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
  { group: "Text", items: [
    { label: "Headline", icon: I.text, type: "heading" }, { label: "Sub-Headline", icon: I.text, type: "subheading" },
    { label: "Paragraph", icon: I.text, type: "text" }, { label: "Rich Text", icon: I.text, type: "text" },
  ]},
  { group: "Lists", items: [
    { label: "Bullet List", icon: I.list, type: "bullet-list" },
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
    { label: "Testimonials", icon: I.star, type: "testimonials" }, { label: "Reviews", icon: I.star, type: "testimonials" },
    { label: "Listings", icon: I.grid, type: "listings" }, { label: "Pricing Table", icon: I.price, type: "pricing" },
    { label: "FAQ", icon: I.faq, type: "faq" }, { label: "Tabs", icon: I.grid, type: "tabs" }, { label: "Call to Action", icon: I.btn, type: "cta" },
  ]},
  { group: "Forms & Surveys", items: [{ label: "Contact Form", icon: I.form, type: "contact-form" }, { label: "Survey", icon: I.form, type: "survey" }] },
  { group: "Booking", items: [{ label: "Booking Calendar", icon: I.clock, type: "booking" }] },
  { group: "Social Media Icons", items: [{ label: "Social Icons", icon: I.social, type: "social" }] },
  { group: "Ticker", items: [{ label: "Ticker", icon: I.clock, type: "ticker" }] },
  { group: "Countdown Timers", items: [
    { label: "Countdown", icon: I.clock, type: "countdown" }, { label: "Minute Timer", icon: I.clock, type: "countdown" }, { label: "Day Timer", icon: I.clock, type: "countdown" },
  ]},
  { group: "Progress Bar", items: [{ label: "Progress Bar", icon: I.price, type: "progress-bar" }, { label: "Number Counter", icon: I.price, type: "number-counter" }] },
  { group: "Layout", items: [{ label: "Divider", icon: I.divider, type: "divider" }, { label: "Spacer", icon: I.spacer, type: "spacer" }] },
  { group: "Custom", items: [{ label: "Custom HTML", icon: I.code, type: "html" }, { label: "Code", icon: I.code, type: "html" }, { label: "SVG", icon: I.code, soon: true }] },
];

const ROWS_GROUP: Group = { group: "Rows", items: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ label: `${n} Column`, icon: I.cols, type: "row" as SectionType, cols: n })) };

const SECTION_PRESETS: Group = { group: "Add a Section", items: [
  { label: "Full Width", icon: I.cols, type: "row", cols: 1 }, { label: "Wide", icon: I.cols, type: "row", cols: 1 },
  { label: "Medium", icon: I.cols, type: "row", cols: 1 }, { label: "Small", icon: I.cols, type: "row", cols: 1 },
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
  imgUrls: string[]; onHover: (h: HoverState) => void; prebuiltCat: string; setPrebuiltCat: (c: string) => void;
  savedSlot?: React.ReactNode;
}) {
  const { mode, q, onPick, onInsert, imgUrls, onHover, prebuiltCat, setPrebuiltCat, savedSlot } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const searching = q.trim().length > 0;
  const ql = q.toLowerCase();

  type Item = { key: string; title: string } & (
    | { kind: "group"; items: QuickItem[] }
    | { kind: "prebuilt" } | { kind: "saved" } | { kind: "soon" }
  );
  const items: Item[] = [];
  if (mode === "elements") {
    for (const g of ADD_GROUPS) {
      const its = g.items.filter((it) => it.label.toLowerCase().includes(ql));
      if (its.length) items.push({ key: g.group, title: g.group, kind: "group", items: its });
    }
  } else {
    items.push({ key: "prebuilt", title: "Prebuilt Sections", kind: "prebuilt" });
    items.push({ key: "saved", title: "Saved Assets", kind: "saved" });
    if (!searching) { items.push({ key: "market", title: "Widget Marketplace", kind: "soon" }); items.push({ key: "store", title: "Store", kind: "soon" }); }
  }

  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const isOpen = searching ? (it.kind === "group" || it.kind === "prebuilt") : (it.key in open ? open[it.key] : i === 0);
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
                <Chevron open={isOpen} />
              </span>
            </button>
            {isOpen && (
              <div className="pb-3.5 pt-0.5">
                {it.kind === "group" && <div className="flex flex-col gap-1.5">{it.items.map((t) => <Tile key={t.label} it={t} onPick={onPick} />)}</div>}
                {it.kind === "prebuilt" && <div className="h-[440px]"><PrebuiltTemplates q={q} onInsert={onInsert} imgUrls={imgUrls} onHover={onHover} cat={prebuiltCat} setCat={setPrebuiltCat} /></div>}
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
  const [prebuiltCat, setPrebuiltCat] = useState<string>(PREBUILT_CATEGORIES[0]);

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
        <AddAccordion mode={view} q={q} onPick={onPick} onInsert={onInsertSections} imgUrls={imgUrls} onHover={setHover} prebuiltCat={prebuiltCat} setPrebuiltCat={setPrebuiltCat} savedSlot={savedSlot} />
      </div>
      {onAi && <button onClick={onAi} className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-sm font-semibold text-white">✨ Describe it — AI builds a section</button>}

      {/* Floating preview of the hovered prebuilt block (rendered above everything). */}
      {hover && <FloatingPreview hover={hover} />}
    </div>
  );
}
