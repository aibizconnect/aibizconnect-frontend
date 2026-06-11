import { chromium } from "playwright-core";
const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
for (const ctx of b.contexts()) for (const p of ctx.pages()) {
  if (!(p.url() || "").includes("copilot.microsoft.com")) continue;
  // The overlay is EMPTY (no text, no buttons) — a stale backdrop. Press Escape, then remove
  // any still-empty fixed backdrops so the composer is clickable again.
  await p.keyboard.press("Escape").catch(() => {});
  await p.waitForTimeout(400);
  const removed = await p.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll("div.fixed.inset-0")) {
      if (!(el.textContent || "").trim() && !el.querySelector("img,svg,video,iframe,button,input")) { el.remove(); n++; }
    }
    return n;
  });
  console.log("escape sent; empty backdrops removed:", removed);
}
process.exit(0);
