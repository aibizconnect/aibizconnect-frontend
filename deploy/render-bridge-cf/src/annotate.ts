/**
 * In-page annotation logic — SAME computed-style capture as scripts/render-server.mjs.
 *
 * IMPORTANT: these are exported as STRING expressions (IIFEs), not functions. Passing a bundled
 * function to @cloudflare/puppeteer `page.evaluate` triggers esbuild's `__name` helper, which is not
 * defined in the browser context ("__name is not defined"). A string is evaluated verbatim in-page,
 * sidestepping that entirely. Keep in sync with render-server.mjs annotateAndSerialize().
 */

/** IIFE: annotate every <body> element with whitelisted computed styles as `data-cs`. Returns void. */
export const ANNOTATE_JS = `(() => {
  const KEEP = ["paddingTop","paddingRight","paddingBottom","paddingLeft","marginTop","marginRight","marginBottom","marginLeft","color","backgroundColor","backgroundImage","fontSize","fontWeight","lineHeight","letterSpacing","textAlign","textTransform","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius","display","flexDirection","gap","justifyContent","alignItems","maxWidth","boxShadow","gridTemplateColumns","flexWrap"];
  const def = (k, v) => {
    if (!v) return true;
    if (/(padding|margin|gap)/i.test(k) && v === "0px") return true;
    if (/Radius$/.test(k) && v === "0px") return true;
    if (k === "letterSpacing" && v === "normal") return true;
    if (k === "lineHeight" && v === "normal") return true;
    if (k === "backgroundColor" && (v === "rgba(0, 0, 0, 0)" || v === "transparent")) return true;
    if (k === "backgroundImage" && v === "none") return true;
    if (k === "boxShadow" && v === "none") return true;
    if (k === "textAlign" && (v === "start" || v === "left")) return true;
    if (k === "textTransform" && v === "none") return true;
    if (k === "fontWeight" && (v === "400" || v === "normal")) return true;
    if (k === "maxWidth" && v === "none") return true;
    if (k === "display" && (v === "block" || v === "inline")) return true;
    if (k === "flexDirection" && v === "row") return true;
    if (k === "justifyContent" && (v === "normal" || v === "flex-start")) return true;
    if (k === "alignItems" && (v === "normal" || v === "flex-start")) return true;
    return false;
  };
  let i = 0;
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    // Stable node id for the LOSSLESS import path (D-179): deterministic document order, so the
    // same design re-imported yields the same ids and node patches survive re-imports.
    el.setAttribute("data-uid", "u" + i);
    if (i++ > 5000) break;
    const cs = getComputedStyle(el);
    const parts = [];
    for (const k of KEEP) { const v = cs[k]; if (!def(k, v)) parts.push(k + ":" + v); }
    if (el.tagName === "IMG") { const w = Math.round(el.getBoundingClientRect().width); if (w > 0) parts.push("width:" + w + "px"); }
    if (parts.length) el.setAttribute("data-cs", parts.join("|"));
  }
})()`;

/** IIFE expression: FULL compiled-stylesheet snapshot (D-180). Returns one CSS string with every
 * readable rule — so an imported page never depends on the Tailwind CDN (or any origin CSS) again.
 * Same-origin/injected sheets only; cross-origin sheets without CORS throw and are skipped. */
export const SNAPSHOT_JS = `(() => {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (const r of Array.from(rules)) {
      out += r.cssText + "\\n";
      if (out.length > 900000) return out;
    }
  }
  return out;
})()`;

/** IIFE expression: harvest @font-face / :root / keyframes into one string. Returns the CSS string. */
export const HARVEST_JS = `(() => {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { continue; }
    if (!rules) continue;
    for (const r of Array.from(rules)) {
      const t = r.constructor.name;
      if (t === "CSSFontFaceRule" || t === "CSSKeyframesRule") out += r.cssText + "\\n";
      else if (r.selectorText && /:root/.test(r.selectorText)) out += r.cssText + "\\n";
      if (out.length > 256000) return out;
    }
  }
  return out;
})()`;
