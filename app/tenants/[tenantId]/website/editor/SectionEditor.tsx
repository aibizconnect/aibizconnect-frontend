"use client";

import { useEffect, useState } from "react";
import {
  sectionSchemas,
  sectionLabels,
  type SectionContent,
  type SectionType,
} from "@/lib/sections/schemas";
import {
  sectionFieldSpecs,
  emptyItemFor,
  type FieldSpec,
} from "@/lib/sections/fieldSpecs";
import MediaPickerModal from "./MediaPickerModal";
import LinkEditor from "./LinkEditor";
import type { LinkValue } from "@/lib/sections/links";
import FontPicker from "@/components/design/FontPicker";
import { FONT_ROLES } from "@/lib/sections/theme";
import { StylesPanel, AnimationsPanel, Group } from "@/components/design/ElementInspector";
import { resolveStyle, type ElementStyle, type ElementAnimation, type Breakpoint } from "@/lib/design/element-style";

interface SectionEditorProps {
  section: SectionContent | null;
  onUpdate: (updated: SectionContent) => void;
  tenantId?: string;
  customFonts?: string[]; // uploaded font names (so the font picker lists them)
  breakpoint?: Breakpoint; // active editing breakpoint (desktop writes base; tablet/mobile write overrides)
}

const IMAGE_KEY_RE = /image|img|icon|logo|avatar/i;

