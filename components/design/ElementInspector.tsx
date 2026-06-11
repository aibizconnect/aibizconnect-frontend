"use client";

import { useState } from "react";
import ColorField from "@/components/design/ColorField";
import { DEFAULT_ELEMENT_STYLE, ENTRANCE_OPTIONS, HOVER_OPTIONS, type ElementStyle, type ElementAnimation } from "@/lib/design/element-style";

/**
 * Element inspector panels (polished) — the Styles + Animations tabs. Edit a section's
 * presentational meta (content._style / content._anim). Token-aware, brand-consistent.
 *
 * The Styles tab mirrors the leading builder's right column: stacked collapsible accordion groups —
 * Background, Spacing (visual box-model), Border & corners, Shadow, Size & alignment.
 */

const sel = "rounded border border-gray-300 px-2 py-1 text-sm";

/** Collapsible accordion group (polished), default open. */
export function Group({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 py-2">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-1 text-sm font-semibold text-gray-800">
        <span>{title}</span>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && <div className="mt-2 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="flex items-center justify-between gap-3">
    <span className="text-xs text-gray-500">{label}</span>
    <div className="flex items-center gap-2">{children}</div>
  </label>
);

// A tiny number box used in the box-model widget.
// ALI RULE (2026-06-11): spacing/padding never exceed 20 anywhere — the inputs clamp to 0..20.
const SPACING_MAX = 20;
function MiniNum({ value, onChange, title }: { value?: number; onChange: (n: number) => void; title?: string }) {
  return (
    <input type="number" title={title} value={value ?? 0} min={0} max={SPACING_MAX}
      onChange={(e) => onChange(Math.max(0, Math.min(SPACING_MAX, +e.target.value)))}
      className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-[11px] outline-none focus:border-[#1e3a8a]" />
  );
}

/** Visual margin→padding box model. Per-side mt/mr/mb/ml + pt/pr/pb/pl. Defaults: padding 20,
 *  margin 5. Click "content" (center) to LOCK — then changing any side sets all 8 together. */
function BoxModel({ s, set }: { s: ElementStyle; set: (p: Partial<ElementStyle>) => void }) {
  const [locked, setLocked] = useState(false);
  // Display fallbacks: padding → 20, margin → 5.
  const pad = (k: "pt" | "pr" | "pb" | "pl", shorthand?: number) => (s[k] as number) ?? shorthand ?? 20;
  const mar = (k: "mt" | "mr" | "mb" | "ml", shorthand?: number) => (s[k] as number) ?? shorthand ?? 5;
  // When locked, changing any PADDING sets all 4 paddings; any MARGIN sets all 4 margins
  // (the two groups stay independent).
  const apply = (key: keyof ElementStyle, n: number) => {
    if (!locked) return set({ [key]: n } as Partial<ElementStyle>);
    const isPad = (key as string).startsWith("p");
    set(isPad ? { pt: n, pr: n, pb: n, pl: n } : { mt: n, mr: n, mb: n, ml: n });
  };
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-400">Margin</div>
      <div className="flex flex-col items-center gap-1">
        <MiniNum title="Margin top" value={mar("mt", s.marginY)} onChange={(n) => apply("mt", n)} />
        <div className="flex w-full items-stretch justify-between gap-1">
          <div className="flex items-center"><MiniNum title="Margin left" value={mar("ml")} onChange={(n) => apply("ml", n)} /></div>
          {/* padding box */}
          <div className="flex-1 rounded-md border border-dashed border-[#1e3a8a]/40 bg-white p-2">
            <div className="mb-1 text-center text-[9px] font-semibold uppercase tracking-wide text-[#1e3a8a]/70">Padding</div>
            <div className="flex flex-col items-center gap-1">
              <MiniNum title="Padding top" value={pad("pt", s.paddingY)} onChange={(n) => apply("pt", n)} />
              <div className="flex w-full items-center justify-between gap-1">
                <MiniNum title="Padding left" value={pad("pl", s.paddingX)} onChange={(n) => apply("pl", n)} />
                <button type="button" onClick={() => setLocked((l) => !l)}
                  title={locked ? "Spacing locked — all sides change together. Click to unlock." : "Lock all spacing (changing one changes all)"}
                  className={`shrink-0 rounded px-1 py-0.5 text-[10px] ${locked ? "bg-[#1e3a8a] text-white" : "text-gray-400 hover:bg-gray-100"}`}>
                  {locked ? "🔒" : "content"}
                </button>
                <MiniNum title="Padding right" value={pad("pr", s.paddingX)} onChange={(n) => apply("pr", n)} />
              </div>
              <MiniNum title="Padding bottom" value={pad("pb", s.paddingY)} onChange={(n) => apply("pb", n)} />
            </div>
          </div>
          <div className="flex items-center"><MiniNum title="Margin right" value={mar("mr")} onChange={(n) => apply("mr", n)} /></div>
        </div>
        <MiniNum title="Margin bottom" value={mar("mb", s.marginY)} onChange={(n) => apply("mb", n)} />
      </div>
    </div>
  );
}

/** The shared Background controls (Type/gradient/image + Image Options/Opacity/Blur).
 *  Used by the element/column inspector AND the page Background panel. */
export function BackgroundControls({ s, set, onPickImage }: { s: ElementStyle; set: (patch: Partial<ElementStyle>) => void; onPickImage?: (apply: (url: string) => void) => void }) {
  const bg = s.bg ?? "transparent";
  const isToken = ["transparent", "surface", "primary", "accent"].includes(bg);
  const isGradient = typeof bg === "string" && bg.startsWith("linear-gradient");
  const bgType = isGradient ? "gradient" : isToken ? bg : "custom";
  const gColors = (() => { const m = (bg as string).match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi); return m ?? ["#1e3a8a", "#2563eb"]; })();
  const gAngle = (() => { const m = (bg as string).match(/(\d+)deg/); return m ? +m[1] : 135; })();
  const setGradient = (c1: string, c2: string, a: number) => set({ bg: `linear-gradient(${a}deg, ${c1}, ${c2})` });
  return (
    <>
      <Row label="Type">
        <select className={sel} value={bgType} onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") set({ bg: "#ffffff" });
          else if (v === "gradient") set({ bg: `linear-gradient(135deg, #1e3a8a, #2563eb)` });
          else set({ bg: v });
        }}>
          <option value="transparent">Transparent</option><option value="surface">Surface</option><option value="primary">Primary</option><option value="accent">Accent</option><option value="custom">Solid color…</option><option value="gradient">Gradient…</option>
        </select>
        {bgType === "custom" && <ColorField value={(bg as string).startsWith("#") ? (bg as string) : "#ffffff"} onChange={(v) => set({ bg: v ?? "#ffffff" })} allowEmpty={false} fallback="#ffffff" />}
      </Row>
      {bgType === "gradient" && (
        <>
          <Row label="From / To">
            <ColorField value={gColors[0]?.startsWith("#") ? gColors[0] : "#1e3a8a"} onChange={(v) => setGradient(v ?? "#1e3a8a", gColors[1] ?? "#2563eb", gAngle)} allowEmpty={false} fallback="#1e3a8a" />
            <ColorField value={gColors[1]?.startsWith("#") ? gColors[1] : "#2563eb"} onChange={(v) => setGradient(gColors[0] ?? "#1e3a8a", v ?? "#2563eb", gAngle)} allowEmpty={false} fallback="#2563eb" />
          </Row>
          <Row label="Angle (°)">
            <input type="number" min={0} max={360} value={gAngle} onChange={(e) => setGradient(gColors[0] ?? "#1e3a8a", gColors[1] ?? "#2563eb", +e.target.value)} className="w-16 rounded border border-gray-300 px-2 py-1 text-sm" />
          </Row>
        </>
      )}
      <Row label="Image">
        <input type="text" value={s.bgImage ?? ""} placeholder="https://…" onChange={(e) => set({ bgImage: e.target.value })} className="w-28 rounded border border-gray-300 px-2 py-1 text-xs" />
        {onPickImage && <button type="button" onClick={() => onPickImage((url) => set({ bgImage: url }))} className="shrink-0 rounded bg-[#1e3a8a] px-2 py-1 text-xs font-medium text-white hover:bg-[#1e3a8a]/90" title="Choose from Media Storage (upload · AI · free stock · Canva)">Media</button>}
        {s.bgImage && <button type="button" onClick={() => set({ bgImage: "" })} className="shrink-0 text-xs text-gray-400 hover:text-gray-700" title="Clear">✕</button>}
      </Row>
      {/* Image preview + the polished image controls — only once an image is set. */}
      {s.bgImage && (
        <>
          <div
            className="h-16 w-full rounded-md border border-gray-200 bg-gray-50"
            style={{ backgroundImage: `url(${s.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
            title="Background image preview"
          />
          <Row label="Image options">
            <select className={sel} value={s.bgImageMode ?? "full-center"} onChange={(e) => set({ bgImageMode: e.target.value as ElementStyle["bgImageMode"] })}>
              <option value="full-center-parallax">Full Center (Parallax)</option>
              <option value="full-center">Full Center</option>
              <option value="fill-width">Fill 100% Width</option>
              <option value="fill-width-height">Fill 100% Width &amp; Height</option>
              <option value="no-repeat">No Repeat</option>
              <option value="repeat">Repeat</option>
              <option value="repeat-x">Repeat Horizontally</option>
            </select>
          </Row>
          <Row label="Image opacity">
            <select className={sel} value={s.bgFade ?? "none"} onChange={(e) => set({ bgFade: e.target.value as ElementStyle["bgFade"] })}>
              <option value="none">None</option>
              <option value="light">Light Fade</option>
              <option value="half">Half Fade</option>
              <option value="heavy">Heavy Fade</option>
            </select>
          </Row>
          <Row label="Background blur">
            <input type="checkbox" checked={!!s.bgBlur} onChange={(e) => set({ bgBlur: e.target.checked, bgBlurIntensity: s.bgBlurIntensity ?? 30 })} className="h-4 w-4" />
          </Row>
          {s.bgBlur && (
            <Row label="Blur intensity">
              <input type="range" min={0} max={100} value={s.bgBlurIntensity ?? 30} onChange={(e) => set({ bgBlurIntensity: +e.target.value })} className="h-1 w-24 accent-[#1e3a8a]" />
              <input type="number" min={0} max={100} value={s.bgBlurIntensity ?? 30} onChange={(e) => set({ bgBlurIntensity: +e.target.value })} className="w-14 rounded border border-gray-300 px-2 py-1 text-sm" />
              <span className="text-[11px] text-gray-400">%</span>
            </Row>
          )}
        </>
      )}
    </>
  );
}

export function StylesPanel({ value, onChange, onPickImage }: { value?: ElementStyle; onChange: (next: ElementStyle) => void; onPickImage?: (apply: (url: string) => void) => void }) {
  const s = { ...DEFAULT_ELEMENT_STYLE, ...(value ?? {}) };
  const set = (patch: Partial<ElementStyle>) => onChange({ ...s, ...patch });
  const perCorner = s.radiusTL != null || s.radiusTR != null || s.radiusBR != null || s.radiusBL != null;

  return (
    <div className="flex flex-col">
      <Group title="Background">
        <BackgroundControls s={s} set={set} onPickImage={onPickImage} />
      </Group>

      <Group title="Spacing" defaultOpen={false}>
        <BoxModel s={s} set={set} />
      </Group>

      <Group title="Border & corners" defaultOpen={false}>
        <Row label="Style">
          <select className={sel} value={s.borderStyle} onChange={(e) => set({ borderStyle: e.target.value as ElementStyle["borderStyle"] })}>
            <option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
          </select>
        </Row>
        {s.borderStyle !== "none" && (
          <Row label="Width / Color">
            <input type="number" className="w-14 rounded border border-gray-300 px-2 py-1 text-sm" value={s.borderWidth} onChange={(e) => set({ borderWidth: +e.target.value })} />
            <ColorField value={(s.borderColor ?? "").startsWith("#") ? (s.borderColor as string) : undefined} onChange={(v) => set({ borderColor: v ?? "#1f2937" })} fallback="#1f2937" />
          </Row>
        )}
        <Row label="Corner radius (px)"><input type="number" className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" value={s.radius} onChange={(e) => set({ radius: +e.target.value })} /></Row>
        <Row label="Per-corner">
          <input type="checkbox" checked={perCorner} onChange={(e) => set(e.target.checked ? { radiusTL: s.radius, radiusTR: s.radius, radiusBR: s.radius, radiusBL: s.radius } : { radiusTL: undefined, radiusTR: undefined, radiusBR: undefined, radiusBL: undefined })} className="h-4 w-4" />
        </Row>
        {perCorner && (
          <div className="grid grid-cols-2 gap-1.5">
            <MiniNum title="Top-left" value={s.radiusTL} onChange={(n) => set({ radiusTL: n })} />
            <MiniNum title="Top-right" value={s.radiusTR} onChange={(n) => set({ radiusTR: n })} />
            <MiniNum title="Bottom-left" value={s.radiusBL} onChange={(n) => set({ radiusBL: n })} />
            <MiniNum title="Bottom-right" value={s.radiusBR} onChange={(n) => set({ radiusBR: n })} />
          </div>
        )}
      </Group>

      <Group title="Effects" defaultOpen={false}>
        <Row label="Opacity (%)">
          <input type="range" min={0} max={100} value={s.opacity ?? 100} onChange={(e) => set({ opacity: +e.target.value })} className="h-1 w-24 accent-[#1e3a8a]" />
          <input type="number" min={0} max={100} value={s.opacity ?? 100} onChange={(e) => set({ opacity: +e.target.value })} className="w-14 rounded border border-gray-300 px-2 py-1 text-sm" />
        </Row>
      </Group>

      <Group title="Shadow" defaultOpen={false}>
        <Row label="Box shadow">
          <select className={sel} value={s.shadow} onChange={(e) => set({ shadow: e.target.value as ElementStyle["shadow"] })}>
            <option value="none">None</option><option value="soft">Soft</option><option value="elevated">Elevated</option>
          </select>
        </Row>
      </Group>

      <Group title="Size & alignment" defaultOpen={false}>
        <Row label="Width preset">
          <select className={sel} value={s.width ?? (s.fullWidth === "fixed" ? "wide" : "full")} onChange={(e) => set({ width: e.target.value as ElementStyle["width"], widthPx: undefined })}>
            <option value="full">Full</option><option value="wide">Wide</option><option value="normal">Mid Wide</option><option value="narrow">Small</option>
          </select>
        </Row>
        <Row label="Width (px)">
          <input type="number" min={0} placeholder="auto" value={s.widthPx ?? ""} onChange={(e) => set({ widthPx: e.target.value === "" ? undefined : +e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
        </Row>
        <Row label="Height (px)">
          <input type="number" min={0} placeholder="auto" value={s.heightPx ?? ""} onChange={(e) => set({ heightPx: e.target.value === "" ? undefined : +e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
        </Row>
        <Row label="Align">
          <select className={sel} value={s.align} onChange={(e) => set({ align: e.target.value as ElementStyle["align"] })}>
            <option value="start">Left</option><option value="center">Center</option><option value="end">Right</option>
          </select>
        </Row>
      </Group>

      <Group title="Advanced" defaultOpen={false}>
        <Row label="Z-index">
          <input type="number" placeholder="auto" value={s.zIndex ?? ""} onChange={(e) => set({ zIndex: e.target.value === "" ? undefined : +e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
        </Row>
        <Row label="Overflow">
          <select className={sel} value={s.overflow ?? "visible"} onChange={(e) => set({ overflow: e.target.value as ElementStyle["overflow"] })}>
            <option value="visible">Visible</option><option value="hidden">Hidden</option><option value="auto">Auto</option><option value="scroll">Scroll</option>
          </select>
        </Row>
      </Group>
    </div>
  );
}

const AnimCard = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={`rounded-lg border px-3 py-2 text-xs capitalize transition ${active ? "border-[#1e3a8a] bg-[#1e3a8a]/10 font-medium text-[#1e3a8a]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
    {label.replace(/-/g, " ")}
  </button>
);

export function AnimationsPanel({ value, onChange }: { value?: ElementAnimation; onChange: (next: ElementAnimation) => void }) {
  const a = value ?? {};
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Entrance animation</h3>
          {a.entrance && a.entrance !== "none" && <button onClick={() => onChange({ ...a, entrance: "none" })} className="text-xs text-[#1e3a8a] hover:underline">Clear</button>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ENTRANCE_OPTIONS.map((o) => <AnimCard key={o} label={o} active={(a.entrance ?? "none") === o} onClick={() => onChange({ ...a, entrance: o })} />)}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Hover animation</h3>
          {a.hover && a.hover !== "none" && <button onClick={() => onChange({ ...a, hover: "none" })} className="text-xs text-[#1e3a8a] hover:underline">Clear</button>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {HOVER_OPTIONS.map((o) => <AnimCard key={o} label={o} active={(a.hover ?? "none") === o} onClick={() => onChange({ ...a, hover: o })} />)}
        </div>
      </div>
      <p className="text-xs text-gray-400">Animations respect reduced-motion preferences automatically.</p>
    </div>
  );
}
