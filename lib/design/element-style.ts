import type { CSSProperties } from "react";

/**
 * Element style + animation model for the GHL-style element inspector (Styles +
 * Animations tabs). Presentational meta stored ON the section content (content._style /
 * content._anim) — no schema change. Brand-token-aware: spacing/radius reference --abc-*
 * where sensible. Converts to inline CSS + animation classes for the renderer.
 */

export interface ElementStyle {
  fullWidth?: "fluid" | "fixed";
  align?: "start" | "center" | "end";
  width?: "full" | "wide" | "normal" | "narrow";
  bg?: "transparent" | "surface" | "primary" | "accent" | string; // token or hex
  bgImage?: string;    // background image URL (overlays bg color)
  // How the background image is laid out (GHL "Image Options").
  bgImageMode?:
    | "full-center-parallax"  // cover, centered, fixed attachment (parallax)
    | "full-center"           // cover, centered
    | "fill-width"            // 100% width, height auto
    | "fill-width-height"     // stretch to 100% width & height
    | "no-repeat"             // natural size, no tiling
    | "repeat"                // tile both axes
    | "repeat-x";             // tile horizontally only
  bgFade?: "none" | "light" | "half" | "heavy"; // "Background Image Opacity" overlay
  bgBlur?: boolean;          // blur the background image (content stays sharp)
  bgBlurIntensity?: number;  // 0-100 (%) → px of blur
  // Spacing — per-side overrides; fall back to the X/Y shorthands below.
  paddingY?: number;   // px
  paddingX?: number;   // px
  marginY?: number;    // px
  pt?: number; pr?: number; pb?: number; pl?: number;
  mt?: number; mr?: number; mb?: number; ml?: number;
  radius?: number;     // px (corner radius, all corners)
  radiusTL?: number; radiusTR?: number; radiusBR?: number; radiusBL?: number; // per-corner overrides
  shadow?: "none" | "soft" | "elevated";
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;    // 0-100
  valign?: "start" | "center" | "end"; // vertical alignment of a column's children (justify-content)
  itemsAlign?: "start" | "center" | "end" | "stretch"; // horizontal alignment of a column's block children (align-items)
  widthPx?: number;    // explicit width in px (overrides the width preset)
  heightPx?: number;   // explicit min-height in px
  zIndex?: number;
  overflow?: "visible" | "hidden" | "auto" | "scroll";
  // Per-breakpoint visibility (GHL parity, Copilot-ratified). Used for columns + elements.
  hiddenDesktop?: boolean;
  hiddenTablet?: boolean;
  hiddenMobile?: boolean;
}

// ---- Responsive (per-breakpoint) overrides (Copilot architecture) ----------
export type Breakpoint = "desktop" | "tablet" | "mobile";
/** Diffs-only overrides for tablet/mobile + a per-breakpoint hide flag. */
export interface ResponsiveOverrides {
  tablet?: Partial<ElementStyle> & { hidden?: boolean; stackOnMobile?: boolean };
  mobile?: Partial<ElementStyle> & { hidden?: boolean; stackOnMobile?: boolean };
}
/** Breakpoint max-widths (px). Desktop = default (no query). */
export const BP_MAX: Record<Exclude<Breakpoint, "desktop">, number> = { tablet: 1024, mobile: 768 };

/** Cascade desktop → tablet → mobile, returning the resolved style (+ hidden/stack). */
export function resolveStyle(
  base: ElementStyle | undefined,
  responsive: ResponsiveOverrides | undefined,
  bp: Breakpoint
): ElementStyle & { hidden?: boolean; stackOnMobile?: boolean } {
  const b = base ?? {};
  if (bp === "desktop") return b;
  const t = responsive?.tablet ?? {};
  if (bp === "tablet") return { ...b, ...t };
  return { ...b, ...t, ...(responsive?.mobile ?? {}) };
}

