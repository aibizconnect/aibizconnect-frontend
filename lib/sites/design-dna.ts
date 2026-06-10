/**
 * DESIGN DNA — curated aesthetics the from-scratch generator composes from.
 *
 * The blueprint (lib/sites/blueprint.ts) decides WHICH sections appear and in what order.
 * The DNA decides how they LOOK: a cohesive theme (palette + a real type scale) plus a
 * per-archetype style layer (background rhythm, generous whitespace, soft elevation,
 * tasteful entrance motion). The generator attaches these as the section `_style`/`_anim`
 * — which SectionView already renders — so every value stays fully editable afterwards
 * (user edits always win; this is just a beautiful default instead of a flat wireframe).
 *
 * Design choices are deliberately renderer-safe: section backgrounds use explicit HEX
 * (not --abc tokens that may be unset on a fresh site) and stay LIGHT/airy so the
 * components' default dark text always has contrast. Luxury here = restraint, warm
 * neutrals, a single metallic accent, big serif headings, and air.
 */

import type { ElementStyle, ElementAnimation } from "@/lib/design/element-style";
import type { ThemeTokens, RoleStyle } from "@/lib/sections/theme";
import type { Archetype } from "@/lib/sites/blueprint";
import type { BusinessProfile } from "@/lib/sites/page-generate";

export interface Aesthetic {
  id: string;
  label: string;
  /** When this aesthetic is a good fit (industry/tone keywords). Higher = stronger match. */
  fits: (p: BusinessProfile) => number;
  /** Google-Fonts @import (injected into theme.site.siteCustomCss so editor + public load it). */
  fontsImportCss: string;
  /** Full theme (palette + type scale). Tenant brand color is woven in by themeFor(). */
  theme: (p: BusinessProfile) => ThemeTokens;
  /** Container style + entrance motion for one section, given its archetype and position. */
  sectionStyle: (arch: Archetype, index: number, total: number) => { _style?: ElementStyle; _anim?: ElementAnimation };
}

// ── helpers ────────────────────────────────────────────────────────────────────
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const cleanHex = (c?: string | null) => (typeof c === "string" && HEX.test(c.trim()) ? c.trim() : undefined);
const hay = (p: BusinessProfile) => `${p.industry || ""} ${p.tone || ""} ${(p.services_products || []).join(" ")}`.toLowerCase();
const role = (r: RoleStyle): RoleStyle => r; // identity for readable literals

// ════════════════════════════════════════════════════════════════════════════════
// 1) CONTEMPORARY LUXURY — warm ivory + ink + a champagne-gold accent, Playfair
//    Display headings over Inter body. Boutique / hospitality / premium services.
// ════════════════════════════════════════════════════════════════════════════════
const LUX = {
  ivory: "#F7F4EF",   // page / warm bands
  white: "#FFFFFF",   // clean bands
  panel: "#F1EADD",   // gold-tinted panel (CTA)
  ink: "#1A1714",     // near-black warm — headings
  body: "#5C544B",    // muted taupe — body copy
  gold: "#B08D57",    // champagne accent (default; overridden by tenant brand)
  hair: "#E4DCCE",    // hairline borders
};

