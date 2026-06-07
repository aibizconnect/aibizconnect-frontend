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
  return v;
}
