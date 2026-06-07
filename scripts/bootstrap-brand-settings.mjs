// Cycle 3 — bootstrap tenant brand settings + theme (OPTIONAL).
//
// Targets website_brand_settings (PK = tenant_id), which DOES exist. Still
// REPORT-ONLY by default; requires a real UUID + --commit to write. No DDL, no
// fabricated ids, symbolic tenant.
//
// Usage (report-only): node scripts/bootstrap-brand-settings.mjs <TENANT_UUID>
// Usage (live):        node scripts/bootstrap-brand-settings.mjs <TENANT_UUID> --commit

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
function loadEnv(f) {
  const o = {};
  try { for (const l of readFileSync(join(root, f), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
  return o;
}
const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };

const ARGS = process.argv.slice(2);
const COMMIT = ARGS.includes("--commit");
const TENANT_ID = ARGS.find((a) => !a.startsWith("--"));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!TENANT_ID || !UUID_RE.test(TENANT_ID) || TENANT_ID.includes("<")) {
  console.error("Usage: node scripts/bootstrap-brand-settings.mjs <TENANT_UUID> [--commit]");
  process.exit(1);
}

const brand = {
  tenant_id: TENANT_ID,
  primary_color: "#0F62FE",
  secondary_color: "#393939",
  accent_color: "#FF7EB6",
  font_heading: "Inter",
  font_body: "Inter",
  tone: "professional",
  theme: {
    colors: { primary: "#0F62FE", secondary: "#393939", accent: "#FF7EB6", bg: "#FFFFFF", text: "#161616" },
    radius: "0.5rem",
    spacing: "comfortable",
  },
};

async function main() {
  if (!COMMIT) {
    console.log("REPORT ONLY — would upsert brand settings:");
    console.log(JSON.stringify(brand, null, 2));
    console.log("\nPass --commit to write to website_brand_settings.");
    return;
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await sb.from("website_brand_settings").upsert(brand, { onConflict: "tenant_id" });
  if (error) throw new Error(error.message);
  console.log("BRAND SETTINGS UPSERTED for", TENANT_ID);
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
