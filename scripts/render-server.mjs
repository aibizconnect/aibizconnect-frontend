/**
 * Local render bridge for the website importer.
 *
 * Some sites (React/Vue/Lovable/Next-SPA) paint their content with JavaScript, so a plain HTTP
 * fetch only sees an empty <div id="root"></div> shell. This tiny server renders a URL in a REAL
 * browser and returns the fully-painted HTML, which the importer (lib/sites/site-clone.ts) uses
 * when it detects a SPA shell. It is a SEPARATE local process — never bundled into the Next app
 * and never used in production.
 *
 * Run:   node scripts/render-server.mjs
 * Then:  set SITE_RENDER_URL=http://localhost:8787 in .env.local and restart `npm run dev`.
 *
 * It reuses an already-open debug Chrome (CDP on 127.0.0.1:9222) if present, else launches your
 * installed Chrome headless via playwright-core (no browser download needed).
 *
 * Env: RENDER_PORT (default 8787), CHROME_CDP_URL (default http://127.0.0.1:9222).
 */
import http from "node:http";
import { chromium } from "playwright-core";

const PORT = Number(process.env.RENDER_PORT || 8787);
const CDP = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

let browser = null;
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  try { browser = await chromium.connectOverCDP(CDP); console.log("[render] using existing Chrome via CDP", CDP); }
  catch { browser = await chromium.launch({ channel: "chrome", headless: true }); console.log("[render] launched headless system Chrome"); }
  return browser;
}

async function render(target) {
  const b = await getBrowser();
  const ctx = b.contexts()[0] || await b.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  try {
    await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200); // let late hydration settle

    // FIDELITY: annotate each element with a whitelist of computed styles (data-cs) so the importer
    // can reproduce the original padding/spacing/colors/typography, and collect @font-face + CSS
    // variables + keyframes into one <style id="__imported_css"> for the site-wide custom CSS.
    await page.evaluate(() => {
      const KEEP = ["paddingTop","paddingRight","paddingBottom","paddingLeft","marginTop","marginRight","marginBottom","marginLeft","color","backgroundColor","backgroundImage","fontSize","fontWeight","lineHeight","letterSpacing","textAlign","textTransform","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius","display","gap","justifyContent","alignItems","maxWidth","boxShadow"];
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
        if (k === "justifyContent" && (v === "normal" || v === "flex-start")) return true;
        if (k === "alignItems" && (v === "normal" || v === "flex-start")) return true;
        return false;
      };
      let i = 0;
      for (const el of document.querySelectorAll("body *")) {
        if (i++ > 5000) break;
        const cs = getComputedStyle(el);
        const parts = [];
        for (const k of KEEP) { const v = cs[k]; if (!def(k, v)) parts.push(k + ":" + v); }
        if (parts.length) el.setAttribute("data-cs", parts.join("|"));
      }
    });

    let importedCss = "";
    try {
      importedCss = await page.evaluate(() => {
        let out = "";
        for (const sheet of document.styleSheets) {
          let rules; try { rules = sheet.cssRules; } catch { continue; }
          if (!rules) continue;
          for (const r of rules) {
            const t = r.constructor.name;
            if (t === "CSSFontFaceRule" || t === "CSSKeyframesRule") out += r.cssText + "\n";
            else if (r.selectorText && /:root/.test(r.selectorText)) out += r.cssText + "\n";
            if (out.length > 256000) return out;
          }
        }
        return out;
      });
    } catch { /* optional */ }

    let html = await page.content();
    if (importedCss) {
      const block = `\n<style id="__imported_css">\n${importedCss}\n</style>\n`;
      html = html.includes("</head>") ? html.replace("</head>", block + "</head>") : html + block;
    }
    return html;
  } finally { try { await page.close(); } catch {} }
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/render") { res.writeHead(404, { "content-type": "text/plain" }); return res.end("GET /render?url=<page>"); }
    const target = url.searchParams.get("url");
    if (!target) { res.writeHead(400); return res.end("missing ?url="); }
    console.log("[render]", target);
    const html = await render(target);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (e) {
    console.error("[render] error:", e?.message || e);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(e?.message || e));
  }
}).listen(PORT, () => console.log(`render-server ready → http://localhost:${PORT}/render?url=...`));
