import { buildStitchPrompt } from "../lib/sites/stitch-prompt";
import { writeFileSync } from "fs";
const p = buildStitchPrompt({
  businessName: "AI Biz Connect",
  industry: "all-in-one AI business operating system (CRM, websites, funnels, automations, AI agents) for service professionals — real estate, mortgage, legal, insurance, coaching, agencies",
  pageType: "home",
  tone: "confident, modern, premium SaaS",
  audience: "owners of professional-services businesses who are tired of juggling 6 disconnected tools",
  brandColor: "#0950c3",
  accentColor: "#07b6d5",
  headingFont: "Montserrat Alternates",
  bodyFont: "Montserrat",
});
// "similar but better" framing prepended — same business, elevated design.
const full = `Redesign the homepage for an established product (AI Biz Connect / "ABC SalesMaster") — keep the same message and sections as a modern SaaS homepage, but make it noticeably MORE polished, spacious, and premium than a typical template.\n\n${p}`;
writeFileSync(".stitch-out/abc-v2-prompt.txt", full);
console.log(full);
console.log("\n=== chars:", full.length);