export type EntranceAnim = "none" | "fade-in" | "fade-up" | "fade-down" | "fade-left" | "fade-right" | "slide-up" | "slide-down" | "bounce";
export type HoverAnim = "none" | "elevate" | "wobble";

export interface ElementAnimation {
  entrance?: EntranceAnim;
  hover?: HoverAnim;
}

export const ENTRANCE_OPTIONS: EntranceAnim[] = ["none", "fade-in", "fade-up", "fade-down", "fade-left", "fade-right", "slide-up", "slide-down", "bounce"];
export const HOVER_OPTIONS: HoverAnim[] = ["none", "elevate", "wobble"];

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  fullWidth: "fluid", align: "center", bg: "transparent",
  paddingY: 48, paddingX: 24, marginY: 0, radius: 0, shadow: "none",
  borderStyle: "none", borderColor: "var(--abc-color-border)", borderWidth: 1,
};

const SHADOWS: Record<NonNullable<ElementStyle["shadow"]>, string> = {
  none: "none",
  soft: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
  elevated: "0 10px 30px rgba(0,0,0,0.18)",
};

function bgValue(bg?: string): string | undefined {
  if (!bg || bg === "transparent") return undefined;
  if (bg === "surface") return "var(--abc-color-surface)";
  if (bg === "primary") return "var(--abc-color-primary)";
  if (bg === "accent") return "var(--abc-color-accent)";
  return bg; // hex / custom
}

const WIDTHS: Record<NonNullable<ElementStyle["width"]>, string> = {
  full: "100%", wide: "1200px", normal: "960px", narrow: "680px",
};

/** Map the "Image Options" mode → background size/position/repeat/attachment. */
export function bgImageLayout(mode?: ElementStyle["bgImageMode"]): {
  size: string; position: string; repeat: string; attachment?: string;
} {
  switch (mode) {
    case "full-center-parallax": return { size: "cover", position: "center", repeat: "no-repeat", attachment: "fixed" };
    case "fill-width":           return { size: "100% auto", position: "center top", repeat: "no-repeat" };
    case "fill-width-height":    return { size: "100% 100%", position: "center", repeat: "no-repeat" };
    case "no-repeat":            return { size: "auto", position: "center", repeat: "no-repeat" };
    case "repeat":               return { size: "auto", position: "top left", repeat: "repeat" };
    case "repeat-x":             return { size: "auto", position: "top left", repeat: "repeat-x" };
    case "full-center":
    default:                     return { size: "cover", position: "center", repeat: "no-repeat" };
  }
}

const FADE_ALPHA: Record<NonNullable<ElementStyle["bgFade"]>, number> = {
  none: 0, light: 0.25, half: 0.5, heavy: 0.75,
};
/** % blur (0-100) → px (capped at 20px). */
export function bgBlurPx(pct?: number): number { return Math.round(((pct ?? 30) / 100) * 20); }

/** Inline CSS for the absolutely-positioned background-image LAYER (so blur/parallax
 *  never affect the element's own content). Returns null when there is no image. */
export function bgLayerCss(s?: ElementStyle): CSSProperties | null {
  if (!s?.bgImage) return null;
  const L = bgImageLayout(s.bgImageMode);
  const css: CSSProperties = {
    position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
    backgroundImage: `url(${s.bgImage})`,
    backgroundSize: L.size, backgroundPosition: L.position, backgroundRepeat: L.repeat,
    borderRadius: "inherit",
  };
  if (L.attachment) css.backgroundAttachment = L.attachment;
  if (s.bgBlur) css.filter = `blur(${bgBlurPx(s.bgBlurIntensity)}px)`;
  return css;
}

/** Inline CSS for the fade overlay above the image layer ("Background Image Opacity"). */
export function bgFadeOverlayCss(s?: ElementStyle): CSSProperties | null {
  if (!s?.bgImage) return null;
  const a = FADE_ALPHA[s.bgFade ?? "none"];
  if (!a) return null;
  return { position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: `rgba(255,255,255,${a})`, borderRadius: "inherit" };
}

