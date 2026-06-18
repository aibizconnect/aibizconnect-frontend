// Diagnose the on-dreamhomes website. Run: node --env-file=.env.local scripts/diag-site.mjs
import { createClient } from "@supabase/supabase-js";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: sites } = await sb.from("websites").select("id, name, slug, primary_domain, subdomain, is_primary, status").eq("tenant_id", TENANT);
console.log("WEBSITES:");
for (const w of sites ?? []) console.log(`  • ${w.name} | id=${w.id} | slug=${w.slug} | domain=${w.primary_domain ?? w.subdomain ?? "-"} | ${w.is_primary ? "PRIMARY " : ""}${w.status ?? ""}`);

const { data: st, error: ste } = await sb.from("website_site_templates").select("name, industry");
console.log("\nSITE TEMPLATES (0074 applied?):", ste ? `MISSING — ${ste.message}` : (st ?? []).map((t) => t.name).join(", ") || "(table empty — not seeded)");

const { data: feed } = await sb.from("idx_feeds").select("status").eq("tenant_id", TENANT).eq("source", "ddf").maybeSingle();
console.log("IDX feed status:", feed?.status ?? "(none)");

for (const w of sites ?? []) {
  const { data: pages } = await sb.from("website_pages").select("id, title, slug, is_home, is_public, draft_sections").eq("tenant_id", TENANT).eq("website_id", w.id);
  console.log(`\n=== ${w.name} (${(pages ?? []).length} pages) ===`);
  for (const p of pages ?? []) {
    const { data: secs } = await sb.from("website_page_sections").select("type, content").eq("tenant_id", TENANT).eq("page_id", p.id).order("order_index");
    const published = (secs ?? []).map((s) => s.type + (s.type === "listings" ? `[${s.content?.source ?? "static"}]` : "")).join(", ");
    const draft = Array.isArray(p.draft_sections) ? p.draft_sections.map((s) => s?.type).join(", ") : "";
    console.log(`  ${p.slug}${p.is_home ? "*" : ""} ${p.is_public ? "" : "(draft)"} — published: [${published || "none"}]  draft: [${draft || "none"}]`);
  }
}
