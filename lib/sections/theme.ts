// Step 29: tenant theme tokens (colors, fonts, radii, spacing).

export type FontRole = "title" | "subtitle" | "heading" | "subheading" | "sectionHeader" | "body" | "quote" | "button" | "menu" | "submenu";

export const FONT_ROLES: { key: FontRole; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "heading", label: "Heading" },
  { key: "subheading", label: "Subheading" },
  { key: "sectionHeader", label: "Section Header" },
  { key: "body", label: "Body" },
  { key: "quote", label: "Quote" },
  { key: "button", label: "Button" },
  { key: "menu", label: "Menu" },
  { key: "submenu", label: "Submenu" },
];

export interface CustomFont { name: string; src: string; format?: string }

/** Per-role typographic defaults (global). Any property an element doesn't set
 * inherits from here; setting it on the element overrides just that property. */
export interface RoleStyle {
  fontFamily?: string;
  fontSize?: number;          // px
  fontWeight?: string;        // "400".."800"
  italic?: boolean;
  letterSpacing?: number;     // px
  lineHeight?: number;
  textTransform?: "none" | "uppercase" | "capitalize" | "lowercase";
  color?: string;             // foreground (text) color
  backgroundColor?: string;   // background color behind the text
}

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: { heading: string; body: string };
  typography: Record<FontRole, RoleStyle>; // per-role defaults (global; overridable per element)
  customFonts?: CustomFont[];              // user-uploaded fonts (data-URL or storage URL)
  radii: { sm: number; md: number; lg: number };
  spacing: { sm: number; md: number; lg: number };
}

/** Normalize a role entry to a RoleStyle (legacy string == just a family). */
export function roleStyleFor(theme: any, role: FontRole): RoleStyle {
  const v = theme?.typography?.[role];
  if (typeof v === "string") return { fontFamily: v };
  return v && typeof v === "object" && !Array.isArray(v) ? (v as RoleStyle) : {};
}

/** All families referenced by the role map (for font loading). */
export function roleFamilies(theme: any): string[] {
  return FONT_ROLES.map((r) => roleStyleFor(theme, r.key).fontFamily).filter((f): f is string => !!f);
}

/** Map a text element to its semantic font role (so role fonts apply globally). */
export function roleForElement(type: string, level?: string): FontRole {
  if (type === "subheading") return "subtitle";
  if (type === "text") return "body";
  if (type === "button") return "button";
  // heading element → by level
  switch (level) {
    case "h1": return "title";
    case "h2": return "heading";
    case "h3": return "subheading";
    default: return "sectionHeader";
  }
}

export const SAFE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Georgia",
  "system-ui",
] as const;

export const DEFAULT_THEME: ThemeTokens = {
  colors: {
    primary: "#0f172a",
    secondary: "#64748b",
    accent: "#2563eb",
    background: "#ffffff",
    text: "#111827",
  },
  fonts: { heading: "Inter", body: "Inter" },
  typography: {
    title: { fontFamily: "Inter" }, subtitle: { fontFamily: "Inter" }, heading: { fontFamily: "Inter" },
    subheading: { fontFamily: "Inter" }, sectionHeader: { fontFamily: "Inter" }, body: { fontFamily: "Inter" },
    quote: { fontFamily: "Inter" }, button: { fontFamily: "Inter" },
    menu: { fontFamily: "Inter" }, submenu: { fontFamily: "Inter" },
  },
  customFonts: [],
  radii: { sm: 4, md: 8, lg: 16 },
  spacing: { sm: 8, md: 16, lg: 32 },
};

export const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Deep-merge plain objects (arrays/scalars overwrite). */
export function deepMerge<T>(base: T, patch: any): T {
  if (patch == null || typeof patch !== "object" || Array.isArray(patch)) {
    return (patch ?? base) as T;
  }
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(patch)) {
    const bv = (base as any)?.[k];
    const pv = patch[k];
    out[k] =
      bv && typeof bv === "object" && !Array.isArray(bv) && pv && typeof pv === "object"
        ? deepMerge(bv, pv)
        : pv;
  }
  return out as T;
}

/**
 * Resolve a full ThemeTokens from a brand row: theme jsonb > legacy columns >
 * defaults. Always returns a complete, valid-shaped theme.
 */