/** True when this style needs the layered background treatment (image present). */
export function hasBgLayer(s?: ElementStyle): boolean { return !!s?.bgImage; }

/** Background-ONLY CSS for a container (page/section wrapper): solid/gradient color
 *  + (when not layered) the image with its Image-Options layout + fade. No box-model
 *  (padding/margin/border) so it never distorts the wrapped layout. Returns {} when
 *  there's nothing to paint. `bgAsLayer` omits the image (caller renders bgLayerCss). */
export function backgroundOnlyCss(s?: ElementStyle, opts?: { bgAsLayer?: boolean }): CSSProperties {
  if (!s) return {};
  const css: CSSProperties = {};
  const bg = bgValue(s.bg);
  if (bg) css.background = bg;
  if (s.bgImage && !opts?.bgAsLayer) {
    const L = bgImageLayout(s.bgImageMode);
    const fade = FADE_ALPHA[s.bgFade ?? "none"];
    css.backgroundImage = fade
      ? `linear-gradient(rgba(255,255,255,${fade}),rgba(255,255,255,${fade})), url(${s.bgImage})`
      : `url(${s.bgImage})`;
    css.backgroundSize = L.size; css.backgroundPosition = L.position; css.backgroundRepeat = L.repeat;
    if (L.attachment) css.backgroundAttachment = L.attachment;
  }
  return css;
}

/** Convert an ElementStyle to inline CSS for the renderer.
 *  `opts.bgAsLayer` omits the background-image declarations (the caller renders a
 *  separate layer via bgLayerCss) and makes the box a positioning context. */
export function styleToCss(s?: ElementStyle, opts?: { bgAsLayer?: boolean }): CSSProperties {
  const st = { ...DEFAULT_ELEMENT_STYLE, ...(s ?? {}) };
  const pick = (side: number | undefined, fb: number | undefined) => (side ?? fb ?? 0);
  const css: CSSProperties = {
    paddingTop: pick(st.pt, st.paddingY), paddingBottom: pick(st.pb, st.paddingY),
    paddingLeft: pick(st.pl, st.paddingX), paddingRight: pick(st.pr, st.paddingX),
    marginTop: pick(st.mt, st.marginY), marginBottom: pick(st.mb, st.marginY),
    borderRadius: st.radius,
    textAlign: st.align as CSSProperties["textAlign"],
    boxShadow: SHADOWS[st.shadow ?? "none"],
  };
  // Per-corner radius overrides (fall back to the all-corners radius).
  if (st.radiusTL != null || st.radiusTR != null || st.radiusBR != null || st.radiusBL != null) {
    const r = st.radius ?? 0;
    css.borderTopLeftRadius = st.radiusTL ?? r;
    css.borderTopRightRadius = st.radiusTR ?? r;
    css.borderBottomRightRadius = st.radiusBR ?? r;
    css.borderBottomLeftRadius = st.radiusBL ?? r;
  }
  if (st.opacity != null && st.opacity < 100) css.opacity = Math.max(0, st.opacity) / 100;
  if (st.valign) css.justifyContent = st.valign === "center" ? "center" : st.valign === "end" ? "flex-end" : "flex-start";
  if (st.itemsAlign) css.alignItems = st.itemsAlign === "center" ? "center" : st.itemsAlign === "end" ? "flex-end" : st.itemsAlign === "stretch" ? "stretch" : "flex-start";
  if (st.ml != null) css.marginLeft = st.ml;
  if (st.mr != null) css.marginRight = st.mr;
  const bg = bgValue(st.bg);
  if (bg) css.background = bg;
  if (st.bgImage) {
    if (opts?.bgAsLayer) {
      // Image rendered by a separate layer (bgLayerCss); just establish a context.
      css.position = (css as any).position ?? "relative";
    } else {
      // Inline fallback (non-layered consumers): honor the Image Options mode and,
      // when a fade is set, composite a white overlay above the image. Blur is not
      // available inline (it would blur content) — only the layered path supports it.
      const L = bgImageLayout(st.bgImageMode);
      const fade = FADE_ALPHA[st.bgFade ?? "none"];
      css.backgroundImage = fade
        ? `linear-gradient(rgba(255,255,255,${fade}),rgba(255,255,255,${fade})), url(${st.bgImage})`
        : `url(${st.bgImage})`;
      css.backgroundSize = L.size;
      css.backgroundPosition = L.position;
      css.backgroundRepeat = L.repeat;
      if (L.attachment) css.backgroundAttachment = L.attachment;
    }
  }
  if (st.borderStyle && st.borderStyle !== "none") {
    css.borderStyle = st.borderStyle;
    css.borderWidth = st.borderWidth ?? 1;
    css.borderColor = st.borderColor ?? "var(--abc-color-border)";
  }
  if (st.widthPx != null) { css.width = st.widthPx; css.maxWidth = "100%"; }
  // width preset / boxed: cap the max-width and centre with auto margins. width:100% is
  // REQUIRED — without it, an element that is a grid/flex item collapses to its content
  // width (auto margins disable item stretching), squeezing boxed rows to ~500px in preview.
  else if (st.width) { css.width = "100%"; css.maxWidth = WIDTHS[st.width]; css.marginLeft = "auto"; css.marginRight = "auto"; }
  else if (st.fullWidth === "fixed") { css.width = "100%"; css.maxWidth = "var(--abc-maxw, 1200px)"; css.marginLeft = "auto"; css.marginRight = "auto"; }
  if (st.heightPx != null) css.minHeight = st.heightPx;
  if (st.zIndex != null) css.zIndex = st.zIndex;
  if (st.overflow) css.overflow = st.overflow;
  return css;
}

