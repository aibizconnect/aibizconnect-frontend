import { buildStitchPrompt } from "../lib/sites/stitch-prompt";
const p = buildStitchPrompt({ businessName: "Ali Realty Group", industry: "real estate", pageType: "home", brandColor: "#0950c3", accentColor: "#07b6d5", headingFont: "Montserrat Alternates", bodyFont: "Montserrat", tone: "confident and premium", audience: "Ottawa home buyers and sellers" });
console.log(p);
console.log("\n--- chars:", p.length, "| sections covered:", (p.match(/^\d+\./gm) || []).length);
