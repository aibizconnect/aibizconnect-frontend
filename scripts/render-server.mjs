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

// In prod the bridge runs in a container (Playwright base image) with bundled Chromium and no CDP
// Chrome — set RENDER_USE_BUNDLED=1 to skip the CDP/system-Chrome attempts and launch directly.
const USE_BUNDLED = process.env.RENDER_USE_BUNDLED === "1";
const LAUNCH_ARGS = ["--no-sandbox", "--disable-dev-shm-usage"]; // required in most containers
let browser = null;
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  if (!USE_BUNDLED) {
    try { browser = await chromium.connectOverCDP(CDP); console.log("[render] using existing Chrome via CDP", CDP); return browser; } catch { /* try launch */ }
    try { browser = await chromium.launch({ channel: "chrome", headless: true, args: LAUNCH_ARGS }); console.log("[render] launched headless system Chrome"); return browser; } catch { /* fall through to bundled */ }
  }
  // Bundled Chromium (works in the Playwright Docker image / any host without system Chrome).
  browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  console.log("[render] launched bundled Chromium");
  return browser;
}

// Shared fidelity pass: annotate every element with computed-style data-cs + harvest @font-face/
// :root/keyframes into one <style id="__imported_css">. Used for BOTH URL render and raw-HTML render
// so pasted Stitch/Figma markup gets the SAME true-to-design computed styles as a live capture.
async function annotateAndSerialize(page) {
  await page.evaluate(() => {
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
    for (const el of document.querySelectorAll("body *")) {
      if (i++ > 5000) break;
      const cs = getComputedStyle(el);
      const parts = [];
      for (const k of KEEP) { const v = cs[k]; if (!def(k, v)) parts.push(k + ":" + v); }
      // Image-only: capture rendered width so small avatars/logos stay small on import.
      if (el.tagName === "IMG") { const w = Math.round(el.getBoundingClientRect().width); if (w > 0) parts.push("width:" + w + "px"); }
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
}

async function render(target) {
  const b = await getBrowser();
  const ctx = b.contexts()[0] || await b.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 1440, height: 1024 }); // capture the DESKTOP layout (above xl breakpoints)
    await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1200); // let late hydration settle
    return await annotateAndSerialize(page);
  } finally { try { await page.close(); } catch {} }
}

// Render RAW pasted HTML (Stitch/Figma export, no URL) in a real browser so utility/inline classes
// resolve to real computed styles, then annotate with data-cs — the importer then gets a true copy.
async function renderHtml(rawHtml) {
  const b = await getBrowser();
  const ctx = b.contexts()[0] || await b.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 1440, height: 1024 }); // capture the DESKTOP layout (above xl breakpoints)
    await page.setContent(rawHtml, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(800); // let webfonts/Tailwind-CDN settle
    return await annotateAndSerialize(page);
  } finally { try { await page.close(); } catch {} }
}

const readBody = (req, cap = 4_000_000) => new Promise((resolve, reject) => {
  let data = ""; let len = 0;
  req.on("data", (c) => { len += c.length; if (len > cap) { reject(new Error("payload too large")); req.destroy(); } else data += c; });
  req.on("end", () => resolve(data));
  req.on("error", reject);
});

// Optional shared-secret: when RENDER_TOKEN is set (recommended in prod since the bridge is public),
// require it via `Authorization: Bearer <token>` or `?token=`. Health check stays open.
const TOKEN = process.env.RENDER_TOKEN || "";
const authed = (req, url) => {
  if (!TOKEN) return true;
  const h = req.headers["authorization"] || "";
  if (h === `Bearer ${TOKEN}`) return true;
  return url.searchParams.get("token") === TOKEN;
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    // GET /healthz — liveness probe (open, no token).
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }); return res.end("ok"); }
    if (!authed(req, url)) { res.writeHead(401, { "content-type": "text/plain" }); return res.end("unauthorized"); }
    // GET /render?url=<page> — render a live URL.
    if (url.pathname === "/render") {
      const target = url.searchParams.get("url");
      if (!target) { res.writeHead(400); return res.end("missing ?url="); }
      console.log("[render]", target);
      const html = await render(target);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    // POST /render-html — render RAW pasted HTML (Stitch/Figma export) to a data-cs-annotated DOM.
    if (url.pathname === "/render-html" && req.method === "POST") {
      const raw = await readBody(req);
      if (!raw || raw.length < 20) { res.writeHead(400); return res.end("missing HTML body"); }
      console.log("[render-html]", raw.length, "bytes");
      const html = await renderHtml(raw);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("GET /render?url=<page>  |  POST /render-html (raw HTML body)");
  } catch (e) {
    console.error("[render] error:", e?.message || e);
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(String(e?.message || e));
  }
}).listen(PORT, () => console.log(`render-server ready → http://localhost:${PORT}/render?url=...  ·  POST /render-html`));
