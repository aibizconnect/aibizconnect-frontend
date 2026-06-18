// Pull a Claude Design page out of the debug Chrome (CDP), same channel as copilot-relay.
// Usage: node scripts/claude-design-pull.mjs <Slug>   (default: Home)
// Requires Chrome running with --remote-debugging-port=9222 and the design open in a tab.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const slug = (process.argv[2] || "Home").replace(/\.dc\.html$/i, "");
const file = `${slug}.dc.html`;
const CDP = process.env.CHROME_CDP || "http://127.0.0.1:9222";

const b = await chromium.connectOverCDP(CDP);
const pages = b.contexts().flatMap((c) => c.pages());
const editor = pages.find((p) => p.url().includes("claude.ai/design"));
if (!editor) { console.error("No claude.ai/design tab. Tabs:\n" + pages.map((p) => "  " + p.url()).join("\n")); process.exit(2); }
const pid = (editor.url().match(/design\/p\/([0-9a-f-]+)/i) || [])[1];
if (!pid) { console.error("Could not read project id from", editor.url()); process.exit(2); }

// Fetch the served design document using the browser context's cookies (authenticated).
const served = `https://${pid}.claudeusercontent.com/v1/design/projects/${pid}/serve/${file}`;

// --rendered: open the served doc in a temp tab, let the dc runtime expand templates, capture the
// RENDERED DOM (no {{ }}/sc-if left) — the pixel-faithful HTML for high-fidelity rendering.
if (process.argv.includes("--rendered")) {
  const ctx = b.contexts()[0];
  const page = await ctx.newPage();
  try {
    await page.goto(served, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1800);
    const rhtml = await page.content();
    const { mkdirSync: mk, writeFileSync: wf } = await import("fs");
    const d = `design-handoffs/${slug.toLowerCase()}`; mk(d, { recursive: true });
    const o = `${d}/${slug}.rendered.html`; wf(o, rhtml);
    console.log(`RENDERED saved ${rhtml.length} bytes -> ${o}`);
  } finally { await page.close(); }
  process.exit(0);
}

let html;
try {
  const resp = await editor.context().request.get(served, { timeout: 20000 });
  if (resp.ok()) html = await resp.text();
  else console.error(`served GET ${resp.status()} for ${served}`);
} catch (e) { console.error("served fetch failed:", e.message); }
// Fallback: a frame/tab actually showing the served doc.
if (!html) {
  const frames = pages.flatMap((p) => p.frames());
  const t = frames.find((f) => f.url().includes(`serve/${file}`));
  if (t) html = await t.content();
}
if (!html) { console.error("Could not retrieve the served design for", file); process.exit(3); }
const dir = `design-handoffs/${slug.toLowerCase()}`;
mkdirSync(dir, { recursive: true });
const out = `${dir}/${file}`;
writeFileSync(out, html);
console.log(`saved ${html.length} bytes -> ${out}\nfrom ${served}`);
process.exit(0);
