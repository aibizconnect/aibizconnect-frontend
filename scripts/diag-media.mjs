// One-off diagnostic: what tenant does the dashboard resolve to, and where does media live?
// Run: node --env-file=.env.local scripts/diag-media.mjs   (reads keys from env, prints none)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing env (use --env-file=.env.local)"); process.exit(1); }
const s = createClient(url, key, { auth: { persistSession: false } });
const SYSTEM = "00000000-0000-0000-0000-000000000000";

const { data: sites } = await s.from("websites").select("id, tenant_id, subdomain").limit(20);
console.log("websites (first 20):");
for (const w of sites ?? []) console.log(`  site ${w.id?.slice(0,8)}  tenant ${w.tenant_id}  ${w.subdomain ?? ""}`);
const resolved = sites?.[0]?.tenant_id ?? null;
console.log("\nresolveDefaultTenantId() would return:", resolved, resolved === SYSTEM ? "  <-- !!! SYSTEM/zero tenant" : "");

// media counts per tenant
const { data: media } = await s.from("website_media").select("tenant_id");
const counts = {};
for (const m of media ?? []) counts[m.tenant_id] = (counts[m.tenant_id] ?? 0) + 1;
console.log("\nwebsite_media rows per tenant:");
for (const [t, n] of Object.entries(counts).sort((a,b)=>b[1]-a[1])) console.log(`  ${t}  ->  ${n}${t === SYSTEM ? "  (SYSTEM)" : ""}`);
