"use client";

import { useEffect, useRef, useState } from "react";
import type { Config, Fields } from "@measured/puck";
import { DropZone } from "@measured/puck";

/**
 * Full-featured Puck prototype config. Every primitive + container carries a universal
 * "Style" group (background color/image with fit/position/overlay/transparency, padding,
 * margin, alignment, max-width, radius, shadow, opacity, border) — the same granular
 * control as the old ElementStyle inspector — plus curated luxury Section presets.
 */

const LX = { ink: "#1A1714", body: "#5C544B", gold: "#B08D57", ivory: "#F7F4EF", white: "#FFFFFF", panel: "#F1EADD", hair: "#E4DCCE" };
const serif = "'Playfair Display', serif";
const sans = "'Inter', sans-serif";
const SHADOWS: Record<string, string> = { none: "none", soft: "0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.08)", elevated: "0 14px 36px rgba(0,0,0,.18)" };
const clamp = (n: number) => Math.max(0, Math.min(100, n));

// ── Fonts (picker) ──────────────────────────────────────────────────────────────
const FONTS: Record<string, string> = {
  "Playfair Display": "'Playfair Display', serif",
  "Cormorant Garamond": "'Cormorant Garamond', serif",
  "Inter": "'Inter', sans-serif",
  "Montserrat": "'Montserrat', sans-serif",
  "Poppins": "'Poppins', sans-serif",
  "Manrope": "'Manrope', sans-serif",
};
const fontField = { type: "select" as const, label: "Font", options: Object.keys(FONTS).map((f) => ({ label: f, value: f })) };

