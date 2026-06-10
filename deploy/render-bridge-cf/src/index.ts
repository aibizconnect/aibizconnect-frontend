/**
 * AIBizConnect render bridge — Cloudflare Worker (Browser Rendering). Architect D-162/D-163.
 *
 * Same contract as scripts/render-server.mjs so the Vercel app's lib/sites/site-clone.ts works
 * UNCHANGED: returns text/html — a fully-rendered DOM annotated with per-element computed styles
 * (data-cs) and an injected <style id="__imported_css"> (@font-face/:root/keyframes).
 *
 *   GET  /healthz          → "ok" (open)
 *   GET  /render?url=<page> → render a live URL
 *   POST /render-html       → render raw HTML body (Stitch/Figma export)
 *
 * Auth: Authorization: Bearer <RENDER_TOKEN>  (or ?token=). /healthz is open.
 * Runs under the aibizconnect.app zone (route render.aibizconnect.app) — see wrangler.toml.
 */
import puppeteer from "@cloudflare/puppeteer";
import { ANNOTATE_JS, HARVEST_JS, SNAPSHOT_JS } from "./annotate";

export interface Env {
  MYBROWSER: Fetcher;
  RENDER_TOKEN?: string;
}

const HTML = { "content-type": "text/html; charset=utf-8" } as const;
const MAX_BYTES = 3_000_000; // raised for the lossless path: full CSS snapshot rides along

function authed(req: Request, url: URL, env: Env): boolean {
  if (!env.RENDER_TOKEN) return true;
  if (req.headers.get("authorization") === `Bearer ${env.RENDER_TOKEN}`) return true;
  return url.searchParams.get("token") === env.RENDER_TOKEN;
}

/** Annotate the current page and serialize to HTML with the imported-CSS block injected. */
async function annotateAndSerialize(page: any): Promise<string> {
  await page.evaluate(ANNOTATE_JS);
  let importedCss = "";
  try { importedCss = (await page.evaluate(HARVEST_JS)) as string; } catch { /* optional */ }
  // Full compiled-CSS snapshot (D-180) for the LOSSLESS import path — the imported page renders
  // from this forever, with no dependency on the Tailwind CDN or the origin's stylesheets.
  let snapshotCss = "";
  try { snapshotCss = (await page.evaluate(SNAPSHOT_JS)) as string; } catch { /* optional */ }
  let html: string = await page.content();
  let block = "";
  if (importedCss) block += `\n<style id="__imported_css">\n${importedCss}\n</style>\n`;
  if (snapshotCss) block += `\n<style id="__snapshot_css">\n${snapshotCss}\n</style>\n`;
  if (block) html = html.includes("</head>") ? html.replace("</head>", block + "</head>") : html + block;
  return html.slice(0, MAX_BYTES);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") return new Response("ok", { headers: { "content-type": "text/plain" } });
    if (!authed(request, url, env)) return new Response("unauthorized", { status: 401 });

    const isRenderUrl = url.pathname === "/render";
    const isRenderHtml = url.pathname === "/render-html" && request.method === "POST";
    if (!isRenderUrl && !isRenderHtml) {
      return new Response("GET /render?url=<page>  |  POST /render-html (raw HTML body)", { status: 404 });
    }

    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
      browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 1024 }); // capture DESKTOP layout (above xl breakpoints)

      if (isRenderUrl) {
        const target = url.searchParams.get("url");
        if (!target) return new Response("missing ?url=", { status: 400 });
        // networkidle0 lets late CSS/fonts settle; cap so a slow page can't hang the Worker.
        await page.goto(target, { waitUntil: "networkidle0", timeout: 30000 });
      } else {
        const raw = await request.text();
        if (!raw || raw.length < 20) return new Response("missing HTML body", { status: 400 });
        await page.setContent(raw, { waitUntil: "networkidle0", timeout: 30000 });
        // Give the Tailwind CDN JIT a beat to inject resolved styles before we read them.
        await new Promise((r) => setTimeout(r, 800));
      }

      const html = await annotateAndSerialize(page);
      return new Response(html, { headers: HTML });
    } catch (e: any) {
      return new Response(`render error: ${e?.message ?? e}`, { status: 500 });
    } finally {
      if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    }
  },
};
