"use client";

import { useEffect, useState } from "react";
import type { SectionType, SectionContent } from "@/lib/sections/schemas";
import { PREBUILT_TEMPLATES, PREBUILT_CATEGORIES, applyTemplateImages, type PrebuiltTemplate } from "@/lib/sections/prebuilt-templates";
import { listMedia } from "@/app/tenants/[tenantId]/website/actions";

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
  { group: "Forms & Surveys", items: [{ label: "Contact Form", icon: I.form, type: "contact-form" }, { label: "Survey", icon: I.form, soon: true }] },
  { group: "Social Media Icons", items: [{ label: "Social Icons", icon: I.social, type: "social" }] },
  { group: "Ticker", items: [{ label: "Ticker", icon: I.clock, type: "ticker" }] },
  { group: "Countdown Timers", items: [
    { label: "Countdown", icon: I.clock, type: "countdown" }, { label: "Minute Timer", icon: I.clock, type: "countdown" }, { label: "Day Timer", icon: I.clock, type: "countdown" },
  ]},
  { group: "Progress Bar", items: [{ label: "Progress Bar", icon: I.price, type: "progress-bar" }, { label: "Number Counter", icon: I.price, type: "number-counter" }] },
  { group: "Layout", items: [{ label: "Divider", icon: I.divider, type: "divider" }, { label: "Spacer", icon: I.spacer, type: "spacer" }] },
  { group: "Custom", items: [{ label: "Custom HTML", icon: I.code, type: "html" }, { label: "Code", icon: I.code, type: "html" }, { label: "SVG", icon: I.code, soon: true }] },
];

const ROWS_GROUP: Group = { group: "Rows", items: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `${n} Column`, icon: I.cols, type: "row" as SectionType, cols: n })) };

const SECTION_PRESETS: Group = { group: "Add a Section", items: [
  { label: "Full Width", icon: I.cols, type: "row", cols: 1 }, { label: "Wide", icon: I.cols, type: "row", cols: 1 },
  { label: "Medium", icon: I.cols, type: "row", cols: 1 }, { label: "Small", icon: I.cols, type: "row", cols: 1 },
] };

type Tab = "quick" | "sections" | "rows" | "elements" | "prebuilt" | "saved" | "market" | "store";
const TOP_NAV: { tab: Tab; label: string; soon?: boolean }[] = [
  { tab: "quick", label: "Quick Add" }, { tab: "sections", label: "Sections" }, { tab: "rows", label: "Rows" },
  { tab: "elements", label: "Elements" }, { tab: "prebuilt", label: "Prebuilt Sections" }, { tab: "saved", label: "Saved Assets" },
  { tab: "market", label: "Widget Marketplace", soon: true }, { tab: "store", label: "Store", soon: true },
];
// Category shortcuts → jump to Elements filtered to that group.
const CATEGORY_NAV = ["Buttons", "Forms & Surveys", "Social Media Icons", "Countdown Timers", "Images", "Progress Bar"];