/**
 * A tenant can have MULTIPLE `website_brand_settings` rows (0019 brand-per-website). Any single
 * row may carry only PART of the brand — e.g. one row has the uploaded `customFonts` while the
 * heading font lives on another row's `font_heading`/`theme.fonts.heading`. Picking just one row
 * therefore loses fields, which is why headings fell back to Inter until Typography was opened.
 * This merges the rows into ONE brand object: a base (the customFonts-carrying row, else the
 * first) with every empty font field back-filled from whichever row has it, and customFonts
 * unioned across all rows. Fonts only — colours stay on the base row to avoid cross-site bleed.
 */
const _empty = (v: any) => v === undefined || v === null || v === "";
export function mergeBrandRows(rows: any[]): any {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return {};
  const base = list.find((b: any) => Array.isArray(b?.theme?.customFonts) && b.theme.customFonts.length) ?? list[0];
  const out: any = { ...base, theme: { ...(base.theme ?? {}) } };
  // Back-fill the font columns from any row that has them.
  for (const k of ["font_heading", "font_body"]) {
    if (_empty(out[k])) { const r = list.find((x: any) => !_empty(x?.[k])); if (r) out[k] = r[k]; }
  }
  // Back-fill theme.fonts.{heading,body}.
  out.theme.fonts = { ...(out.theme.fonts ?? {}) };
  for (const k of ["heading", "body"]) {
    if (_empty(out.theme.fonts[k])) { const r = list.find((x: any) => !_empty(x?.theme?.fonts?.[k])); if (r) out.theme.fonts[k] = r.theme.fonts[k]; }
  }
  // Union every uploaded custom font (dedupe by name) so all of them load + show in the picker.
  const seen = new Set<string>();
  const allCf = list.flatMap((x: any) => Array.isArray(x?.theme?.customFonts) ? x.theme.customFonts : [])
    .filter((f: any) => f && typeof f.name === "string" && typeof f.src === "string" && !seen.has(f.name) && seen.add(f.name));
  if (allCf.length) out.theme.customFonts = allCf;
  return out;
}

export function resolveTheme(brand: any): ThemeTokens {
  const legacy: any = {
    colors: {
      primary: brand?.primary_color,
      secondary: brand?.secondary_color,
      accent: brand?.accent_color,
    },
    fonts: { heading: brand?.font_heading, body: brand?.font_body },
  };
  // strip undefined so they don't clobber defaults
  const prune = (o: any): any =>
    Object.fromEntries(
      Object.entries(o)
        .map(([k, v]) => [k, v && typeof v === "object" ? prune(v) : v])
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
  let theme = deepMerge(DEFAULT_THEME, prune(legacy));
  if (brand?.theme && typeof brand.theme === "object") {
    theme = deepMerge(theme, prune(brand.theme));
  }
  // Normalize shape so downstream code never crashes on a malformed value.
  theme.customFonts = Array.isArray(theme.customFonts)
    ? theme.customFonts.filter((f: any) => f && typeof f.name === "string" && typeof f.src === "string")
    : [];
  if (!theme.typography || typeof theme.typography !== "object" || Array.isArray(theme.typography)) {
    theme.typography = { ...DEFAULT_THEME.typography };
  } else {
    // Coerce each role to a RoleStyle object (legacy values were bare family strings).
    const t: any = {};
    for (const r of FONT_ROLES) {
      const v = (theme.typography as any)[r.key];
      t[r.key] = typeof v === "string" ? { fontFamily: v } : (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    }
    theme.typography = t;
  }
  return theme;
}

/** Validate a (partial) theme patch. Throws on invalid values. */
export function validateThemePatch(patch: any): void {
  if (!patch || typeof patch !== "object") throw new Error("Invalid theme patch.");
  if (patch.colors) {
    for (const [k, v] of Object.entries(patch.colors)) {
      if (typeof v !== "string" || !HEX_RE.test(v)) {
        throw new Error(`Color "${k}" must be a hex value (#RGB or #RRGGBB).`);
      }
    }
  }
  if (patch.fonts) {
    for (const [k, v] of Object.entries(patch.fonts)) {
      if (typeof v !== "string" || !SAFE_FONTS.includes(v as any)) {
        throw new Error(`Font "${k}" must be one of: ${SAFE_FONTS.join(", ")}.`);
      }
    }
  }
  for (const group of ["radii", "spacing"]) {
    if (patch[group]) {
      for (const [k, v] of Object.entries(patch[group])) {
        if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
          throw new Error(`${group}.${k} must be a non-negative integer.`);
        }
      }
    }
  }
}