// ---- Public-route media-query emission (Copilot step 6) --------------------
const UNITLESS = new Set(["opacity", "zIndex", "fontWeight", "lineHeight", "flexGrow", "order"]);
function kebab(k: string): string { return k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()); }
/** CSS declaration text from a CSSProperties object (numbers → px unless unitless). */
function cssText(css: CSSProperties, important = false): string {
  return Object.entries(css)
    .map(([k, v]) => {
      if (v == null || v === "") return "";
      const val = typeof v === "number" && !UNITLESS.has(k) ? `${v}px` : String(v);
      return `${kebab(k)}:${val}${important ? " !important" : ""};`;
    })
    .filter(Boolean).join("");
}
/**
 * Emit media-query CSS for an element's responsive overrides, keyed by `selector`
 * (e.g. ".el-12"). The base style stays inline; these rules override it under each
 * breakpoint (!important beats the inline base). Returns "" when there are no overrides.
 */
export function responsiveCss(selector: string, base: ElementStyle | undefined, responsive: ResponsiveOverrides | undefined): string {
  if (!responsive) return "";
  let out = "";
  (["tablet", "mobile"] as const).forEach((bp) => {
    const ov = responsive[bp];
    if (!ov || Object.keys(ov).length === 0) return;
    const resolved = resolveStyle(base, responsive, bp);
    let body = ov.hidden ? "display:none !important;" : cssText(styleToCss(resolved), true);
    if (ov.stackOnMobile) body += "grid-template-columns:1fr !important;";
    out += `@media (max-width:${BP_MAX[bp]}px){${selector}{${body}}}`;
  });
  return out;
}

/** Class names for entrance + hover animations (CSS defined in globals.css). */
export function animClasses(a?: ElementAnimation): string {
  const out: string[] = [];
  if (a?.entrance && a.entrance !== "none") out.push(`abc-anim-${a.entrance}`);
  if (a?.hover && a.hover !== "none") out.push(`abc-hover-${a.hover}`);
  return out.join(" ");
}
