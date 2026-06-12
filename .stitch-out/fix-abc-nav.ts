// Set the canonical ABC SalesMaster header menu (with dropdown submenus, matching the
// source site's nav) on every imported page — the source used hover-dropdowns the
// importer can't yet read. Native menuItemSchema: items[{label, href, link, children[]}].
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";

const L = (label: string, href: string) => ({ label, href, link: { kind: "url", url: href, href } });
const MENU_ITEMS = [
  { ...L("Platform", "/product"), children: [
    L("Platform Overview", "/product"), L("CRM & Pipelines", "/product-crm"), L("Websites & Funnels", "/product-websites"),
    L("AI Builder", "/product-ai-builder"), L("Automations & Workflows", "/product-automations"),
    L("Consumer Portal", "/product-consumer-portal"), L("Marketplace", "/product-marketplace"),
  ] },
  { ...L("Solutions", "/solutions-real-estate"), children: [
    L("Real Estate", "/solutions-real-estate"), L("Mortgage / Finance", "/solutions-mortgage"), L("Legal", "/solutions-legal"),
    L("Insurance", "/solutions-insurance"), L("Coaching & Consulting", "/solutions-coaching"), L("Agencies", "/solutions-agencies"),
  ] },
  L("Pricing", "/pricing"),
  { ...L("Company", "/abc-about"), children: [
    L("About", "/abc-about"), L("Careers", "/careers"), L("Partners", "/partners"),
  ] },
];

function patchMenus(o: unknown): number {
  let n = 0;
  if (Array.isArray(o)) { for (const x of o) n += patchMenus(x); return n; }
  if (o && typeof o === "object") {
    const rec = o as Record<string, unknown>;
    if (rec.type === "menu") { rec.items = MENU_ITEMS; n++; }
    for (const v of Object.values(rec)) n += patchMenus(v);
  }
  return n;
}

(async () => {
  const sb = createSupabaseServiceClient();
  const { data: pages } = await sb.from("website_pages").select("id, slug, draft_sections").eq("tenant_id", TENANT).eq("website_id", WEBSITE);
  let patched = 0, skipped = 0;
  for (const p of (pages ?? []) as any[]) {
    const sections = p.draft_sections ?? [];
    const hits = patchMenus(sections);
    if (!hits) { skipped++; continue; }
    const { error } = await sb.from("website_pages").update({ draft_sections: sections }).eq("id", p.id);
    if (error) console.log(`${p.slug}: FAILED ${error.message}`);
    else { patched++; }
  }
  console.log(`menus patched on ${patched} pages (no menu found on ${skipped})`);
})();
