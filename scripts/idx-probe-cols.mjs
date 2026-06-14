// Probe: do the 0071/0072 columns exist on idx_listings? Run: node --env-file=.env.local scripts/idx-probe-cols.mjs
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cols = ["property_class", "ownership_type", "property_sub_type", "association_fee", "parking_total", "zoning", "number_of_units", "lot_frontage", "business_type"];
for (const c of cols) {
  const { error } = await sb.from("idx_listings").select(c).limit(1);
  console.log(`${c.padEnd(20)} ${error ? "MISSING — " + error.message : "OK"}`);
}
// also count how many rows already have property_class set
const { count } = await sb.from("idx_listings").select("id", { count: "exact", head: true }).not("property_class", "is", null);
console.log("rows with property_class set:", count ?? "n/a");
