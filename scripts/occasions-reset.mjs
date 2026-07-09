// Reset occasions on the AIBizConnect website to a clean slate (Ali: clean everything up; he'll
// re-enable Father's Day himself from the Occasions tab). Clears snow/fireworks/banners/custom.
// Run: node --env-file=.env.local scripts/occasions-reset.mjs
import { createClient } from "@supabase/supabase-js";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: rows } = await sb.from("website_brand_settings").select("website_id, theme").eq("tenant_id", TENANT);
const target = (rows || [])[0];
if (!target) { console.error("No brand row found."); process.exit(1); }

const theme = target.theme && typeof target.theme === "object" ? { ...target.theme } : {};
const site = theme.site && typeof theme.site === "object" ? { ...theme.site } : {};
// Clean, empty occasions (matches OccasionsPanel's default) — removes every animation/banner/custom.
site.occasions = { settings: {}, bannerStyle: {}, animations: {}, banners: {}, custom: [] };
theme.site = site;

const { error } = await sb.from("website_brand_settings").update({ theme }).eq("tenant_id", TENANT);
if (error) { console.error("RESET FAILED:", error.message); process.exit(1); }
console.log("✓ Occasions reset to a clean slate on aibizconnect.app. Snow/fireworks/banners/custom all cleared.");
console.log("  Turn on Father's Day from: Sites → AIBizConnect → Occasions tab (saving works now).");
