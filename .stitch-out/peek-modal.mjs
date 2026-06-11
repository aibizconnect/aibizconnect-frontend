import { chromium } from "playwright-core";
const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
for (const ctx of b.contexts()) for (const p of ctx.pages()) {
  if (!(p.url() || "").includes("copilot.microsoft.com")) continue;
  const overlay = p.locator("div.fixed.inset-0").first();
  if (await overlay.count()) {
    const txt = (await overlay.innerText().catch(() => "")).slice(0, 400);
    console.log("OVERLAY TEXT:", JSON.stringify(txt));
    const btns = await overlay.locator("button").allInnerTexts().catch(() => []);
    console.log("BUTTONS:", JSON.stringify(btns));
  } else console.log("no overlay found");
}
process.exit(0);
