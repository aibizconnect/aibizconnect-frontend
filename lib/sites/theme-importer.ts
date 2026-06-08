/**
 * Server-only THEME extractor: pulls fonts + colors out of a fetched site so an import reproduces
 * the original look. Conservative + high-confidence only — we'd rather return nothing than a wrong
 * palette. Fonts come from Google-Fonts links/@imports and CSS font-family; colors come from CSS
 * custom properties (--primary/--accent/…), the theme-color meta, and a dominant-saturated fallback.
 */

const GENERIC_FONTS = /^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-serif|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica|arial|cursive|fantasy)$/i;

export interface ExtractedTheme {
  fonts: { heading?: string; body?: string };
  colors: { primary?: string; secondary?: string; accent?: string; background?: string; text?: string; link?: string };
}

function normHex(c: string): string | null {
  const v = (c || "").trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return "#" + m[1].split("").map((x) => x + x).join("");
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return "#" + m[1];
  m = /^#([0-9a-f]{8})$/.exec(v);
  if (m) return "#" + m[1].slice(0, 6);
  m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(v);
  if (m) { const h = (n: string) => Math.max(0, Math.min(255, +n)).toString(16).padStart(2, "0"); return "#" + h(m[1]) + h(m[2]) + h(m[3]); }
  return null;
}
function isNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return sat < 0.18; // greys / near-black / near-white
}
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function fontFamilies(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (name: string) => {
    const n = name.replace(/["'+]/g, " ").replace(/\s+/g, " ").trim();
    if (!n || GENERIC_FONTS.test(n) || n.length > 40) return;
    const key = n.toLowerCase(); if (seen.has(key)) return; seen.add(key); out.push(n);
  };
  // Google Fonts links / @imports: family=Open+Sans:wght@400;700&family=Merriweather
  const gf = html.match(/fonts\.googleapis\.com\/css2?\?[^"')\s]+/gi) || [];
  for (const href of gf) {
    const fams = [...href.matchAll(/family=([^&:]+)/gi)].map((m) => decodeURIComponent(m[1]));
    for (const f of fams) push(f);
  }
  // CSS font-family declarations → first (non-generic) token of each
  const ff = html.match(/font-family\s*:\s*([^;}"']+)/gi) || [];
  for (const decl of ff.slice(0, 80)) {
    const first = decl.replace(/font-family\s*:/i, "").split(",")[0];
    push(first);
  }
  return out;
}

function cssVarColors(html: string): ExtractedTheme["colors"] {
  const colors: ExtractedTheme["colors"] = {};
  const re = /--([a-z0-9-]*(?:primary|secondary|accent|brand|background|bg|text|link|main)[a-z0-9-]*)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase(); const hex = normHex(m[2]); if (!hex) continue;
    if (!colors.primary && /(primary|brand|main)/.test(name) && !isNeutral(hex)) colors.primary = hex;
    else if (!colors.secondary && /secondary/.test(name)) colors.secondary = hex;
    else if (!colors.accent && /accent/.test(name) && !isNeutral(hex)) colors.accent = hex;
    else if (!colors.link && /link/.test(name)) colors.link = hex;
    else if (!colors.background && /(background|bg)/.test(name)) colors.background = hex;
    else if (!colors.text && /text/.test(name)) colors.text = hex;
  }
  return colors;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.max(0, Math.min(255, Math.round(255 * x))).toString(16).padStart(2, "0");
  return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}
/** Tailwind/shadcn store brand colors as bare HSL triplets, e.g. `--primary: 222 47% 11%`. */
function hslVarColors(html: string): ExtractedTheme["colors"] {
  const colors: ExtractedTheme["colors"] = {};
  const re = /--([a-z0-9-]*(?:primary|secondary|accent|background|foreground|brand)[a-z0-9-]*)\s*:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase();
    const hex = hslToHex(parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4]));
    if (/foreground/.test(name)) { if (!colors.text) colors.text = hex; }
    else if (/(primary|brand)/.test(name) && !isNeutral(hex)) { if (!colors.primary) colors.primary = hex; }
    else if (/secondary/.test(name)) { if (!colors.secondary) colors.secondary = hex; }
    else if (/accent/.test(name) && !isNeutral(hex)) { if (!colors.accent) colors.accent = hex; }
    else if (/background/.test(name)) { if (!colors.background) colors.background = hex; }
  }
  return colors;
}

export function extractTheme(html: string): ExtractedTheme {
  const theme: ExtractedTheme = { fonts: {}, colors: {} };
  try {
    const fams = fontFamilies(html);
    if (fams[0]) theme.fonts.heading = fams[0];
    if (fams[1]) theme.fonts.body = fams[1]; else if (fams[0]) theme.fonts.body = fams[0];

    theme.colors = cssVarColors(html);
    // Fill any gaps from Tailwind/shadcn HSL-triplet vars (e.g. `--primary: 222 47% 11%`).
    const hslColors = hslVarColors(html);
    for (const [k, v] of Object.entries(hslColors)) if (v && !(theme.colors as any)[k]) (theme.colors as any)[k] = v;

    // theme-color meta → primary fallback
    if (!theme.colors.primary) {
      const tc = /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i.exec(html);
      const hex = tc ? normHex(tc[1]) : null;
      if (hex && !isNeutral(hex)) theme.colors.primary = hex;
    }
    // Dominant saturated color → primary fallback (most frequent non-neutral hex)
    if (!theme.colors.primary) {
      const counts = new Map<string, number>();
      for (const m of html.matchAll(/#[0-9a-fA-F]{6}\b/g)) { const h = m[0].toLowerCase(); if (!isNeutral(h)) counts.set(h, (counts.get(h) || 0) + 1); }
      let best = "", bestN = 0;
      for (const [h, n] of counts) if (n > bestN) { best = h; bestN = n; }
      if (best && bestN >= 3) theme.colors.primary = best;
    }
    if (theme.colors.primary && !theme.colors.link) theme.colors.link = theme.colors.primary;
  } catch { /* best-effort */ }
  return theme;
}
