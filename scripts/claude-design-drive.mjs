// Drive Claude Design via the debug Chrome (CDP). Same channel as copilot-relay.
//   node scripts/claude-design-drive.mjs inspect            → list composer inputs + buttons
//   node scripts/claude-design-drive.mjs say "your prompt"  → type into the composer + submit
import { chromium } from "playwright-core";

const MODE = process.argv[2] || "inspect";
const TEXT = process.argv[3] || "";
const CDP = process.env.CHROME_CDP || "http://127.0.0.1:9222";

const b = await chromium.connectOverCDP(CDP);
const pages = b.contexts().flatMap((c) => c.pages());
const editor = pages.find((p) => p.url().includes("claude.ai/design"));
if (!editor) { console.error("No claude.ai/design tab open. Tabs:\n" + pages.map((p) => "  " + p.url()).join("\n")); process.exit(2); }
try { await editor.bringToFront(); } catch {}

if (MODE === "inspect") {
  const info = await editor.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const inputs = [...document.querySelectorAll('textarea,[contenteditable="true"],input')]
      .filter(vis).map((e) => ({ tag: e.tagName, type: e.getAttribute("type") || "", ph: e.getAttribute("placeholder") || e.getAttribute("aria-label") || "", id: e.id || "", cls: String(e.className || "").slice(0, 50) }));
    const buttons = [...document.querySelectorAll('button,[role="button"],a')]
      .filter(vis).map((e) => (e.textContent || "").trim() || e.getAttribute("aria-label") || e.getAttribute("title") || "").filter(Boolean);
    return { url: location.href, title: document.title, inputs, buttons: [...new Set(buttons)].slice(0, 80) };
  });
  console.log(JSON.stringify(info, null, 1));
  process.exit(0);
}

if (MODE === "say") {
  if (!TEXT) { console.error("Provide text: node scripts/claude-design-drive.mjs say \"...\""); process.exit(1); }
  // find the composer: prefer a contenteditable or textarea with a chat-ish placeholder
  const handle = await editor.evaluateHandle(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const cands = [...document.querySelectorAll('textarea,[contenteditable="true"]')].filter(vis);
    const score = (e) => {
      const t = ((e.getAttribute("placeholder") || "") + " " + (e.getAttribute("aria-label") || "")).toLowerCase();
      return /ask|message|describe|prompt|chat|edit|tell|design/.test(t) ? 2 : 1;
    };
    return cands.sort((a, b2) => score(b2) - score(a))[0] || null;
  });
  const el = handle.asElement();
  if (!el) { console.error("No composer element found."); process.exit(3); }
  await el.click();
  await el.type(TEXT, { delay: 8 });
  await editor.keyboard.press("Enter");
  console.log("sent:", TEXT);
  process.exit(0);
}

console.error("Unknown mode:", MODE);
process.exit(1);
