// Read-only: verify the AIBizConnect website is wired in Sites + show occasions config.
// Run: node --env-file=.env.local scripts/occasions-check.mjs
import { createClient } from "@supabase/supabase-js";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: sites } = await sb.from("websites").select("id, name, slug, primary_domain, is_primary").eq("tenant_id", TENANT);
console.log("WEBSITES:", JSON.stringify(sites, null, 2));

const { data: pages } = await sb.from("website_pages").select("id, title, slug, website_id, is_public, funnel_id").eq("tenant_id", TENANT);
const total = (pages || []).length;
const withWid = (pages || []).filter((p) => p.website_id).length;
const orphan = (pages || []).filter((p) => !p.website_id && !p.funnel_id).length;
console.log(`\nPAGES: ${total} total · ${withWid} have website_id · ${orphan} orphan (NULL website_id, non-funnel)`);
for (const p of pages || []) console.log(`  - ${p.title} (/${p.slug})  website_id=${p.website_id ? p.website_id.slice(0, 8) : "NULL"}  ${p.is_public ? "LIVE" : "draft"}${p.funnel_id ? " [funnel]" : ""}`);

const primary = (sites || []).find((s) => s.is_primary) || (sites || [])[0];
if (primary) {
  const { data: brand } = await sb.from("website_brand_settings").select("theme").eq("tenant_id", TENANT).eq("website_id", primary.id).maybeSingle();
  const occ = brand?.theme?.site?.occasions ?? null;
  console.log(`\nPRIMARY website: ${primary.name} (${primary.id.slice(0, 8)})  brandRow=${brand ? "YES" : "NO"}`);
  console.log("OCCASIONS config:", occ ? JSON.stringify(occ, null, 2) : "(none set)");
}
