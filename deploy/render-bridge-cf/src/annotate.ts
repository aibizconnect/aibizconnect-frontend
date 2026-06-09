/**
 * In-page annotation logic — the SAME computed-style capture as scripts/render-server.mjs, so the
 * Cloudflare Worker bridge produces byte-compatible output (annotated DOM with data-cs + an injected
 * <style id="__imported_css">). Keep this in sync with render-server.mjs annotateAndSerialize().
 *
 * These functions are passed to puppeteer `page.evaluate(...)` and run INSIDE the browser, so they
 * must be self-contained (no imports, no outer-scope refs).
 */

/** Annotate every <body> element with a whitelist of computed styles as `data-cs`. Runs in-page. */
export function annotateComputedStyles(): void {
  const KEEP = ["paddingTop","paddingRight","paddingBottom","paddingLeft","marginTop","marginRight","marginBottom","marginLeft","color","backgroundColor","backgroundImage","fontSize","fontWeight","lineHeight","letterSpacing","textAlign","textTransform","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius","display","gap","justifyContent","alignItems","maxWidth","boxShadow","gridTemplateColumns","flexWrap"];
  const def = (k: string, v: string): boolean => {
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
    if (k === "justifyContent" && (v === "normal" || v === "flex-start")) return true;
    if (k === "alignItems" && (v === "normal" || v === "flex-start")) return true;
    return false;
  };
  let i = 0;
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (i++ > 5000) break;
    const cs = getComputedStyle(el as Element);
    const parts: string[] = [];
    for (const k of KEEP) { const v = (cs as any)[k] as string; if (!def(k, v)) parts.push(k + ":" + v); }
    if (parts.length) (el as Element).setAttribute("data-cs", parts.join("|"));
  }
}

/** Harvest @font-face / :root / keyframes rules into one string for site-wide custom CSS. In-page. */
export function harvestImportedCss(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try { rules = (sheet as CSSStyleSheet).cssRules; } catch { continue; }
    if (!rules) continue;
    for (const r of Array.from(rules)) {
      const t = r.constructor.name;
      if (t === "CSSFontFaceRule" || t === "CSSKeyframesRule") out += r.cssText + "\n";
      else if ((r as CSSStyleRule).selectorText && /:root/.test((r as CSSStyleRule).selectorText)) out += r.cssText + "\n";
      if (out.length > 256000) return out;
    }
  }
  return out;
}