function Tile({ it, onPick }: { it: QuickItem; onPick: (type: SectionType, cols?: number) => void }) {
  return (
    <button disabled={!!it.soon} draggable={!it.soon}
      onDragStart={(e) => { if (it.type) e.dataTransfer.setData("text/abc-element", it.cols ? `row:${it.cols}` : it.type); }}
      onClick={() => it.type && onPick(it.type, it.cols)}
      className={`group flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition ${it.soon ? "cursor-not-allowed border-slate-100 opacity-50" : "cursor-grab border-slate-200 hover:-translate-y-0.5 hover:border-[#1e3a8a]/40 hover:shadow-sm active:cursor-grabbing"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb]/10 to-[#22d3ee]/10 text-[#1e3a8a]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d={it.icon} /></svg>
      </span>
      <span className="text-[11px] font-medium leading-tight text-slate-700">{it.label}</span>
      {it.soon && <span className="text-[8px] uppercase text-slate-400">soon</span>}
    </button>
  );
}

/** Prebuilt template tile — designed, ready-to-drop block. Drag onto the canvas (same
 *  text/abc-template payload as Saved Assets) or click to insert. Image slots are filled
 *  with the tenant's real Media Library images. Matches the Tile look. */
function PrebuiltTile({ t, onInsert, imgUrls }: { t: PrebuiltTemplate; onInsert?: (sections: SectionContent[]) => void; imgUrls: string[] }) {
  const filled = () => applyTemplateImages(t.sections, imgUrls);
  return (
    <button
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/abc-template", JSON.stringify(filled())); }}
      onClick={() => onInsert?.(filled())}
      title={t.blurb}
      className="group flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#1e3a8a]/40 hover:shadow-sm active:cursor-grabbing">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb]/10 to-[#22d3ee]/10 text-lg">{t.icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold text-slate-700">{t.name}</span>
        <span className="block truncate text-[11px] text-slate-400">{t.blurb} · drag or click</span>
      </span>
    </button>
  );
}

function PrebuiltTemplates({ q, onInsert, imgUrls }: { q: string; onInsert?: (sections: SectionContent[]) => void; imgUrls: string[] }) {
  const ql = q.toLowerCase();
  return (
    <>
      {imgUrls.length === 0 && (
        <div className="mb-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
          Tip: upload images in the Media Library and these templates will drop in using your photos automatically.
        </div>
      )}
      {PREBUILT_CATEGORIES.map((cat) => {
        const items = PREBUILT_TEMPLATES.filter((t) => t.category === cat && (t.name.toLowerCase().includes(ql) || t.blurb.toLowerCase().includes(ql)));
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{cat}</div>
            <div className="flex flex-col gap-2">{items.map((t) => <PrebuiltTile key={t.id} t={t} onInsert={onInsert} imgUrls={imgUrls} />)}</div>
          </div>
        );
      })}
    </>
  );
}

function Groups({ groups, q, onPick }: { groups: Group[]; q: string; onPick: (t: SectionType, c?: number) => void }) {
  return (
    <>
      {groups.map((g) => {
        const items = g.items.filter((it) => it.label.toLowerCase().includes(q.toLowerCase()));
        if (!items.length) return null;
        return (
          <div key={g.group} className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.group}</div>
            <div className="grid grid-cols-2 gap-2">{items.map((it) => <Tile key={it.label} it={it} onPick={onPick} />)}</div>
          </div>
        );
      })}
    </>
  );
}

export default function QuickAddPanel({ onPick, onAi, savedSlot, onInsertSections, tenantId }: { onPick: (type: SectionType, cols?: number) => void; onAi?: () => void; savedSlot?: React.ReactNode; onInsertSections?: (sections: SectionContent[]) => void; tenantId?: string }) {
  const [tab, setTab] = useState<Tab>("quick");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [imgUrls, setImgUrls] = useState<string[]>([]);

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

  const elementGroups = catFilter ? ELEMENT_GROUPS.filter((g) => g.group === catFilter) : ELEMENT_GROUPS;
  const content = (() => {
    switch (tab) {
      case "sections": return <Groups groups={[SECTION_PRESETS]} q={q} onPick={onPick} />;
      case "rows": return <Groups groups={[ROWS_GROUP]} q={q} onPick={onPick} />;
      case "elements": return <Groups groups={elementGroups} q={q} onPick={onPick} />;
      case "prebuilt": return <PrebuiltTemplates q={q} onInsert={onInsertSections} imgUrls={imgUrls} />;
      case "saved": return savedSlot ?? <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Save any section with its ⭐ on the canvas — your saved sections will appear here and in the Templates tool.</div>;
      case "market": case "store": return <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Coming soon.</div>;
      default: return <Groups groups={[ROWS_GROUP, ...ELEMENT_GROUPS]} q={q} onPick={onPick} />;
    }
  })();

  return (
    <div className="flex h-full">
      {/* left sub-nav */}
      <div className="w-32 shrink-0 overflow-y-auto border-r border-slate-100 pr-2 text-sm">
        {TOP_NAV.map((n) => (
          <button key={n.tab} disabled={n.soon} onClick={() => { setTab(n.tab); setCatFilter(null); }}
            className={`block w-full rounded-lg px-2 py-1.5 text-left ${tab === n.tab ? "bg-[#1e3a8a]/10 font-semibold text-[#1e3a8a]" : n.soon ? "text-slate-300" : "text-slate-600 hover:bg-slate-50"}`}>
            {n.label}{n.soon && <span className="ml-1 text-[8px] uppercase">soon</span>}
          </button>
        ))}
        <div className="my-2 border-t border-slate-100" />
        {CATEGORY_NAV.map((c) => (
          <button key={c} onClick={() => { setTab("elements"); setCatFilter(c); }}
            className={`block w-full rounded-lg px-2 py-1.5 text-left ${tab === "elements" && catFilter === c ? "bg-[#1e3a8a]/10 font-semibold text-[#1e3a8a]" : "text-slate-600 hover:bg-slate-50"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col pl-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{content}</div>
        {onAi && <button onClick={onAi} className="mt-2 w-full rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-sm font-semibold text-white">✨ Describe it — AI builds a section</button>}
      </div>
    </div>
  );
}
