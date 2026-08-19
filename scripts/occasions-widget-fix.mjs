// Read + fix the Occasions WIDGET config for a given embed key (occasion_widget_sites).
// Enables the Father's Day banner as a flying (airplane) banner, preserving existing settings.
// Run: node --env-file=.env.local scripts/occasions-widget-fix.mjs ocw_3eb5c0909e9c4297ba0c
import { createClient } from "@supabase/supabase-js";

const KEY = process.argv[2] || "ocw_3eb5c0909e9c4297ba0c";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await sb.from("occasion_widget_sites").select("key, domain, active, occasions").eq("key", KEY).maybeSingle();
if (error) { console.error("READ FAILED:", error.message); process.exit(1); }
if (!data) { console.error("No widget row for key", KEY); process.exit(1); }

console.log("WIDGET:", data.domain, "active=" + data.active);
console.log("BEFORE occasions:", JSON.stringify(data.occasions ?? {}, null, 2));

const occ = (data.occasions && typeof data.occasions === "object") ? { ...data.occasions } : {};
occ.banners = {
  ...(occ.banners || {}),
  "us-fathers-day": { ...(occ.banners?.["us-fathers-day"] || {}), enabled: true, fly: true },
};

const { error: werr } = await sb.from("occasion_widget_sites").update({ occasions: occ, updated_at: new Date().toISOString() }).eq("key", KEY);
if (werr) { console.error("WRITE FAILED:", werr.message); process.exit(1); }

console.log("\n✓ Enabled Father's Day as a flying (airplane) banner for", data.domain);
console.log("AFTER banners:", JSON.stringify(occ.banners, null, 2));
