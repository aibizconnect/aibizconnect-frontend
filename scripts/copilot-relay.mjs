// Copilot relay — a REAL bidirectional channel to Microsoft Copilot (which has no API).
//
// It attaches to YOUR already-running Chrome over the DevTools debug port (so it reuses your
// logged-in Copilot session and downloads no browser), finds the Copilot chat tab, types the
// message via instant insertText (not char-by-char — that's what froze the generic tool), waits
// for Copilot's reply to finish streaming, and prints + saves it.
//
// ONE-TIME SETUP — launch Chrome with the debug port (close all Chrome first so it reuses your
// profile + Copilot login):
//   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
// Then open https://copilot.microsoft.com/chats/DJH9ioLxhJevLNT2RMTZz in a tab.
//
// USAGE:
//   node scripts/copilot-relay.mjs --ping                       # diagnose: list Copilot tabs
//   node scripts/copilot-relay.mjs --file .copilot/inbox.md     # send file contents, read reply
//   node scripts/copilot-relay.mjs "short message"              # send inline
//
// State in .copilot/: last-reply.md, history.json.

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const CDP = process.env.CHROME_CDP || "http://127.0.0.1:9222";
const COPILOT_HOST = "copilot.microsoft.com";
const CHAT_URL = process.env.COPILOT_CHAT_URL || "https://copilot.microsoft.com/chats/DJH9ioLxhJevLNT2RMTZz";
const DIR = ".copilot";

function readMessage() {
  const a = process.argv.slice(2);
  if (a[0] === "--file") return readFileSync(a[1], "utf8").trim();
  if (a.length && !a[0].startsWith("--")) return a.join(" ").trim();
  try { return readFileSync(0, "utf8").trim(); } catch { return ""; }
}

// Parse the last "Copilot said" segment out of the transcript text.
function lastCopilotReply(text) {
  const parts = text.split(/\bCopilot said\b/i);
  if (parts.length < 2) return "";
  let tail = parts[parts.length - 1];
  // cut off the composer / trailing UI that follows the last reply
  tail = tail.split(/\bYou said\b/i)[0];
  tail = tail.split(/Message Copilot/i)[0];
  return tail.trim();
}

async function getCopilotPage(browser) {
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      if ((p.url() || "").includes(COPILOT_HOST)) return p;
    }
  }
  // none open — create one in the first context
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error("No browser context found over CDP.");
  const p = await ctx.newPage();
  await p.goto(CHAT_URL, { waitUntil: "domcontentloaded" });
  return p;
}

async function main() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  const ping = process.argv.includes("--ping");
  const inspect = process.argv.includes("--inspect");
  const message = (ping || inspect) ? "" : readMessage();
  if (!ping && !inspect && !message) { console.error("No message (use --file <path>, an arg, or stdin)."); process.exit(1); }

  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP);
  } catch (e) {
    console.error(`Could not attach to Chrome at ${CDP}.\nLaunch Chrome with:  chrome.exe --remote-debugging-port=9222\n(${e.message})`);
    process.exit(2);
  }

  const page = await getCopilotPage(browser);
  if (ping) {
    console.log(`Attached. Copilot tab: ${page.url()}`);
    await browser.close();
    return;
  }
  if (process.argv.includes("--inspect")) {
    const cands = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input[type="text"]'));
      return els.map((e, i) => {
        const r = e.getBoundingClientRect();
        return {
          i, tag: e.tagName.toLowerCase(), role: e.getAttribute("role"),
          placeholder: e.getAttribute("placeholder") || e.getAttribute("aria-label") || e.getAttribute("data-placeholder"),
          ariaHidden: e.getAttribute("aria-hidden"), editable: e.getAttribute("contenteditable"),
          visible: !!(r.width && r.height) && getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).display !== "none",
          w: Math.round(r.width), h: Math.round(r.height),
        };
      });
    });
    console.log(JSON.stringify(cands, null, 2));
    // also list send buttons
    const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => ({ label: (b.getAttribute("aria-label") || b.title || b.textContent || "").trim().slice(0, 40), submit: b.type })).filter((b) => /send|submit/i.test(b.label)));
    console.log("SEND BUTTONS:", JSON.stringify(btns));
    await browser.close();
    return;
  }

  // Capture transcript before sending so we can detect the new reply.
  const before = lastCopilotReply(await page.evaluate(() => document.body.innerText));

  // Focus the composer (try known shapes) and insert text instantly.
  const composer = page.getByPlaceholder("Message Copilot").first();
  await composer.click({ timeout: 15000 });
  await page.keyboard.press("Control+A").catch(() => {});
  await page.keyboard.insertText(message);
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");

  // Wait for the reply to appear and stop changing (stream finished).
  const deadline = Date.now() + 120000;
  let last = "", stable = 0, reply = "";
  await page.waitForTimeout(1500);
  while (Date.now() < deadline) {
    const cur = lastCopilotReply(await page.evaluate(() => document.body.innerText));
    if (cur && cur !== before) {
      if (cur === last) { stable++; if (stable >= 3) { reply = cur; break; } }
      else { stable = 0; last = cur; }
    }
    await page.waitForTimeout(1500);
  }
  if (!reply) reply = last || "(no new reply detected within timeout)";

  const histPath = `${DIR}/history.json`;
  const hist = existsSync(histPath) ? JSON.parse(readFileSync(histPath, "utf8")) : [];
  hist.push({ role: "builder", text: message }, { role: "copilot", text: reply });
  writeFileSync(histPath, JSON.stringify(hist, null, 2));
  writeFileSync(`${DIR}/last-reply.md`, reply);

  console.log("\n=== COPILOT REPLY ===\n");
  console.log(reply);
  console.log("\n=== end ===");
  await browser.close();
}

main().catch((e) => { console.error("Copilot relay failed:", e.message); process.exit(1); });
