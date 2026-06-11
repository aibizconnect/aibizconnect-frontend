/**
 * Converts the `data-cs` computed-style annotation (added by the render bridge) into our editable
 * style shapes: an `ElementStyle` object for `content._style` (padding/margin/background/radius/
 * align) plus typed hints (fontSize/color/align) merged onto text-like elements. Best-effort.
 */

function rgbToHex(v?: string): string | undefined {
  if (!v) return undefined;
  if (v.startsWith("#")) return v.length === 4 ? "#" + v.slice(1).split("").map((c) => c + c).join("") : v.slice(0, 7);
  const m = /rgba?\(([^)]+)\)/.exec(v);
  if (!m) return undefined;
  const p = m[1].split(",").map((s) => s.trim());
  if (p.length >= 4 && parseFloat(p[3]) === 0) return undefined; // fully transparent
  const h = (n: string) => Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16).padStart(2, "0");
  if (p.length >= 3) return "#" + h(p[0]) + h(p[1]) + h(p[2]);
  return undefined;
}
const px = (v?: string): number | undefined => { const m = /(-?[\d.]+)px/.exec(v || ""); return m ? Math.round(parseFloat(m[1])) : undefined; };

export interface CapturedStyle { style: Record<string, unknown>; typo: Record<string, unknown> }

export function parseDataCs(dataCs?: string | null): CapturedStyle {
  const style: Record<string, unknown> = {};
  const typo: Record<string, unknown> = {};
  if (!dataCs) return { style, typo };
  const map: Record<string, string> = {};
  for (const kv of dataCs.split("|")) { const i = kv.indexOf(":"); if (i > 0) map[kv.slice(0, i)] = kv.slice(i + 1); }

  // ALI RULE (2026-06-11): never use more than 20 for spacing/padding anywhere — captured
  // values (e.g. Stitch's 120px section gaps) are capped at import.
  const SPACING_MAX = 20;
  const setPx = (cssKey: string, styleKey: string) => { const n = px(map[cssKey]); if (n !== undefined && n > 0) style[styleKey] = Math.min(n, SPACING_MAX); };
  setPx("paddingTop", "pt"); setPx("paddingRight", "pr"); setPx("paddingBottom", "pb"); setPx("paddingLeft", "pl");
  setPx("marginTop", "mt"); setPx("marginRight", "mr"); setPx("marginBottom", "mb"); setPx("marginLeft", "ml");

  // border radius (uniform → radius, else per-corner)
  const rtl = px(map.borderTopLeftRadius), rtr = px(map.borderTopRightRadius), rbl = px(map.borderBottomLeftRadius), rbr = px(map.borderBottomRightRadius);
  if ([rtl, rtr, rbl, rbr].some((v) => v)) {
    if (rtl === rtr && rtr === rbl && rbl === rbr) style.radius = rtl;
    else { if (rtl) style.radiusTL = rtl; if (rtr) style.radiusTR = rtr; if (rbr) style.radiusBR = rbr; if (rbl) style.radiusBL = rbl; }
  }

  const bg = rgbToHex(map.backgroundColor); if (bg) style.bg = bg;
  const bgi = /url\((['"]?)([^'")]+)\1\)/.exec(map.backgroundImage || ""); if (bgi) style.bgImage = bgi[2];

  if (map.textAlign === "center" || map.textAlign === "right") { style.align = map.textAlign; typo.align = map.textAlign; }

  const fs = px(map.fontSize); if (fs) typo.fontSize = fs;
  const col = rgbToHex(map.color); if (col) typo.color = col;

  return { style, typo };
}

/** Merge captured styles into a section/element content object (non-destructive: existing keys win). */
export function applyCapturedStyle(content: Record<string, unknown>, dataCs?: string | null): Record<string, unknown> {
  const { style, typo } = parseDataCs(dataCs);
  if (Object.keys(style).length) content._style = { ...(style), ...((content._style as object) || {}) };
  for (const [k, v] of Object.entries(typo)) if (content[k] === undefined) content[k] = v;
  return content;
}

/** Apply ONLY typographic hints (color/fontSize/align) to a leaf element — no padding/margin, so
 *  text/headings don't inherit big container spacing (which read as excessive whitespace). */
export function applyCapturedTypo(content: Record<string, unknown>, dataCs?: string | null): Record<string, unknown> {
  const { typo } = parseDataCs(dataCs);
  for (const [k, v] of Object.entries(typo)) if (content[k] === undefined) content[k] = v;
  return content;
}

/** Read just the column count a CSS grid declares (grid-template-columns), if present. */
export function gridColumnCount(dataCs?: string | null): number {
  if (!dataCs) return 0;
  const m = /gridTemplateColumns:([^|]+)/.exec(dataCs);
  if (!m) return 0;
  const v = m[1].trim();
  if (v === "none") return 0;
  // count track sizes (px/fr/%/minmax) — split on spaces not inside minmax()
  const tracks = v.replace(/minmax\([^)]*\)/g, "x").split(/\s+/).filter(Boolean);
  return tracks.length;
}

/** Pull the <style id="__imported_css"> block (font-faces + CSS vars) the bridge injected. */
export function extractImportedCss(html: string): string {
  const m = /<style[^>]+id=["']__imported_css["'][^>]*>([\s\S]*?)<\/style>/i.exec(html);
  return m ? m[1].trim().slice(0, 256000) : "";
}