/** Renders one field (recursively for objects/arrays). */
function FieldRenderer({
  spec,
  value,
  onChange,
  onPickImage,
  customFonts = [],
}: {
  spec: FieldSpec;
  value: any;
  onChange: (next: any) => void;
  onPickImage?: (apply: (url: string) => void) => void;
  customFonts?: string[];
}) {
  if (spec.kind === "text") {
    const v = value ?? "";
    // Treat a field as image-pickable when EITHER its key or its human label looks like an
    // image field — the image element's field is key "url" / label "Image URL", which the
    // key-only check missed (so it had no Media button).
    const isImage = IMAGE_KEY_RE.test(spec.key) || IMAGE_KEY_RE.test(spec.label || "");
    return (
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{spec.label}</span>
        {spec.multiline ? (
          <textarea
            value={v}
            rows={3}
            onChange={(e) => onChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1"
          />
        ) : (
          <div className="flex gap-1">
            <input
              type="text"
              value={v}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
            />
            {isImage && onPickImage && (
              <button
                type="button"
                onClick={() => onPickImage(onChange)}
                className="shrink-0 rounded bg-[#1e3a8a] px-2 text-xs font-medium text-white"
              >
                Media
              </button>
            )}
          </div>
        )}
      </label>
    );
  }

  if (spec.kind === "select") {
    // Font family → rich Google-Fonts picker (each shown in its own face).
    if (spec.key === "fontFamily") {
      return (
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{spec.label}</span>
          <FontPicker value={value} onChange={onChange} customFonts={customFonts} />
        </label>
      );
    }
    // Alignment → segmented icon control (polished).
    if (spec.key === "align" && spec.options.join() === "left,center,right") {
      const cur = value ?? "left";
      const ICONS: Record<string, string> = { left: "M3 5h18M3 10h12M3 15h18M3 20h12", center: "M3 5h18M6 10h12M3 15h18M6 20h12", right: "M3 5h18M9 10h12M3 15h18M9 20h12" };
      return (
        <label className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{spec.label}</span>
          <div className="flex overflow-hidden rounded-md border border-gray-300">
            {spec.options.map((o) => (
              <button key={o} type="button" onClick={() => onChange(o)} title={o}
                className={`flex h-7 w-8 items-center justify-center ${cur === o ? "bg-[#1e3a8a] text-white" : "bg-white text-gray-500 hover:bg-gray-100"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5"><path d={ICONS[o]} /></svg>
              </button>
            ))}
          </div>
        </label>
      );
    }
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{spec.label}</span>
        <select
          value={value ?? spec.options[0]}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[60%] rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {spec.options.map((o) => (
            <option key={o} value={o}>
              {o === "" ? "(default)" : o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (spec.kind === "color") {
    const hex = typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : "#000000";
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{spec.label}</span>
        <div className="flex items-center gap-1.5">
          <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 shrink-0 rounded border border-gray-300" />
          <input type="text" value={value ?? ""} placeholder="#000000 / inherit" onChange={(e) => onChange(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-xs" />
          {value && <button type="button" onClick={() => onChange("")} title="Clear" className="text-xs text-gray-400 hover:text-gray-700">✕</button>}
        </div>
      </label>
    );
  }

  if (spec.kind === "boolean") {
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{spec.label}</span>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      </label>
    );
  }

  if (spec.kind === "number") {
    const hasRange = spec.min != null && spec.max != null;
    const set = (v: string) => onChange(v === "" ? undefined : Number(v));
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-sm font-medium">{spec.label}</span>
        <div className="flex flex-1 items-center justify-end gap-2">
          {hasRange && (
            <input type="range" min={spec.min} max={spec.max} step={spec.step ?? 1}
              value={value ?? spec.min} onChange={(e) => set(e.target.value)}
              className="h-1 flex-1 accent-[#1e3a8a]" />
          )}
          <input type="number" value={value ?? ""} min={spec.min} max={spec.max} step={spec.step ?? 1}
            onChange={(e) => set(e.target.value)}
            className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-sm" />
          {spec.unit && <span className="w-5 text-xs text-gray-400">{spec.unit}</span>}
        </div>
      </label>
    );
  }

  if (spec.kind === "object") {
    const obj = value ?? {};
    return (
      <fieldset className="rounded border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">{spec.label}</legend>
        <div className="flex flex-col gap-3">
          {spec.fields.map((f) => (
            <FieldRenderer
              key={f.key}
              spec={f}
              value={obj[f.key]}
              onChange={(v) => onChange({ ...obj, [f.key]: v })}
              onPickImage={onPickImage}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  // array
  const items: any[] = Array.isArray(value) ? value : [];
  return (
    <fieldset className="rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium">{spec.label}</legend>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <div key={i} className="rounded bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-gray-500">
                {spec.itemLabel} {i + 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...items];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                  className="text-xs text-gray-600 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={i === items.length - 1}
                  onClick={() => {
                    const next = [...items];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    onChange(next);
                  }}
                  className="text-xs text-gray-600 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {spec.itemFields.map((f) => (
                <FieldRenderer
                  key={f.key}
                  spec={f}
                  value={item?.[f.key]}
                  onChange={(v) => {
                    const next = [...items];
                    next[i] = { ...(item ?? {}), [f.key]: v };
                    onChange(next);
                  }}
                  onPickImage={onPickImage}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, emptyItemFor(spec.itemFields)])}
          className="self-start rounded bg-gray-200 px-3 py-1 text-sm"
        >
          + Add {spec.itemLabel}
        </button>
      </div>
    </fieldset>
  );
}

type MenuItem = {
  label: string; href: string; link?: LinkValue;
  children?: { label: string; href: string; link?: LinkValue }[];
};

/**
 * Right-panel menu editor: lists each top-level item; every item is a row that is
 * COLLAPSED first and expands on click (and stays open until clicked again) to
 * reveal its link + its submenu children (add / reorder / remove). This is the
 * "list the items on the right panel, each with a submenu ready to expand" UX.
 */
function MenuItemsEditor({ items, onChange, tenantId }: { items: MenuItem[]; onChange: (next: MenuItem[]) => void; tenantId: string }) {
  const [open, setOpen] = useState<Set<number>>(new Set()); // collapsed-first; persists until re-clicked
  const toggle = (i: number) => setOpen((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const list = Array.isArray(items) ? items : [];
  const setItem = (i: number, patch: Partial<MenuItem>) => onChange(list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => { const n = [...list]; const t = i + d; if (t < 0 || t >= n.length) return; [n[i], n[t]] = [n[t], n[i]]; onChange(n); };
  const remove = (i: number) => onChange(list.filter((_, j) => j !== i));
  const addItem = () => { onChange([...list, { label: "New item", href: "#" }]); };

  const setKid = (i: number, k: number, patch: Partial<{ label: string; href: string; link?: LinkValue }>) =>
    setItem(i, { children: (list[i].children ?? []).map((c, j) => (j === k ? { ...c, ...patch } : c)) });
  const addKid = (i: number) => setItem(i, { children: [...(list[i].children ?? []), { label: "Submenu link", href: "#" }] });
  const removeKid = (i: number, k: number) => setItem(i, { children: (list[i].children ?? []).filter((_, j) => j !== k) });
  const moveKid = (i: number, k: number, d: number) => { const kids = [...(list[i].children ?? [])]; const t = k + d; if (t < 0 || t >= kids.length) return; [kids[k], kids[t]] = [kids[t], kids[k]]; setItem(i, { children: kids }); };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Menu items</span>
      {list.map((it, i) => {
        const isOpen = open.has(i);
        const kids = it.children ?? [];
        return (
          <div key={i} className="rounded border border-gray-200">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" onClick={() => toggle(i)} className="grid h-5 w-5 place-items-center rounded text-[10px] text-gray-400 hover:bg-gray-100" title={isOpen ? "Collapse" : "Expand"}>
                <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>▸</span>
              </button>
              <input value={it.label} onChange={(e) => setItem(i, { label: e.target.value })} className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm" />
              {kids.length > 0 && <span className="shrink-0 rounded bg-gray-100 px-1 text-[10px] text-gray-500">{kids.length}</span>}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-xs text-gray-500 disabled:opacity-30">▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} className="text-xs text-gray-500 disabled:opacity-30">▼</button>
              <button type="button" onClick={() => remove(i)} className="text-xs text-red-600">✕</button>
            </div>
            {isOpen && (
              <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
                {/* D-222: structured link — page / URL / anchor + open behavior. href stays
                    materialized so the renderer (and legacy data) keep working unchanged. */}
                <LinkEditor
                  label="Link"
                  value={it.link ?? it.href}
                  onChange={(lv) => setItem(i, { link: lv, href: lv?.href || "#" })}
                  tenantId={tenantId}
                />
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Submenu</div>
                {kids.map((c, k) => (
                  <div key={k} className="flex flex-col gap-1 rounded border border-gray-200 bg-white px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input value={c.label} onChange={(e) => setKid(i, k, { label: e.target.value })} placeholder="Label" className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs" />
                      <button type="button" onClick={() => moveKid(i, k, -1)} disabled={k === 0} className="text-xs text-gray-500 disabled:opacity-30">▲</button>
                      <button type="button" onClick={() => moveKid(i, k, 1)} disabled={k === kids.length - 1} className="text-xs text-gray-500 disabled:opacity-30">▼</button>
                      <button type="button" onClick={() => removeKid(i, k)} className="text-xs text-red-600">✕</button>
                    </div>
                    <LinkEditor
                      value={c.link ?? c.href}
                      onChange={(lv) => setKid(i, k, { link: lv, href: lv?.href || "#" })}
                      tenantId={tenantId}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => addKid(i)} className="self-start rounded bg-gray-200 px-2 py-1 text-xs">+ Add submenu link</button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addItem} className="self-start rounded bg-gray-200 px-3 py-1 text-sm">+ Add menu item</button>
    </div>
  );
}

export default function SectionEditor({
  section,
  onUpdate,
  tenantId,
  customFonts = [],
  breakpoint = "desktop",
}: SectionEditorProps) {
  const [value, setValue] = useState<any>(section);
  const [errors, setErrors] = useState<string[]>([]);
  // Default to the first tab that actually has content for this element type, so
  // clicking ANY element always lands on changeable properties (empty-General
  // elements like a divider open straight on Styles). Runs per mount; Canvas
  // remounts this via `key` on every selection change, so switching repaints.
  const [tab, setTab] = useState<"content" | "styles" | "animations">(() => {
    const t = (section as any)?.type as SectionType | undefined;
    if (t === "menu") return "content";
    return t && (sectionFieldSpecs[t]?.length ?? 0) > 0 ? "content" : "styles";
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickApply, setPickApply] = useState<((url: string) => void) | null>(
    null
  );

  // Re-seed when a different section is selected (Canvas also remounts via key).
  useEffect(() => {
    setValue(section);
    setErrors([]);
  }, [section]);

  function handlePickImage(apply: (url: string) => void) {
    // store the callback (wrap so React doesn't treat it as a state updater)
    setPickApply(() => apply);
    setPickerOpen(true);
  }

  if (!value) {
    return <div className="text-gray-500">No section selected</div>;
  }

  const type = value.type as SectionType;
  // For text elements, the high-frequency controls (font/size/style/colour/align/link) now
  // live in the floating popup near the text — hide them here so the side panel stays short.
  // Advanced controls (line-height, spacing, transform, gradient, role/level) remain in the panel.
  const POPUP_KEYS = new Set(["fontFamily", "fontSize", "fontWeight", "italic", "color", "align", "href", "target", "rel"]);
  const isTextEl = type === "heading" || type === "subheading" || type === "text";
  const specs = (sectionFieldSpecs[type] ?? []).filter((s: any) => !(isTextEl && POPUP_KEYS.has(s.key)));

  // Preserve presentational/meta keys (_style, _anim, _name, _role) that the Zod
  // schema for element types would otherwise strip on parse.
  function withMeta(parsed: any, src: any) {
    const meta = Object.fromEntries(Object.entries(src).filter(([k]) => k.startsWith("_")));
    return { ...parsed, ...meta };
  }

  function setField(key: string, fieldValue: any) {
    const next = { ...value, [key]: fieldValue };
    // Changing a Row's column count must resize its children / widths / colStyles
    // so the structure stays consistent (no orphaned or missing cells).
    if (type === "row" && key === "columns") {
      const n = Math.max(1, Math.min(12, Number(fieldValue) || 1));
      next.columns = n;
      const ch: any[] = Array.isArray(next.children) ? next.children.slice() : [];
      while (ch.length < n) ch.push([]);
      ch.length = n;
      next.children = ch;
      next.widths = Array.from({ length: n }, () => 1 / n);
      if (Array.isArray(next.colStyles)) {
        const cs = next.colStyles.slice();
        while (cs.length < n) cs.push({});
        cs.length = n;
        next.colStyles = cs;
      }
    }
    setValue(next);

    // Validation is schema-driven via the Zod schema for this type.
    const result = sectionSchemas[type].safeParse(next);
    if (result.success) {
      setErrors([]);
      onUpdate(withMeta(result.data, next) as SectionContent);
    } else {
      setErrors(
        result.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`
        )
      );
      // Still propagate so the live preview reflects in-progress edits.
      onUpdate(next as SectionContent);
    }
  }

  // Presentational meta (_style/_anim) — stored on content jsonb; not schema-validated.
  function setMeta(key: "_style" | "_anim", metaValue: ElementStyle | ElementAnimation) {
    const next = { ...value, [key]: metaValue };
    setValue(next);
    onUpdate(next as SectionContent);
  }

  // Breakpoint-aware style write (Copilot E): desktop edits the base _style; tablet/
  // mobile write DIFFS into _responsive[bp] (only keys that differ from the base),
  // preserving the per-bp `hidden`/`stackOnMobile` flags.
  const isBase = breakpoint === "desktop";
  const baseStyle: ElementStyle = (value._style ?? {}) as ElementStyle;
  const bpKey = breakpoint as "tablet" | "mobile";
  const bpOverride: any = isBase ? {} : (value._responsive?.[bpKey] ?? {});
  const shownStyle: ElementStyle = isBase ? baseStyle : (resolveStyle(baseStyle, value._responsive, breakpoint) as ElementStyle);
  function setStyleForBp(full: ElementStyle) {
    if (isBase) { setMeta("_style", full); return; }
    const diff: any = {};
    for (const k of Object.keys(full) as (keyof ElementStyle)[]) {
      if ((full as any)[k] !== (baseStyle as any)[k]) diff[k] = (full as any)[k];
    }
    if (bpOverride.hidden) diff.hidden = true;
    if (bpOverride.stackOnMobile) diff.stackOnMobile = true;
    const next = { ...value, _responsive: { ...(value._responsive ?? {}), [bpKey]: diff } };
    setValue(next); onUpdate(next as SectionContent);
  }
  function resetBp() {
    const r = { ...(value._responsive ?? {}) }; delete r[bpKey];
    const next = { ...value, _responsive: r };
    setValue(next); onUpdate(next as SectionContent);
  }
  function setBpFlag(flag: "hidden" | "stackOnMobile", on: boolean) {
    const cur = { ...(value._responsive?.[bpKey] ?? {}) };
    if (on) cur[flag] = true; else delete cur[flag];
    const next = { ...value, _responsive: { ...(value._responsive ?? {}), [bpKey]: cur } };
    setValue(next); onUpdate(next as SectionContent);
  }
  const hasBpOverride = !isBase && Object.keys(bpOverride).length > 0;

  // Friendly element name (the leading builder's "Element name"). Stored as content._name; used as
  // the Layers-tree label. Defaults to the element type's label.
  const defaultName = sectionLabels[type] ?? "Element";
  function setName(v: string) {
    const next = { ...value, _name: v };
    setValue(next);
    onUpdate(next as SectionContent);
  }
  // Text role (polished): choose Title/Subtitle/Heading… so the element inherits
  // that role's font from the global Typography panel. "" = auto (by type/level).
  function setRole(v: string) {
    const next = { ...value } as any;
    if (v) next._role = v; else delete next._role;
    // Choosing a role means "use the global Typography font for this role", so
    // drop any explicit per-element font override (otherwise it would win and the
    // role font would never show). The Font picker below re-adds an override.
    delete next.fontFamily;
    setValue(next);
    onUpdate(next as SectionContent);
  }
  const ROLE_TYPES = new Set(["heading", "subheading", "text", "button"]);
  const showRole = ROLE_TYPES.has(type as string);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{value._name || defaultName} <span className="text-xs font-normal text-gray-400">· {type}</span></h2>

      {/* polished inspector tabs */}
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {([["content", "General"], ["styles", "Styles"], ["animations", "Animations"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`-mb-px border-b-2 pb-2 ${tab === k ? "border-[#1e3a8a] font-medium text-[#1e3a8a]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {(() => {
        // INSPECTOR DISCIPLINE (Ali/D-205): General = WHAT it is/does (content, links, behavior);
        // Styles = HOW it looks (typography, size, layout, color, padding); Animations = motion.
        // Same collapsible Groups everywhere, so all 35+ element types feel identical.
        const catOf = (key: string): "Typography" | "Link" | "Layout" | "Content" => {
          const k = key.toLowerCase();
          if (/href|target|^rel$|opens|^link$/.test(k)) return "Link";
          if (/font|weight|italic|lineheight|letterspacing|transform|color$|^color$|gradient|^bg$|bgcolor|textcolor/.test(k)) return "Typography";
          if (/align|width|fullwidth|variant|^size$|columns|widths|^gap$|valign|minheight|height|objectfit|rounding|radius|^layout$|scroll|grayscale|lightbox|bulletstyle|thickness|separator$|^display$/.test(k)) return "Layout";
          return "Content";
        };
        const menuFont = type === "menu" ? specs.find((s) => s.key === "fontFamily") : undefined;
        const buckets: Record<string, any[]> = { Content: [], Typography: [], Link: [], Layout: [] };
        for (const spec of specs) {
          if (type === "menu" && spec.key === "fontFamily") continue; // surfaced in General
          buckets[catOf(spec.key)].push(spec);
        }
        const renderSpec = (spec: any) => (
          <FieldRenderer key={spec.key} spec={spec} value={value[spec.key]}
            onChange={(v) => setField(spec.key, v)} onPickImage={tenantId ? handlePickImage : undefined} customFonts={customFonts} />
        );
        if (tab === "content") return (
          <>
            <Group title="General">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium">Element name</span>
                <input type="text" value={value._name ?? ""} placeholder={defaultName}
                  onChange={(e) => setName(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
              </label>
              {showRole && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Text role</span>
                  <select value={(value as any)._role ?? ""} onChange={(e) => setRole(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="">Auto (by type)</option>
                    {FONT_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                  <span className="text-[11px] text-gray-400">Uses the font set for this role in the Typography panel. Pick a Font below to override just this element.</span>
                </label>
              )}
              {type === "menu" && <MenuItemsEditor items={(value.items ?? []) as MenuItem[]} onChange={(next) => setField("items", next)} tenantId={tenantId ?? ""} />}
              {menuFont && renderSpec(menuFont)}
              {buckets.Content.map(renderSpec)}
            </Group>
            {buckets.Link.length > 0 && <Group title="Link & behavior" defaultOpen={false}>{buckets.Link.map(renderSpec)}</Group>}
          </>
        );
        if (tab === "styles") return (
          <>
            {buckets.Typography.length > 0 && <Group title="Typography" defaultOpen={false}>{buckets.Typography.map(renderSpec)}</Group>}
            {buckets.Layout.length > 0 && <Group title="Layout & size" defaultOpen={false}>{buckets.Layout.map(renderSpec)}</Group>}
          </>
        );
        return null;
      })()}

      {tab === "styles" && (
        <>
          {!isBase && (
            <div className="mb-3 rounded-md border border-indigo-200 bg-indigo-50 p-2 text-xs text-indigo-700">
              <div className="flex items-center justify-between">
                <span><b className="uppercase">{breakpoint}</b> overrides — changes here apply to {breakpoint}{breakpoint === "tablet" ? " and below" : ""} only.</span>
                {hasBpOverride && <button type="button" onClick={resetBp} className="rounded bg-white px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100">Reset to desktop</button>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!bpOverride.hidden} onChange={(e) => setBpFlag("hidden", e.target.checked)} /> Hide on {breakpoint}</label>
                {type === "row" && breakpoint === "mobile" && (
                  <span className="text-[11px] text-indigo-600">Columns auto-stack on mobile. Use “Keep side-by-side on mobile” in the Content tab to opt out.</span>
                )}
              </div>
            </div>
          )}
          <StylesPanel value={shownStyle} onChange={(v) => setStyleForBp(v as ElementStyle)} onPickImage={tenantId ? handlePickImage : undefined} />
        </>
      )}
      {tab === "animations" && <AnimationsPanel value={value._anim} onChange={(v) => setMeta("_anim", v)} />}

      {tab === "content" && errors.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          <div className="font-medium">Validation:</div>
          <ul className="list-inside list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {tenantId && (
        <MediaPickerModal
          tenantId={tenantId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => pickApply?.(url)}
        />
      )}
    </div>
  );
}
