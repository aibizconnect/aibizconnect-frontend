import { z } from "zod";

/**
 * Design-system foundation (DL-2, ratified). Brand TOKENS are the single source of
 * visual truth a tenant's whole experience renders against — every Agent Mesh role
 * (brand, content, UX, SEO, nav, social, email) composes against these, never raw
 * ad-hoc styles. This is the substrate that makes cohesive, premium output possible.
 *
 * Tokens are intentionally semantic (role-named: primary, surface, accent…) rather
 * than literal, so a re-theme is a token swap, not a content rewrite. Stored per
 * tenant in the shared brand/design memory (M-3) and read by every renderer.
 */

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

export const colorTokensSchema = z.object({
  primary: hex,
  primaryContrast: hex,
  accent: hex,
  surface: hex,
  surfaceContrast: hex,
  background: hex,
  foreground: hex,
  muted: hex,
  border: hex,
  success: hex.optional(),
  warning: hex.optional(),
  danger: hex.optional(),
});

export const typographyTokensSchema = z.object({
  fontHeading: z.string().min(1),     // display/headings — MontserratAlt1
  fontBody: z.string().min(1),        // = font.system (body copy) — Poppins
  fontMono: z.string().optional(),
  /**
   * font.displayBrand (SHARED_SPEC): the special face used ONLY where the literal
   * "AI BIZ Connect" name appears. Everything else uses fontBody (font.system).
   */
  fontDisplayBrand: z.string().default("MontserratAlt1"),
  scale: z.enum(["compact", "default", "spacious"]).default("default"),
  baseSizePx: z.number().int().min(12).max(20).default(16),
});

export const spacingTokensSchema = z.object({
  unitPx: z.number().int().min(2).max(12).default(4), // base spacing unit
  radiusPx: z.number().int().min(0).max(48).default(12),
  maxWidthPx: z.number().int().min(640).max(1600).default(1200),
});

export const breakpointTokensSchema = z.object({
  sm: z.number().int().default(640),
  md: z.number().int().default(768),
  lg: z.number().int().default(1024),
  xl: z.number().int().default(1280),
});

export const brandTokensSchema = z.object({
  version: z.literal("1.0").default("1.0"),
  colors: colorTokensSchema,
  typography: typographyTokensSchema,
  spacing: spacingTokensSchema.default(spacingTokensSchema.parse({})),
  breakpoints: breakpointTokensSchema.default(breakpointTokensSchema.parse({})),
  /** Optional motion/elevation presets for premium polish. */
  elevation: z.enum(["flat", "soft", "elevated"]).default("soft"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
});

export type BrandTokens = z.infer<typeof brandTokensSchema>;

/**
 * AIBizConnect house default — REAL brand (Canva kit + live aibizconnect.ca): royal/navy
 * blue with a cyan accent, MontserratAlt1 display + Poppins body. Seed theme + the fallback
 * every tenant re-themes from. (Exact brand-blue hex to be confirmed from Canva swatch.)
 */
export const DEFAULT_BRAND_TOKENS: BrandTokens = brandTokensSchema.parse({
  colors: {
    primary: "#2563eb",
    primaryContrast: "#ffffff",
    accent: "#22d3ee",
    surface: "#0f1b33",
    surfaceContrast: "#f9fafb",
    background: "#0a1224",
    foreground: "#e8eefc",
    muted: "#93a4c4",
    border: "#1e2c49",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
  typography: {
    fontHeading: "MontserratAlt1, Inter, sans-serif",
    fontBody: "Poppins, Inter, system-ui, sans-serif",
    fontDisplayBrand: "MontserratAlt1, Inter, sans-serif",
    scale: "default",
    baseSizePx: 16,
  },
});

/** Flatten tokens to CSS custom properties for the renderer (--abc-*). */
export function tokensToCssVars(t: BrandTokens): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(t.colors)) if (val) v[`--abc-color-${k}`] = val as string;
  v["--abc-font-heading"] = t.typography.fontHeading;
  v["--abc-font-body"] = t.typography.fontBody;
  v["--abc-font-display-brand"] = t.typography.fontDisplayBrand;
  v["--abc-base-size"] = `${t.typography.baseSizePx}px`;
  v["--abc-space-unit"] = `${t.spacing.unitPx}px`;
  v["--abc-radius"] = `${t.spacing.radiusPx}px`;
  v["--abc-maxw"] = `${t.spacing.maxWidthPx}px`;

  // Derived scales (Phase-1 design tokens, architect D-110/D-111). All derived from the
  // base tokens above so they re-theme in one shot — no schema change. Additive only.
  const base = t.typography.baseSizePx; // px
  const fontSizes: Record<string, number> = {
    xs: 0.75, sm: 0.875, md: 1, lg: 1.125, xl: 1.25,
    "2xl": 1.5, "3xl": 1.875, "4xl": 2.25, "5xl": 3,
  };
  for (const [k, mult] of Object.entries(fontSizes)) v[`--abc-font-size-${k}`] = `${(base * mult).toFixed(2)}px`;

  const unit = t.spacing.unitPx; // base spacing unit (e.g. 4px)
  const spaceScale: Record<string, number> = { xs: 1, sm: 2, md: 4, lg: 6, xl: 8, "2xl": 12, "3xl": 16 };
  for (const [k, mult] of Object.entries(spaceScale)) v[`--abc-space-${k}`] = `${unit * mult}px`;

  const r = t.spacing.radiusPx;
  v["--abc-radius-sm"] = `${Math.round(r / 3)}px`;
  v["--abc-radius-md"] = `${r}px`;
  v["--abc-radius-lg"] = `${Math.round(r * 1.5)}px`;
  v["--abc-radius-full"] = "9999px";

  v["--abc-shadow-sm"] = "0 1px 2px rgba(0,0,0,0.05)";
  v["--abc-shadow-md"] = "0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)";
  v["--abc-shadow-lg"] = "0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)";
  return v;
}

