// Set up a Father's Day occasion on the AIBizConnect website (aibizconnect.app).
// Writes theme.site.occasions on the per-website brand row (f33761c3), seeding that row
// from the merged tenant brand first (so colors/fonts are preserved — same as ensureBrandRow).
// Run: node --env-file=.env.local scripts/occasions-setup.mjs
import { createClient } from "@supabase/supabase-js";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const WEBSITE = "f33761c3-4e64-42d4-a023-4986ef820dab";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function deepMerge(a, b) {
  const out = { ...(a || {}) };
  for (const k of Object.keys(b || {})) {
    out[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) ? deepMerge(a?.[k], b[k]) : b[k];
  }
  return out;
}

// 1) Seed the per-website brand row from the merged tenant brand if it doesn't exist yet.
const { data: existing } = await sb.from("website_brand_settings").select("theme").eq("tenant_id", TENANT).eq("website_id", WEBSITE).maybeSingle();
const { data: allRows } = await sb.from("website_brand_settings").select("primary_color, secondary_color, accent_color, font_heading, font_body, theme").eq("tenant_id", TENANT);
let mergedTheme = {};
const seedCols = {};
for (const r of allRows || []) {
  if (r?.theme && typeof r.theme === "object") mergedTheme = deepMerge(mergedTheme, r.theme);
  for (const c of ["primary_color", "secondary_color", "accent_color", "font_heading", "font_body"]) if (r[c] != null) seedCols[c] = r[c];
}
const baseTheme = existing?.theme && typeof existing.theme === "object" ? existing.theme : mergedTheme;

// 2) Build the occasions config — a clean Father's Day banner (brand navy), visible now → Sun Jun 21.
const occasions = {
  ...(baseTheme.site?.occasions || {}),
  bannerStyle: { bg: "#1e3a8a", textColor: "#ffffff", pattern: "solid", ...(baseTheme.site?.occasions?.bannerStyle || {}) },
  custom: [
    ...((baseTheme.site?.occasions?.custom || []).filter((c) => c.id !== "fathers-day-2026")),
    {
      id: "fathers-day-2026",
      name: "Father's Day",
      startDate: "2026-06-19",
      endDate: "2026-06-21",
      enabled: true,
      message: "Happy Father's Day to the dads building their dream business 💙",
      fly: false,
    },
  ],
};

// The table keys one brand row per tenant (pkey = tenant_id). Write occasions onto that single
// row's theme; the public renderer reads website-scoped first, then falls back to this merged row.
const { data: rowsForUpdate } = await sb.from("website_brand_settings").select("website_id, theme").eq("tenant_id", TENANT);
const target = (rowsForUpdate || [])[0];
const baseForWrite = target?.theme && typeof target.theme === "object" ? target.theme : baseTheme;
const newTheme = deepMerge(baseForWrite, { site: { occasions } });
const { error } = await sb.from("website_brand_settings").update({ theme: newTheme }).eq("tenant_id", TENANT);
if (error) { console.error("WRITE FAILED:", error.message); process.exit(1); }

console.log("✓ Father's Day occasion set on aibizconnect.app (website f33761c3).");
console.log("  Banner:", occasions.custom.find((c) => c.id === "fathers-day-2026").message);
console.log("  Window: 2026-06-19 → 2026-06-21 (today through Father's Day Sunday).");
console.log("  brandRow seeded:", existing ? "already existed" : "created from merged tenant brand (colors/fonts preserved)");
