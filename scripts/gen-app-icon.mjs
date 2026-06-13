// One-off: generate AIBizConnect app-icon options with Gemini's native image model
// (gemini-2.5-flash-image, free with GOOGLE_AI_API_KEY), resized to exactly 1024x1024 PNG,
// written to public/logos/app-icon-N.png so they're downloadable at /logos/app-icon-N.png.
import { writeFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (!apiKey) { console.error("No GOOGLE_AI_API_KEY / GEMINI_API_KEY in env."); process.exit(1); }
const model = "gemini-2.5-flash-image";

const BASE = `A modern, professional mobile APP ICON for "AIBizConnect", an all-in-one business marketing and CRM platform.
Full-bleed SQUARE icon (edge to edge, no rounded corners, no border, no padding around the edge).
Background: a smooth diagonal gradient from deep navy blue (#1e3a8a / #0a1628) to bright cyan (#22d3ee).
Foreground: ONE single, bold, clean, minimal geometric symbol in solid white, perfectly centered, evoking CONNECTION + AI — interlinked network nodes joined to a central spark/core, or an abstract linked "hub" mark. Crisp flat vector style, smooth lines, strong silhouette that reads clearly at small sizes.
NO text, NO letters, NO words, NO numbers, NO photorealism, NO clutter, NO multiple symbols. Just one confident mark on the gradient. Square 1:1, high quality.`;

mkdirSync("public/logos", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let made = 0;

for (let i = 1; i <= 3; i++) {
  const prompt = `${BASE}\n(Design option ${i} — give this one a distinct composition.)`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    });
    if (!res.ok) { console.error(`option ${i}: HTTP ${res.status}`, (await res.text()).slice(0, 200)); continue; }
    const json = await res.json();
    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.map((p) => p.inlineData || p.inline_data).find((x) => x?.data);
    if (!inline) { console.error(`option ${i}: no image in response`); continue; }
    const raw = Buffer.from(inline.data, "base64");
    const png = await sharp(raw).resize(1024, 1024, { fit: "cover" }).png().toBuffer();
    const path = `public/logos/app-icon-${i}.png`;
    writeFileSync(path, png);
    console.log(`✓ wrote ${path} (${Math.round(png.length / 1024)} KB)`);
    made++;
  } catch (e) { console.error(`option ${i} failed:`, e?.message ?? e); }
  if (i < 3) await sleep(1500);
}
console.log(`Done. ${made}/3 icons generated.`);
