/**
 * DESIGN BRIDGE (architect D-194, Copilot Design Bridge spec): derive brand/theme tokens from a
 * LOSSLESS import so NATIVE palette elements (Countdown, List, Form…) inserted between imported
 * bands match the design's typography and colors instead of rendering in default theme scale.
 *
 * Three sources, priority order per Copilot:
 *   1. :root CSS variables in the compiled snapshot whose names contain primary, secondary, accent
 *   2. font stylesheet hrefs (Google Fonts URLs carry the family names + weights)
 *   3. the bands' data-cs computed styles, mined by frequency (heading color → primary,
 *      body text color → text, button fill → accent, band bg → background)
 *
 * DETERMINISM (Copilot 4.4): candidates sort by frequency DESC then hex ASC; no timestamps.
 * Output is written ONCE at import into website_brand_settings (only filling EMPTY fields —
 * the tenant's own theme edits always win, D-194 precedence).
 */

export type DerivedTokens = {
  primary?: string;
  secondary?: string;
  accent?: string;
  textBody?: string;
  background?: string;
  fontHeading?: string;
  fontBody?: string;
  flags: Record<string, boolean>;
};

const HEX = /#[0-9a-fA-F]{6}\b/;

function topOf(counts: Map<string, number>): string | undefined {
  // frequency DESC, hex ASC (deterministic tie-break)
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}
function bump(map: Map<string, number>, v?: string | null, by = 1) {
  if (!v || !HEX.test(v)) return;
  const hex = v.toLowerCase();
  map.set(hex, (map.get(hex) || 0) + by);
}

/** Mine data-cs values of elements matching `tagRe` inside raw band html. */
function mine(html: string, tagRe: string, csKey: string, into: Map<string, number>, weight = 1) {
  const re = new RegExp(`<(${tagRe})\\b[^>]*data-cs="([^"]*)"`, "gi");
  for (const m of html.matchAll(re)) {
    const kv = new RegExp(`${csKey}:(rgb\\([^)|]*\\)|#[0-9a-fA-F]{3,8})`).exec(m[2]);
    if (kv) bump(into, rgbToHex(kv[1]), weight);
  }
}
function rgbToHex(v: string): string | undefined {
  if (v.startsWith("#")) return v.length === 7 ? v : undefined;
  const m = /rgba?\(([^)]+)\)/.exec(v);
  if (!m) return undefined;
  const p = m[1].split(",").map((s) => parseInt(s.trim(), 10) || 0);
  if (p.length < 3) return undefined;
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(p[0])}${h(p[1])}${h(p[2])}`;
}

/** Parse Google Fonts stylesheet hrefs → families with their max weight (icon fonts excluded). */
function familiesFromHrefs(hrefs: string[]): { name: string; maxWeight: number }[] {
  const out = new Map<string, number>();
  for (const href of hrefs) {
    for (const m of href.matchAll(/family=([^:&]+)(?::[^@&]*@([0-9;.,]+))?/g)) {
      const name = decodeURIComponent(m[1]).replace(/\+/g, " ").trim();
      if (/material (symbols|icons)/i.test(name)) continue;
      const weights = (m[2] || "400").split(/[;,]/).map((w) => parseInt(w, 10)).filter((n) => !isNaN(n));
      const mw = Math.max(...(weights.length ? weights : [400]));
      out.set(name, Math.max(out.get(name) || 0, mw));
    }
  }
  return Array.from(out.entries()).map(([name, maxWeight]) => ({ name, maxWeight }));
}

export function deriveDesignTokens(sections: Record<string, unknown>[]): DerivedTokens {
  const flags: Record<string, boolean> = { derived_from_snapshot: true };
  const cssSection = sections.find((s) => s.type === "imported-css") as { css?: string; fontHrefs?: string[] } | undefined;
  const bands = sections.filter((s) => s.type === "imported-html") as { html?: string }[];
  const css = cssSection?.css || "";

  // 1) :root variables that NAME a role.
  const rootVars: Record<string, string> = {};
  for (const m of css.matchAll(/--([a-z0-9-]*(primary|secondary|accent)[a-z0-9-]*)\s*:\s*(#[0-9a-fA-F]{6})/gi)) {
    const role = m[2].toLowerCase();
    if (!rootVars[role]) rootVars[role] = m[3].toLowerCase();
  }

  // 3) data-cs mining (frequency-weighted).
  const headingColors = new Map<string, number>();
  const bodyColors = new Map<string, number>();
  const buttonFills = new Map<string, number>();
  const bandBgs = new Map<string, number>();
  for (const b of bands) {
    const h = b.html || "";
    mine(h, "h1|h2|h3|h4", "color", headingColors);
    // paragraphs/list items only — spans are routinely accent-colored chips/badges and would
    // pollute the body-text color (Ottawa: gold "500+" spans outnumbered the gray paragraphs)
    mine(h, "p|li", "color", bodyColors);
    mine(h, "a|button", "backgroundColor", buttonFills);
    mine(h, "section|header|footer|nav", "backgroundColor", bandBgs);
  }

  // 2) fonts from stylesheet hrefs: heaviest max-weight family = heading, the other = body.
  const fams = familiesFromHrefs(cssSection?.fontHrefs || []).sort((a, b) => b.maxWeight - a.maxWeight || (a.name < b.name ? -1 : 1));
  let fontHeading: string | undefined = fams[0]?.name;
  let fontBody: string | undefined = fams.length > 1 ? fams[fams.length - 1].name : fams[0]?.name;
  if (!fontHeading) flags.fonts_missing = true;

  const primary = rootVars.primary || topOf(headingColors);
  const accent = rootVars.accent || topOf(buttonFills);
  // near-white isn't a usable secondary for native elements — skip such candidates
  const nonWhite = (m: Map<string, number>) => { const c = new Map(m); for (const k of c.keys()) if (luminance(k) > 0.92) c.delete(k); return c; };
  const secondary = rootVars.secondary
    || Array.from(headingColors.keys()).find((c) => c !== primary)
    || topOf(nonWhite(bandBgs));
  const textBody = topOf(bodyColors);
  const background = topOf(bandBgs);

  // Dark-design guard (Copilot 4.2): a dark dominant background is fine for bands (they carry
  // their own CSS) but native sections need a LIGHT page background — flag it, don't force it.
  if (background && luminance(background) < 0.35) flags.theme_dark_mode_suspect = true;

  return { primary, secondary, accent, textBody, background, fontHeading, fontBody, flags };
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
