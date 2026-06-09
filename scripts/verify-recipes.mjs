// Verify Phase-3 layout recipes compose to renderer-valid section content (GEN-V7).
// Run: node scripts/verify-recipes.mjs   (after `npm run build` produced .next types,
// or rely on tsc; this uses a lightweight inline re-validation against sectionSchema via tsx-less
// dynamic import of the transpiled module is not available, so we shell to a tiny tsx check).
//
// Simpler: this script just documents intent. The authoritative check is verifyRecipes()
// exercised by tsc + the assertion below using the compiled output when present.
import { execSync } from "node:child_process";

const snippet = `
import { verifyRecipes } from "./lib/sections/layout-recipes";
const res = verifyRecipes();
const bad = res.filter(r => !r.ok);
console.log(JSON.stringify(res, null, 2));
if (bad.length) { console.error("INVALID RECIPES:", bad); process.exit(1); }
console.log("All recipes compose to renderer-valid content.");
`;

import { writeFileSync, rmSync } from "node:fs";
writeFileSync(".verify-recipes.mts", snippet);
try {
  execSync("npx tsx .verify-recipes.mts", { stdio: "inherit" });
} finally {
  rmSync(".verify-recipes.mts", { force: true });
}
