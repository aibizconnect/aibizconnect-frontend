// Verify class split + commercial-field population. Run: node --env-file=.env.local scripts/idx-verify.mjs
import { createClient } from "@supabase/supabase-js";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: classes } = await sb.rpc("idx_property_classes", { p_tenant: TENANT });
console.log("PROPERTY CLASSES:", (classes ?? []).map((c) => `${c.property_class} (${c.n})`).join(", ") || "(none)");

const cnt = async (col) => (await sb.from("idx_listings").select("id", { count: "exact", head: true }).eq("tenant_id", TENANT).is("inactive_at", null).not(col, "is", null)).count;
console.log("with zoning:", await cnt("zoning"), "| with number_of_units:", await cnt("number_of_units"), "| with association_fee:", await cnt("association_fee"), "| with property_sub_type:", await cnt("property_sub_type"));

// sample a few commercial listings to eyeball the new fields
const { data: comm } = await sb.from("idx_listings").select("property_type, property_class, address_city, list_price, zoning, number_of_units, sqft_total, lot_size_sqft, business_type")
  .eq("tenant_id", TENANT).eq("property_class", "Commercial").limit(5);
console.log("\nSAMPLE COMMERCIAL:");
for (const r of comm ?? []) console.log(` ${r.property_type} · ${r.address_city} · $${r.list_price} · zoning=${r.zoning ?? "—"} · units=${r.number_of_units ?? "—"} · sqft=${r.sqft_total ?? "—"} · lot=${r.lot_size_sqft ?? "—"} · biz=${r.business_type ?? "—"}`);