const contemporaryLuxury: Aesthetic = {
  id: "contemporary-luxury",
  label: "Contemporary Luxury",
  fits: (p) => {
    const h = hay(p);
    let s = 1; // viable for anyone as the flagship default
    if (/(luxury|premium|boutique|hospitality|hotel|spa|interior|architect|jewel|fashion|fine|estate|real ?estate|law|wealth|concierge|aesthetic|design)/.test(h)) s += 3;
    if (/(elegant|refined|sophisticat|timeless|exclusive|bespoke|upscale|high-?end)/.test(h)) s += 2;
    return s;
  },
  fontsImportCss:
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap');",
  theme: (p) => {
    const accent = cleanHex(p.brand_colors?.[0]) ?? LUX.gold;
    const typo = (fam: string, over: RoleStyle): RoleStyle => ({ fontFamily: fam, ...over });
    return {
      colors: { primary: LUX.ink, secondary: LUX.body, accent, background: LUX.ivory, text: LUX.ink },
      fonts: { heading: "Playfair Display", body: "Inter" },
      typography: {
        // Display & headings — Playfair Display, high contrast, tight tracking.
        h1: typo("Playfair Display", role({ fontSize: 66, fontWeight: "600", lineHeight: 1.04, letterSpacing: -0.6, color: LUX.ink })),
        h2: typo("Playfair Display", role({ fontSize: 42, fontWeight: "600", lineHeight: 1.14, letterSpacing: -0.4, color: LUX.ink })),
        h3: typo("Playfair Display", role({ fontSize: 27, fontWeight: "500", lineHeight: 1.25, color: LUX.ink })),
        h4: typo("Inter", role({ fontSize: 20, fontWeight: "300", lineHeight: 1.6, color: LUX.body })),
        // Eyebrow / section kicker — small, spaced, uppercase Inter in the accent.
        h5: typo("Inter", role({ fontSize: 13, fontWeight: "600", letterSpacing: 2.2, textTransform: "uppercase", color: accent })),
        body:         typo("Inter", role({ fontSize: 17, fontWeight: "400", lineHeight: 1.75, color: LUX.body })),
        quote:        typo("Playfair Display", role({ fontSize: 25, fontWeight: "500", italic: true, lineHeight: 1.5, color: LUX.ink })),
        button:       typo("Inter", role({ fontSize: 14, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" })),
        menu:         typo("Inter", role({ fontSize: 15, fontWeight: "500", letterSpacing: 0.3, color: LUX.ink })),
        submenu:      typo("Inter", role({ fontSize: 14, fontWeight: "400", color: LUX.body })),
      },
      customFonts: [],
      radii: { sm: 2, md: 4, lg: 8 },     // luxury = crisp, minimal rounding
      spacing: { sm: 10, md: 22, lg: 48 },
    };
  },
  sectionStyle: (arch, index) => {
    const fade: ElementAnimation = { entrance: index === 0 ? "fade-in" : "fade-up" };
    // Generous, intentional vertical rhythm; alternate ivory/white bands; one tinted CTA panel.
    switch (arch) {
      case "hero":
        return { _style: { bg: LUX.ivory, pt: 140, pb: 120, paddingX: 24, align: "center", heightPx: 600, width: "wide" }, _anim: { entrance: "fade-in" } };
      case "features":
        return { _style: { bg: LUX.white, pt: 112, pb: 112, paddingX: 24, align: "center" }, _anim: fade };
      case "stats":
        return { _style: { bg: LUX.ivory, pt: 92, pb: 92, paddingX: 24, align: "center", borderStyle: "solid", borderWidth: 1, borderColor: LUX.hair }, _anim: fade };
      case "testimonials":
        return { _style: { bg: LUX.white, pt: 116, pb: 116, paddingX: 24, align: "center" }, _anim: fade };
      case "gallery":
        return { _style: { bg: LUX.white, pt: 96, pb: 96, paddingX: 24, align: "center" }, _anim: fade };
      case "logos":
        return { _style: { bg: LUX.ivory, pt: 64, pb: 64, paddingX: 24, align: "center" }, _anim: { entrance: "fade-in" } };
      case "pricing":
        return { _style: { bg: LUX.ivory, pt: 112, pb: 112, paddingX: 24, align: "center" }, _anim: fade };
      case "faq":
        return { _style: { bg: LUX.white, pt: 104, pb: 104, paddingX: 24, align: "center", width: "normal" }, _anim: fade };
      case "cta":
        return { _style: { bg: LUX.panel, pt: 124, pb: 124, paddingX: 24, align: "center", borderStyle: "solid", borderWidth: 1, borderColor: LUX.hair }, _anim: fade };
      default:
        return { _style: { bg: LUX.white, pt: 88, pb: 88, paddingX: 24, align: "center" }, _anim: fade };
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// 2) MINIMAL EDITORIAL — crisp white, charcoal ink, a single confident accent.
//    Montserrat headings, generous whitespace. SaaS / agency / modern services.
// ════════════════════════════════════════════════════════════════════════════════
const EDI = {
  white: "#FFFFFF",
  mist: "#F6F7F9",
  ink: "#14181F",
  body: "#525A66",
  accent: "#1F6FEB",
  hair: "#E6E9EE",
  panel: "#10131A",
};

const minimalEditorial: Aesthetic = {
  id: "minimal-editorial",
  label: "Minimal Editorial",
  fits: (p) => {
    const h = hay(p);
    let s = 1;
    if (/(saas|software|tech|app|platform|startup|agency|marketing|consult|finance|analytics|b2b|digital|studio)/.test(h)) s += 3;
    if (/(modern|clean|minimal|bold|innovat|fast|smart)/.test(h)) s += 2;
    return s;
  },
  fontsImportCss:
    "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&display=swap');",
  theme: (p) => {
    const accent = cleanHex(p.brand_colors?.[0]) ?? EDI.accent;
    const typo = (fam: string, over: RoleStyle): RoleStyle => ({ fontFamily: fam, ...over });
    return {
      colors: { primary: EDI.ink, secondary: EDI.body, accent, background: EDI.white, text: EDI.ink },
      fonts: { heading: "Montserrat", body: "Inter" },
      typography: {
        h1: typo("Montserrat", role({ fontSize: 58, fontWeight: "800", lineHeight: 1.05, letterSpacing: -1.2, color: EDI.ink })),
        h2: typo("Montserrat", role({ fontSize: 38, fontWeight: "700", lineHeight: 1.15, letterSpacing: -0.8, color: EDI.ink })),
        h3: typo("Montserrat", role({ fontSize: 24, fontWeight: "600", lineHeight: 1.3, color: EDI.ink })),
        h4: typo("Inter", role({ fontSize: 20, fontWeight: "400", lineHeight: 1.6, color: EDI.body })),
        h5: typo("Montserrat", role({ fontSize: 13, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: accent })),
        body:         typo("Inter", role({ fontSize: 17, fontWeight: "400", lineHeight: 1.7, color: EDI.body })),
        quote:        typo("Inter", role({ fontSize: 22, fontWeight: "500", lineHeight: 1.5, color: EDI.ink })),
        button:       typo("Inter", role({ fontSize: 15, fontWeight: "600", letterSpacing: 0.2 })),
        menu:         typo("Inter", role({ fontSize: 15, fontWeight: "500", color: EDI.ink })),
        submenu:      typo("Inter", role({ fontSize: 14, fontWeight: "400", color: EDI.body })),
      },
      customFonts: [],
      radii: { sm: 8, md: 12, lg: 20 },
      spacing: { sm: 8, md: 16, lg: 40 },
    };
  },
  sectionStyle: (arch, index) => {
    const fade: ElementAnimation = { entrance: index === 0 ? "fade-in" : "fade-up" };
    switch (arch) {
      case "hero":
        return { _style: { bg: EDI.white, pt: 128, pb: 112, paddingX: 24, align: "center", heightPx: 560, width: "wide" }, _anim: { entrance: "fade-in" } };
      case "features":
        return { _style: { bg: EDI.mist, pt: 104, pb: 104, paddingX: 24, align: "center" }, _anim: fade };
      case "stats":
        return { _style: { bg: EDI.white, pt: 88, pb: 88, paddingX: 24, align: "center" }, _anim: fade };
      case "testimonials":
        return { _style: { bg: EDI.mist, pt: 104, pb: 104, paddingX: 24, align: "center" }, _anim: fade };
      case "gallery":
        return { _style: { bg: EDI.white, pt: 88, pb: 88, paddingX: 24, align: "center" }, _anim: fade };
      case "logos":
        return { _style: { bg: EDI.white, pt: 56, pb: 56, paddingX: 24, align: "center", borderStyle: "solid", borderWidth: 1, borderColor: EDI.hair }, _anim: { entrance: "fade-in" } };
      case "pricing":
        return { _style: { bg: EDI.mist, pt: 104, pb: 104, paddingX: 24, align: "center" }, _anim: fade };
      case "faq":
        return { _style: { bg: EDI.white, pt: 96, pb: 96, paddingX: 24, align: "center", width: "normal" }, _anim: fade };
      case "cta":
        return { _style: { bg: EDI.mist, pt: 112, pb: 112, paddingX: 24, align: "center", radius: 0 }, _anim: fade };
      default:
        return { _style: { bg: EDI.white, pt: 80, pb: 80, paddingX: 24, align: "center" }, _anim: fade };
    }
  },
};

// ── registry ─────────────────────────────────────────────────────────────────────
export const AESTHETICS: Aesthetic[] = [contemporaryLuxury, minimalEditorial];
export const DEFAULT_AESTHETIC = contemporaryLuxury;

/** Choose the best-fitting aesthetic for a tenant (explicit id wins, else best score). */
export function pickAesthetic(p: BusinessProfile, preferId?: string): Aesthetic {
  if (preferId) { const m = AESTHETICS.find((a) => a.id === preferId); if (m) return m; }
  let best = DEFAULT_AESTHETIC, bestScore = -1;
  for (const a of AESTHETICS) { const s = a.fits(p); if (s > bestScore) { best = a; bestScore = s; } }
  return best;
}

/** The resolved theme for an aesthetic, with the tenant's brand color woven in. */
export function themeForAesthetic(a: Aesthetic, p: BusinessProfile): ThemeTokens {
  return a.theme(p);
}

/**
 * Attach the aesthetic's per-archetype `_style`/`_anim` onto the blueprint sections.
 * `blueprint[i]` is the archetype that produced `sections[i]` (same order), so we zip
 * them. Returns NEW section objects (never mutates) — user edits later override these.
 */
const TYPE_TO_ARCH: Record<string, Archetype> = {
  hero: "hero", features: "features", testimonials: "testimonials", pricing: "pricing",
  faq: "faq", cta: "cta", logos: "logos", gallery: "gallery",
};
/** Best-effort archetype for a built section: its own type wins, else the blueprint slot. */
function archOf(sec: Record<string, unknown>, fallback: Archetype | undefined): Archetype {
  const t = String(sec.type || "");
  if (TYPE_TO_ARCH[t]) return TYPE_TO_ARCH[t];
  if (t === "row" && /highlight|stat|number/i.test(String(sec._name || ""))) return "stats";
  return fallback ?? "content";
}

export function applyDnaToSections(
  blueprint: Archetype[],
  sections: Record<string, unknown>[],
  a: Aesthetic,
): Record<string, unknown>[] {
  return sections.map((sec, i) => {
    const arch = archOf(sec, blueprint[i]);
    const { _style, _anim } = a.sectionStyle(arch, i, sections.length);
    const out: Record<string, unknown> = { ...sec };
    if (_style) out._style = { ...(sec._style as object ?? {}), ..._style };
    if (_anim) out._anim = { ...(sec._anim as object ?? {}), ..._anim };
    return out;
  });
}