/**
 * Phase-1 token bridge (architect D-109/D-112). Deterministically map a MERGED
 * website_brand_settings row (see mergeBrandRows) into the canonical BrandTokens, with
 * SAFE light fallbacks (the migration-0031 palette defaults) so injecting --abc-* vars can
 * never darken an existing light tenant site. Pure function, no DB, never throws.
 *
 * Source-of-truth precedence per field: color_palette / font_pairing (0031 JSONB) →
 * legacy scalar columns (primary_color, font_heading…) → light defaults.
 */
export function resolveBrandTokens(brand: any): BrandTokens {
  const b = brand ?? {};
  const pal = (b.color_palette && typeof b.color_palette === "object") ? b.color_palette : {};
  const fonts = (b.font_pairing && typeof b.font_pairing === "object") ? b.font_pairing : {};
  const okHex = (s: any) => typeof s === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
  const pickHex = (...vals: any[]) => vals.find(okHex) as string | undefined;
  const pickStr = (...vals: any[]) => vals.find((s) => typeof s === "string" && s.trim() !== "") as string | undefined;

  // LIGHT defaults — match migration 0031 color_palette / font_pairing defaults.
  const primary = pickHex(pal.primary, b.primary_color) ?? "#1e3a8a";
  const accent = pickHex(pal.accent, b.accent_color) ?? "#22d3ee";
  const surface = pickHex(pal.surface) ?? "#f8fafc";
  const background = pickHex(pal.background) ?? "#ffffff";
  const foreground = pickHex(pal.foreground) ?? "#0f172a";
  const muted = pickHex(pal.muted) ?? "#64748b";
  const border = pickHex(pal.border) ?? "#e2e8f0";

  const fontHeading = pickStr(fonts.heading, b.font_heading) ?? "Inter, system-ui, sans-serif";
  const fontBody = pickStr(fonts.body, b.font_body) ?? "Inter, system-ui, sans-serif";

  // Radius from button_style.borderRadius (e.g. "10px") when present.
  let radiusPx = 12;
  const br = b.button_style && typeof b.button_style === "object" ? b.button_style.borderRadius : undefined;
  if (typeof br === "string") { const n = parseInt(br, 10); if (Number.isFinite(n)) radiusPx = Math.max(0, Math.min(48, n)); }

  const candidate = {
    colors: {
      primary, primaryContrast: "#ffffff", accent,
      surface, surfaceContrast: foreground, background, foreground, muted, border,
    },
    typography: {
      fontHeading: fontHeading.includes(",") ? fontHeading : `${fontHeading}, system-ui, sans-serif`,
      fontBody: fontBody.includes(",") ? fontBody : `${fontBody}, system-ui, sans-serif`,
      fontDisplayBrand: "MontserratAlt1, Inter, sans-serif",
      scale: "default" as const,
      baseSizePx: 16,
    },
    spacing: { unitPx: 4, radiusPx, maxWidthPx: 1200 },
  };
  const parsed = brandTokensSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_BRAND_TOKENS;
}
