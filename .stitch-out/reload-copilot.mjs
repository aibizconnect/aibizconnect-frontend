import { chromium } from "playwright-core";
const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
for (const ctx of b.contexts()) for (const p of ctx.pages()) {
  if (!(p.url() || "").includes("copilot.microsoft.com")) continue;
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000);
  const overlays = await p.evaluate(() => Array.from(document.querySelectorAll("div.fixed.inset-0")).map((el) => ({
    cls: el.className, text: (el.textContent || "").trim().slice(0, 120), html: el.innerHTML.slice(0, 200),
  })));
  console.log(JSON.stringify(overlays, null, 1));
}
process.exit(0);
