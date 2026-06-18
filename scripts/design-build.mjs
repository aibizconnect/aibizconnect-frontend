// Autonomous design step: command Claude Design (browser relay) to build a page from BRIEF.md,
// wait for generation to settle, switch the editor to it, and save the SOURCE to the local folder.
// Pair with claude-design-capture.mjs <Slug> afterwards for the rendered DOM.
//   node scripts/design-build.mjs <Slug> ["extra instruction"]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const slug = (process.argv[2] || "").replace(/\.dc\.html$/i, "");
const extra = process.argv[3] || "";
if (!slug) { console.error("usage: design-build.mjs <Slug> [extra]"); process.exit(1); }
const CDP = process.env.CHROME_CDP || "http://127.0.0.1:9222";
const MAXMS = 9 * 60 * 1000;
const file = `${slug}.dc.html`;

const b = await chromium.connectOverCDP(CDP);
const pages = b.contexts().flatMap((c) => c.pages());
const editor = pages.find((p) => p.url().includes("claude.ai/design"));
if (!editor) { console.error("no claude.ai/design tab"); process.exit(2); }
const pid = (editor.url().match(/design\/p\/([0-9a-f-]+)/i) || [])[1];
const served = `https://${pid}.claudeusercontent.com/v1/design/projects/${pid}/serve/${file}`;
const ctx = editor.context();

// 1) command the build (single line so Enter submits cleanly; Design already has BRIEF.md/DESIGN.md in context)
await editor.bringToFront();
const prompt = `Build the ${slug} page now per design-handoffs/BRIEF.md and the DESIGN.md system. Use ONLY the approved section vocabulary and the exact AIBizConnect tokens (royal blue #3D49C4, navy #090966, MontserratAlt1/Montserrat, the brand gradient, soft cool shadows, 10-20px radii). Reuse the SAME sticky header and footer as Home. Every primary CTA links to /start. Name the file ${file}. Do not wait for my confirmation. ${extra}`.replace(/\s+/g, " ").trim();
const handle = await editor.evaluateHandle(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const cands = [...document.querySelectorAll('[contenteditable="true"],textarea')].filter(vis);
  const score = (e) => { const t = ((e.getAttribute("placeholder") || "") + " " + (e.getAttribute("aria-label") || "")).toLowerCase(); return /ask|message|describe|prompt|chat|edit|tell|design|create/.test(t) ? 2 : 1; };
  return cands.sort((a, b2) => score(b2) - score(a))[0] || null;
});
const el = handle.asElement();
if (!el) { console.error("no composer"); process.exit(3); }
await el.click(); await el.type(prompt, { delay: 4 }); await editor.keyboard.press("Enter");
console.log("commanded:", slug);

// 2) poll the served source until it exists, has a footer, and is stable across two reads
let last = -1, stable = 0; const t0 = Date.now(); let done = false;
while (Date.now() - t0 < MAXMS) {
  await editor.waitForTimeout(12000);
  let txt = "";
  try { const r = await ctx.request.get(served, { timeout: 15000 }); if (r.ok()) txt = await r.text(); } catch { /* not ready */ }
  const len = txt.length, foot = /rights reserved/i.test(txt);
  console.log(`  [${Math.round((Date.now() - t0) / 1000)}s] len=${len} footer=${foot} stable=${stable}`);
  if (len > 6000 && foot && len === last) { if (++stable >= 2) { done = true; break; } } else { stable = 0; }
  last = len;
}
console.log(done ? "generation settled" : "timeout — saving current state");

// 3) switch the editor to the new file so the preview iframe shows it (for the rendered capture step)
try { await editor.goto(`https://claude.ai/design/p/${pid}?file=${file}`, { waitUntil: "domcontentloaded", timeout: 30000 }); await editor.waitForTimeout(4500); } catch { /* ignore */ }

// 4) save the source
let src = "";
try { const r = await ctx.request.get(served, { timeout: 20000 }); if (r.ok()) src = await r.text(); } catch { /* ignore */ }
const dir = `design-handoffs/${slug.toLowerCase()}`; mkdirSync(dir, { recursive: true });
if (src) { writeFileSync(`${dir}/${file}`, src); console.log(`saved source ${src.length}b -> ${dir}/${file}`); }
else console.log("WARN: no source retrieved");
await b.close();