// ── Animated count-up (the number animation), scroll-triggered, ease-out ─────────
function AnimatedNumber({ value, duration = 2, animate = true, style }: { value: string; duration?: number; animate?: boolean; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const num = parseFloat(String(value).replace(/[, ]/g, ""));
  const suffix = String(value).replace(/^[\d.,\s-]+/, ""); // "+", "%", "/7", etc.
  const decimals = (String(value).split(".")[1] || "").replace(/[^0-9]/g, "").length;
  const [shown, setShown] = useState<number | null>(animate && Number.isFinite(num) ? 0 : null);
  useEffect(() => {
    if (!animate || !Number.isFinite(num) || !ref.current) { setShown(null); return; }
    let raf = 0, started = false; const dur = duration * 1000;
    const run = () => { let t0 = 0; const step = (ts: number) => { if (!t0) t0 = ts; const p = Math.min(1, (ts - t0) / dur); setShown(num * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !started) { started = true; run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [num, duration, animate]);
  const display = shown === null ? value : shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  return <div ref={ref} style={style}>{display}</div>;
}

// ── Image picker (custom field): preset luxury photos + URL input ────────────────
const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=70",
];
const imagePickerField = {
  type: "custom" as const,
  label: "Image",
  render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        {PRESET_IMAGES.map((u) => (
          <button key={u} type="button" onClick={() => onChange(u)}
            style={{ padding: 0, border: value === u ? "2px solid #1e3a8a" : "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", cursor: "pointer", height: 48, background: "none" }}>
            <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </button>
        ))}
      </div>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Or paste an image URL"
        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 8px", fontSize: 12 }} />
    </div>
  ),
};

// ── Universal Style group ───────────────────────────────────────────────────────
type Style = {
  bg?: string; bgImage?: string; bgFit?: "cover" | "contain"; bgPosition?: "center" | "top" | "bottom";
  overlay?: "none" | "light" | "dark"; overlayStrength?: number;
  align?: "left" | "center" | "right"; maxWidth?: number;
  padY?: number; padX?: number; marginY?: number; radius?: number;
  shadow?: "none" | "soft" | "elevated"; opacity?: number; border?: string; minH?: number;
};

const styleField: Fields<{ _style: Style }>["_style"] = {
  type: "object",
  label: "Style",
  objectFields: {
    bg: { type: "text", label: "Background color (hex)" },
    bgImage: { type: "text", label: "Background image URL" },
    bgFit: { type: "radio", label: "Image fit", options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }] },
    bgPosition: { type: "select", label: "Image position", options: [{ label: "Center", value: "center" }, { label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }] },
    overlay: { type: "radio", label: "Overlay", options: [{ label: "None", value: "none" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }] },
    overlayStrength: { type: "number", label: "Overlay strength %", min: 0, max: 100 },
    align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
    maxWidth: { type: "number", label: "Content max width (px, 0 = full)" },
    padY: { type: "number", label: "Padding Y (px)" },
    padX: { type: "number", label: "Padding X (px)" },
    marginY: { type: "number", label: "Margin Y (px)" },
    radius: { type: "number", label: "Corner radius (px)" },
    shadow: { type: "select", label: "Shadow", options: [{ label: "None", value: "none" }, { label: "Soft", value: "soft" }, { label: "Elevated", value: "elevated" }] },
    opacity: { type: "number", label: "Opacity %", min: 0, max: 100 },
    border: { type: "text", label: "Border (e.g. 1px solid #e4dcce)" },
  },
} as any;

function outerCss(s: Style = {}): React.CSSProperties {
  const css: React.CSSProperties = {
    paddingTop: s.padY ?? 0, paddingBottom: s.padY ?? 0,
    paddingLeft: s.padX ?? 0, paddingRight: s.padX ?? 0,
    marginTop: s.marginY ?? 0, marginBottom: s.marginY ?? 0,
  };
  if (s.bgImage) {
    const a = clamp(s.overlayStrength ?? 0) / 100;
    const rgb = s.overlay === "dark" ? "0,0,0" : "255,255,255";
    const veil = !s.overlay || s.overlay === "none" ? "" : `linear-gradient(rgba(${rgb},${a}),rgba(${rgb},${a})),`;
    css.backgroundImage = `${veil}url(${s.bgImage})`;
    css.backgroundSize = s.bgFit || "cover";
    css.backgroundPosition = s.bgPosition || "center";
    css.backgroundRepeat = "no-repeat";
  } else if (s.bg) css.background = s.bg;
  if (s.radius) css.borderRadius = s.radius;
  if (s.shadow && s.shadow !== "none") css.boxShadow = SHADOWS[s.shadow];
  if (s.opacity != null && s.opacity < 100) css.opacity = clamp(s.opacity) / 100;
  if (s.border) css.border = s.border;
  if (s.minH) { css.minHeight = s.minH; css.display = "flex"; css.flexDirection = "column"; css.justifyContent = "center"; }
  return css;
}
function innerCss(s: Style = {}): React.CSSProperties {
  const css: React.CSSProperties = { textAlign: (s.align || "left") as any };
  if (s.maxWidth) { css.maxWidth = s.maxWidth; css.marginLeft = "auto"; css.marginRight = "auto"; }
  return css;
}
/** Whether text on this style should be light (dark bg or dark overlay). */
const isDarkBg = (s: Style = {}) => s.overlay === "dark" || (!!s.bg && /^#(0|1|2|3)/.test(s.bg.trim()));

// ── helper to attach Style group + wrapper to a primitive ───────────────────────
function styled(def: { label: string; category?: string; fields?: any; defaultProps?: any; defaultStyle?: Style; inner: (p: any) => React.ReactNode }) {
  return {
    label: def.label,
    fields: { ...(def.fields || {}), _style: styleField },
    defaultProps: { ...(def.defaultProps || {}), _style: def.defaultStyle || {} },
    render: (p: any) => <div style={outerCss(p._style)}><div style={innerCss(p._style)}>{def.inner(p)}</div></div>,
  };
}

export const config: Config = {
  categories: {
    sections: { title: "Sections", components: ["Hero", "Features3", "Stats3", "Testimonial", "CTA"], defaultExpanded: true },
    structure: { title: "Structure", components: ["Header", "Footer"], defaultExpanded: false },
    rows: { title: "Rows & Layout", components: ["Section", "TwoColumns", "ThreeColumns", "Spacer", "Divider"], defaultExpanded: false },
    text: { title: "Text", components: ["Heading", "Text", "BulletList", "Quote"], defaultExpanded: false },
    buttons: { title: "Buttons", components: ["Button"], defaultExpanded: false },
    media: { title: "Media", components: ["Image", "Video", "Gallery"], defaultExpanded: false },
    stats: { title: "Stats & Bars", components: ["Stat", "ProgressBar"], defaultExpanded: false },
    icon: { title: "Icon", components: ["Icon"], defaultExpanded: false },
    custom: { title: "Custom", components: ["Embed"], defaultExpanded: false },
  },
  components: {
    // ── Styleable container with a drop zone ──────────────────────────────────────
    Section: styled({
      label: "Section (band)",
      defaultStyle: { bg: LX.ivory, padY: 96, padX: 24, align: "center", maxWidth: 1100 },
      inner: () => <DropZone zone="content" />,
    }) as any,
    TwoColumns: {
      label: "Two Columns",
      fields: { gap: { type: "number", label: "Gap (px)" }, _style: styleField } as any,
      defaultProps: { gap: 40, _style: { padY: 0, padX: 0 } },
      render: ({ gap, _style }: any) => (
        <div style={outerCss(_style)}>
          <div style={{ ...innerCss(_style), display: "grid", gridTemplateColumns: "1fr 1fr", gap, alignItems: "center" }}>
            <div><DropZone zone="left" /></div><div><DropZone zone="right" /></div>
          </div>
        </div>
      ),
    },
    ThreeColumns: {
      label: "Three Columns",
      fields: { gap: { type: "number", label: "Gap (px)" }, _style: styleField } as any,
      defaultProps: { gap: 30, _style: { padY: 0, padX: 0 } },
      render: ({ gap, _style }: any) => (
        <div style={outerCss(_style)}>
          <div style={{ ...innerCss(_style), display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap, alignItems: "stretch" }}>
            <div><DropZone zone="c1" /></div><div><DropZone zone="c2" /></div><div><DropZone zone="c3" /></div>
          </div>
        </div>
      ),
    },
    Spacer: styled({ label: "Spacer", fields: { height: { type: "number", label: "Height (px)" } }, defaultProps: { height: 48 }, inner: ({ height }: any) => <div style={{ height }} /> }) as any,
    Divider: styled({ label: "Divider", fields: { color: { type: "text" }, widthPct: { type: "number", label: "Width %" }, thickness: { type: "number" } }, defaultProps: { color: LX.hair, widthPct: 40, thickness: 1 }, defaultStyle: { align: "center", padY: 16 }, inner: ({ color, widthPct, thickness }: any) => <hr style={{ width: `${widthPct}%`, border: 0, borderTop: `${thickness}px solid ${color}`, margin: "0 auto" }} /> }) as any,

    // ── Styleable primitives ──────────────────────────────────────────────────────
    Heading: styled({
      label: "Heading",
      fields: {
        text: { type: "text" },
        level: { type: "select", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }] },
        font: fontField,
        size: { type: "number", label: "Font size (px, 0 = auto)" },
        color: { type: "text", label: "Text color" },
      },
      defaultProps: { text: "A practice built on detail", level: "h2", font: "Playfair Display", size: 0, color: LX.ink },
      defaultStyle: { align: "center" },
      inner: ({ text, level, font, size, color }: any) => {
        const auto = level === "h1" ? 56 : level === "h2" ? 40 : 26;
        return <div style={{ fontFamily: FONTS[font] || serif, fontSize: size || auto, fontWeight: 600, letterSpacing: -0.4, color }}>{text}</div>;
      },
    }) as any,
    Text: styled({
      label: "Paragraph",
      fields: { text: { type: "textarea" }, font: fontField, size: { type: "number", label: "Font size (px)" }, color: { type: "text", label: "Text color" } },
      defaultProps: { text: "From first sketch to final styling — a single, coherent vision carried through every room.", font: "Inter", size: 17, color: LX.body },
      defaultStyle: { align: "center", maxWidth: 640 },
      inner: ({ text, font, size, color }: any) => <p style={{ fontFamily: FONTS[font] || sans, fontSize: size, lineHeight: 1.75, color, margin: 0 }}>{text}</p>,
    }) as any,
    Button: styled({
      label: "Button",
      fields: {
        label: { type: "text" }, href: { type: "text", label: "Link" },
        variant: { type: "radio", options: [{ label: "Solid", value: "solid" }, { label: "Outline", value: "outline" }] },
        bgColor: { type: "text", label: "Button color" }, textColor: { type: "text", label: "Label color" },
      },
      defaultProps: { label: "Enquire now", href: "#", variant: "solid", bgColor: LX.gold, textColor: "#ffffff" },
      defaultStyle: { align: "center", padY: 4 },
      inner: ({ label, href, variant, bgColor, textColor }: any) => (
        <a href={href} style={variant === "solid"
          ? { background: bgColor, color: textColor, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "14px 32px", display: "inline-block", textDecoration: "none" }
          : { border: `1px solid ${bgColor}`, color: bgColor, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "14px 32px", display: "inline-block", textDecoration: "none" }}>{label}</a>
      ),
    }) as any,
    Image: styled({
      label: "Image",
      fields: { url: imagePickerField as any, fit: { type: "radio", label: "Fit", options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }] }, width: { type: "number", label: "Max width (px, 0 = full)" }, height: { type: "number", label: "Height (px, 0 = auto)" } },
      defaultProps: { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70", fit: "cover", width: 800, height: 360 },
      defaultStyle: { align: "center", padY: 16 },
      inner: ({ url, fit, width, height }: any) => <img src={url} alt="" style={{ width: "100%", maxWidth: width || "100%", height: height || "auto", objectFit: fit, display: "inline-block", verticalAlign: "top" }} />,
    }) as any,
    Stat: styled({
      label: "Stat",
      fields: { value: { type: "text" }, label: { type: "text" }, color: { type: "text", label: "Number color" } },
      defaultProps: { value: "120+", label: "Residences", color: LX.ink },
      defaultStyle: { align: "center" },
      inner: ({ value, label, color }: any) => (
        <div>
          <div style={{ fontFamily: serif, fontSize: 58, fontWeight: 600, color }}>{value}</div>
          <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: LX.body, marginTop: 8 }}>{label}</div>
        </div>
      ),
    }) as any,

    BulletList: styled({
      label: "Bullet List",
      fields: { marker: { type: "select", label: "Marker", options: [{ label: "Dot", value: "disc" }, { label: "Check ✓", value: "check" }, { label: "Arrow →", value: "arrow" }] }, color: { type: "text", label: "Marker color" }, items: { type: "array", arrayFields: { text: { type: "text" } }, defaultItemProps: { text: "List item" } } },
      defaultProps: { marker: "check", color: LX.gold, items: [{ text: "Expert, considered service" }, { text: "Clear communication throughout" }, { text: "Results that endure" }] },
      defaultStyle: { align: "left", maxWidth: 560 },
      inner: ({ marker, color, items }: any) => (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: sans, fontSize: 16.5, lineHeight: 1.7, color: LX.body }}>
          {(items || []).map((it: any, i: number) => (
            <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ color, fontWeight: 700 }}>{marker === "check" ? "✓" : marker === "arrow" ? "→" : "•"}</span>{it.text}
            </li>
          ))}
        </ul>
      ),
    }) as any,
    Quote: styled({
      label: "Quote",
      fields: { text: { type: "textarea" }, author: { type: "text" } },
      defaultProps: { text: "Quiet, warm, and unmistakably ours.", author: "A private residence" },
      defaultStyle: { align: "center", maxWidth: 720, padY: 16 },
      inner: ({ text, author }: any) => (
        <div>
          <div style={{ fontFamily: serif, fontSize: 25, fontStyle: "italic", lineHeight: 1.5, color: LX.ink }}>{`“${text}”`}</div>
          {author && <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase", color: LX.gold, marginTop: 18 }}>{`— ${author}`}</div>}
        </div>
      ),
    }) as any,
    Video: styled({
      label: "Video (YouTube)",
      fields: { url: { type: "text", label: "YouTube URL" }, radius: { type: "number", label: "Corner radius" } },
      defaultProps: { url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", radius: 8 },
      defaultStyle: { align: "center", maxWidth: 900, padY: 16 },
      inner: ({ url, radius }: any) => {
        const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
        return m
          ? <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: radius, overflow: "hidden" }}><iframe src={`https://www.youtube.com/embed/${m[1]}`} title="Video" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} /></div>
          : <div style={{ padding: 40, border: "1px dashed #cbd5e1", borderRadius: radius, color: "#94a3b8", fontFamily: sans }}>Paste a YouTube URL</div>;
      },
    }) as any,
    Gallery: styled({
      label: "Gallery",
      fields: { columns: { type: "number", label: "Columns" }, gap: { type: "number", label: "Gap (px)" }, radius: { type: "number", label: "Corner radius" }, images: { type: "array", arrayFields: { url: imagePickerField as any }, defaultItemProps: { url: PRESET_IMAGES[0] } } },
      defaultProps: { columns: 3, gap: 12, radius: 6, images: PRESET_IMAGES.slice(0, 6).map((u) => ({ url: u })) },
      defaultStyle: { padY: 8 },
      inner: ({ columns, gap, radius, images }: any) => (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns || 3},1fr)`, gap }}>
          {(images || []).map((im: any, i: number) => <img key={i} src={im.url} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: radius }} />)}
        </div>
      ),
    }) as any,
    ProgressBar: styled({
      label: "Progress Bar",
      fields: { label: { type: "text" }, percent: { type: "number", min: 0, max: 100 }, color: { type: "text", label: "Bar color" } },
      defaultProps: { label: "Project completion", percent: 75, color: LX.gold },
      defaultStyle: { maxWidth: 560, padY: 8 },
      inner: ({ label, percent, color }: any) => (
        <div style={{ fontFamily: sans }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: LX.body, marginBottom: 6 }}><span>{label}</span><span>{percent}%</span></div>
          <div style={{ height: 8, background: LX.hair, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${clamp(percent)}%`, height: "100%", background: color }} /></div>
        </div>
      ),
    }) as any,
    Icon: styled({
      label: "Icon",
      fields: { icon: { type: "text", label: "Icon (emoji/char)" }, size: { type: "number", label: "Size (px)" }, color: { type: "text" }, heading: { type: "text", label: "Heading (optional)" }, text: { type: "textarea", label: "Text (optional)" } },
      defaultProps: { icon: "◇", size: 40, color: LX.gold, heading: "", text: "" },
      defaultStyle: { align: "center" },
      inner: ({ icon, size, color, heading, text }: any) => (
        <div>
          <div style={{ fontSize: size, color, lineHeight: 1 }}>{icon}</div>
          {heading && <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ink, marginTop: 12 }}>{heading}</div>}
          {text && <div style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.7, color: LX.body, marginTop: 8 }}>{text}</div>}
        </div>
      ),
    }) as any,
    Embed: styled({
      label: "Custom HTML / Embed",
      fields: { html: { type: "textarea", label: "HTML" } },
      defaultProps: { html: "<div style='padding:24px;text-align:center;font-family:Inter,sans-serif;color:#5C544B'>Paste any embed / HTML here</div>" },
      defaultStyle: {},
      inner: ({ html }: any) => <div dangerouslySetInnerHTML={{ __html: html || "" }} />,
    }) as any,

    // ── Curated section presets (their own tailored controls) ────────────────────
    Header: {
      label: "Header / Nav",
      fields: { brand: { type: "text" }, links: { type: "text", label: "Links (comma-separated)" }, cta: { type: "text", label: "Button" }, dark: { type: "radio", label: "Theme", options: [{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }] } } as any,
      defaultProps: { brand: "Aurelia & Co.", links: "Home, Services, Portfolio, About, Contact", cta: "Login", dark: "light" },
      render: ({ brand, links, cta, dark }: any) => {
        const d = dark === "dark";
        return (
          <div style={{ background: d ? LX.ink : LX.ivory, borderBottom: `1px solid ${d ? "#2A251F" : LX.hair}`, padding: "20px 24px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: d ? LX.ivory : LX.ink }}>{brand}</div>
              <div style={{ display: "flex", gap: 28, fontFamily: sans, fontSize: 15, fontWeight: 500, color: d ? LX.ivory : LX.ink }}>{String(links).split(",").map((l, i) => <span key={i}>{l.trim()}</span>)}</div>
              <span style={{ border: `1px solid ${d ? LX.ivory : LX.ink}`, color: d ? LX.ivory : LX.ink, font: `600 13px/1 ${sans}`, letterSpacing: 0.5, textTransform: "uppercase", padding: "10px 22px" }}>{cta}</span>
            </div>
          </div>
        );
      },
    },
    Footer: {
      label: "Footer",
      fields: { brand: { type: "text" }, links: { type: "text", label: "Links" }, copyright: { type: "text" } } as any,
      defaultProps: { brand: "Aurelia & Co.", links: "Home, Services, About, Contact, Privacy", copyright: "© Aurelia & Co. — All rights reserved." },
      render: ({ brand, links, copyright }: any) => (
        <div style={{ background: LX.ink, color: "#CFC7BB", padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ivory, marginBottom: 10 }}>{brand}</div>
          <div style={{ fontFamily: sans, fontSize: 14, marginBottom: 18 }}>{String(links).split(",").map((l) => l.trim()).join("   ·   ")}</div>
          <div style={{ width: 50, height: 1, background: "#3A352F", margin: "0 auto 18px" }} />
          <div style={{ fontFamily: sans, fontSize: 13, color: "#8A8278" }}>{copyright}</div>
        </div>
      ),
    },
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text" }, title: { type: "textarea" }, subtitle: { type: "textarea" },
        cta1: { type: "text", label: "Primary button" }, cta2: { type: "text", label: "Secondary button" },
        bg: { type: "select", label: "Background (no image)", options: [{ label: "Ivory", value: "ivory" }, { label: "White", value: "white" }, { label: "Ink (dark)", value: "ink" }] },
        image: imagePickerField,
        imageFit: { type: "radio", label: "Image fit", options: [{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }] },
        imagePosition: { type: "select", label: "Image position", options: [{ label: "Center", value: "center" }, { label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }] },
        overlay: { type: "radio", label: "Overlay", options: [{ label: "None", value: "none" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }] },
        overlayStrength: { type: "number", label: "Overlay strength %", min: 0, max: 100 },
        minH: { type: "number", label: "Min height (px)" },
      } as any,
      defaultProps: { eyebrow: "Bespoke Atelier", title: "Spaces composed with intention.", subtitle: "A considered approach — where material, light and proportion meet restraint.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory", image: "", imageFit: "cover", imagePosition: "center", overlay: "light", overlayStrength: 50, minH: 540 },
      render: ({ eyebrow, title, subtitle, cta1, cta2, bg, image, imageFit, imagePosition, overlay, overlayStrength, minH }: any) => {
        const back = bg === "ink" ? LX.ink : bg === "white" ? LX.white : LX.ivory;
        const a = clamp(overlayStrength ?? 50) / 100;
        const rgb = overlay === "dark" ? "0,0,0" : "255,255,255";
        const veil = !image || overlay === "none" ? "" : `linear-gradient(rgba(${rgb},${a}),rgba(${rgb},${a})),`;
        const bgStyle = image ? { backgroundImage: `${veil}url(${image})`, backgroundSize: imageFit, backgroundPosition: imagePosition, backgroundRepeat: "no-repeat" } : { background: back };
        const dark = image ? overlay === "dark" : bg === "ink";
        const text = dark ? LX.ivory : LX.ink, sub = dark ? "#CFC7BB" : LX.body;
        return (
          <div style={{ ...bgStyle, padding: "140px 24px", textAlign: "center", minHeight: minH || undefined, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: 2.2, textTransform: "uppercase", color: LX.gold, marginBottom: 18 }}>{eyebrow}</div>
              <h1 style={{ fontFamily: serif, fontSize: 60, fontWeight: 600, lineHeight: 1.05, letterSpacing: -0.6, color: text, margin: 0 }}>{title}</h1>
              <p style={{ fontFamily: sans, fontSize: 20, fontWeight: 300, lineHeight: 1.6, color: sub, maxWidth: 600, margin: "24px auto 36px" }}>{subtitle}</p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <span style={{ background: LX.ink, color: LX.ivory, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px" }}>{cta1}</span>
                {cta2 && <span style={{ border: `1px solid ${text}`, color: text, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px" }}>{cta2}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    Features3: {
      label: "Features (3-up band)",
      fields: {
        eyebrow: { type: "text" }, title: { type: "text" }, bg: { type: "text", label: "Band background" },
        cards: { type: "array", arrayFields: { icon: { type: "text" }, title: { type: "text" }, body: { type: "textarea" } }, defaultItemProps: { icon: "◇", title: "Feature", body: "Describe this feature." } },
      } as any,
      defaultProps: { eyebrow: "What we offer", title: "A practice built on detail", bg: LX.ivory, cards: [
        { icon: "◇", title: "Full-service design", body: "From first sketch to final styling — a single, coherent vision." },
        { icon: "❖", title: "Material curation", body: "Natural stone, aged brass, hand-finished timber, sourced for warmth." },
        { icon: "✦", title: "Project stewardship", body: "Discreet, precise management so the experience feels as refined as the result." },
      ] },
      render: ({ eyebrow, title, bg, cards }: any) => (
        <div style={{ background: bg || LX.ivory, padding: "112px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: 2.2, textTransform: "uppercase", color: LX.gold, marginBottom: 14 }}>{eyebrow}</div>
            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, color: LX.ink, margin: "0 0 56px" }}>{title}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 30, textAlign: "left" }}>
              {(cards || []).map((c: any, i: number) => (
                <div key={i} style={{ background: LX.white, border: `1px solid ${LX.hair}`, padding: "36px 30px" }}>
                  <div style={{ fontSize: 26, color: LX.gold, marginBottom: 18 }}>{c.icon}</div>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ink, marginBottom: 10 }}>{c.title}</div>
                  <div style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.7, color: LX.body }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    Stats3: {
      label: "Stats (band)",
      fields: {
        bg: { type: "text", label: "Band background" },
        animate: { type: "radio", label: "Count-up animation", options: [{ label: "On", value: true }, { label: "Off", value: false }] },
        duration: { type: "number", label: "Animation seconds" },
        stats: { type: "array", arrayFields: { value: { type: "text" }, label: { type: "text" } }, defaultItemProps: { value: "100+", label: "Metric" } },
      } as any,
      defaultProps: { bg: LX.ivory, animate: true, duration: 2, stats: [{ value: "120+", label: "Residences" }, { value: "18", label: "Years of craft" }, { value: "100%", label: "Bespoke" }] },
      render: ({ bg, animate, duration, stats }: any) => (
        <div style={{ background: bg || LX.ivory, borderTop: `1px solid ${LX.hair}`, borderBottom: `1px solid ${LX.hair}`, padding: "92px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${(stats || []).length || 3},1fr)`, gap: 24 }}>
            {(stats || []).map((s: any, i: number) => (
              <div key={i} style={{ textAlign: "center" }}>
                <AnimatedNumber value={s.value} animate={animate !== false} duration={duration || 2}
                  style={{ fontFamily: serif, fontSize: 58, fontWeight: 600, color: LX.ink }} />
                <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: LX.body, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    Testimonial: {
      label: "Testimonial",
      fields: { quote: { type: "textarea" }, author: { type: "text" }, bg: { type: "text", label: "Band background" } } as any,
      defaultProps: { quote: "They understood the home before we could describe it. The result is quiet, warm, and unmistakably ours.", author: "A private residence, Mayfair", bg: LX.white },
      render: ({ quote, author, bg }: any) => (
        <div style={{ background: bg || LX.white, padding: "116px 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
            <div style={{ fontFamily: serif, fontSize: 25, fontStyle: "italic", lineHeight: 1.5, color: LX.ink }}>{`“${quote}”`}</div>
            <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase", color: LX.gold, marginTop: 22 }}>{`— ${author}`}</div>
          </div>
        </div>
      ),
    },
    CTA: {
      label: "Call to action",
      fields: { title: { type: "text" }, body: { type: "textarea" }, button: { type: "text" }, bg: { type: "select", options: [{ label: "Panel", value: "panel" }, { label: "Ink (dark)", value: "ink" }] } } as any,
      defaultProps: { title: "Begin your commission", body: "A limited number of projects each season, given the attention each deserves.", button: "Enquire now", bg: "panel" },
      render: ({ title, body, button, bg }: any) => {
        const dark = bg === "ink";
        return (
          <div style={{ background: dark ? LX.ink : LX.panel, borderTop: `1px solid ${LX.hair}`, borderBottom: `1px solid ${LX.hair}`, padding: "120px 24px", textAlign: "center" }}>
            <div style={{ width: 54, height: 2, background: LX.gold, margin: "0 auto 26px" }} />
            <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, color: dark ? LX.ivory : LX.ink, marginBottom: 14 }}>{title}</div>
            <div style={{ fontFamily: sans, fontSize: 18, color: dark ? "#CFC7BB" : LX.body, maxWidth: 540, margin: "0 auto 30px" }}>{body}</div>
            <span style={{ background: LX.gold, color: "#fff", font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px", display: "inline-block" }}>{button}</span>
          </div>
        );
      },
    },
  },
};

export const initialData = {
  root: {},
  zones: {},
  content: [
    { type: "Header", props: { id: "hdr-1", brand: "Aurelia & Co.", links: "Home, Services, Portfolio, About, Contact", cta: "Login", dark: "light" } },
    { type: "Hero", props: { id: "hero-1", eyebrow: "Bespoke Atelier", title: "Spaces composed with intention, crafted to endure.", subtitle: "A considered approach — where material, light and proportion meet restraint. Built for those who value the quiet confidence of timeless design.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=70", imageFit: "cover", imagePosition: "center", overlay: "light", overlayStrength: 55, minH: 560 } },
    { type: "Features3", props: { id: "feat-1", eyebrow: "What we offer", title: "A practice built on detail", bg: LX.ivory, cards: [
      { icon: "◇", title: "Full-service design", body: "From first sketch to final styling — a single, coherent vision carried through every room." },
      { icon: "❖", title: "Material curation", body: "Natural stone, aged brass, hand-finished timber. Sourced for warmth and longevity." },
      { icon: "✦", title: "Project stewardship", body: "Discreet, precise project management so the experience feels as refined as the result." },
    ] } },
    { type: "Stats3", props: { id: "stats-1", bg: LX.ivory, stats: [{ value: "120+", label: "Residences" }, { value: "18", label: "Years of craft" }, { value: "100%", label: "Bespoke" }] } },
    { type: "Testimonial", props: { id: "test-1", quote: "They understood the home before we could describe it. The result is quiet, warm, and unmistakably ours.", author: "A private residence, Mayfair", bg: LX.white } },
    { type: "CTA", props: { id: "cta-1", title: "Begin your commission", body: "A limited number of projects each season, given the attention each deserves.", button: "Enquire now", bg: "panel" } },
    { type: "Footer", props: { id: "ftr-1", brand: "Aurelia & Co.", links: "Home, Services, About, Contact, Privacy", copyright: "© Aurelia & Co. — All rights reserved." } },
  ],
};
