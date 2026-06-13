import { planSitemap, assemblePage, prebuiltCatalog, type AssemblyProfile } from "../lib/sites/assembly-generator";
import { inspectPage } from "../lib/sites/inspector";
import { sectionSchema } from "../lib/sections/schemas";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const profile: AssemblyProfile = {
  businessName: "AI Biz Connect",
  industry: "all-in-one AI business operating system (CRM, websites, funnels, automations, AI agents) for service professionals",
  services: "CRM & pipelines, AI website builder, funnels, marketing automation, AI booking agents",
  audience: "owners of professional-services businesses tired of juggling disconnected tools",
  tone: "confident, modern, premium SaaS",
  city: "Toronto", brandPrimary: "#0950c3", brandAccent: "#07b6d5",
};
(async () => {
  console.log("catalog:", prebuiltCatalog().length, "prebuilts available\n");
  const sm = await planSitemap(profile, P);
  console.log("sitemap:", sm.pages.map((p) => `${p.slug}(${p.pageType})`).join(", "));

  const sections = await assemblePage(profile, sm.pages[0], P);
  console.log(`\nhome assembled: ${sections.length} sections`);
  sections.forEach((s: any, i) => {
    const txt = JSON.stringify(s).match(/"text":"([^"]{0,50})/)?.[1] ?? JSON.stringify(s).match(/"label":"([^"]{0,40})/)?.[1] ?? "";
    console.log(`  ${i}: ${s.type}/${s._name || ""} — "${txt}"`);
  });
  const allValid = sections.every((s) => sectionSchema.safeParse(s).success);
  const fallbacks = sections.filter((s: any) => s.type === "imported-html" || s.type === "html").length;
  const report = await inspectPage(sections as any, null, { checkImages: false, seo: { seo_title: "AI Biz Connect" } as any });
  console.log(`\nVALID: ${allValid} | FALLBACKS: ${fallbacks} | INSPECTOR: ${report.score} (${report.issues.map((i:any)=>i.code).join(",")||"none"})`);

  // create the page
  const sb = createSupabaseServiceClient();
  let { data: w } = await sb.from("websites").select("id").eq("tenant_id", P).eq("slug", "main").maybeSingle();
  if (!w) { const ins = await sb.from("websites").insert({ tenant_id: P, name: "AI Biz Connect", slug: "abc-assembled", is_primary: true }).select("id").single(); w = ins.data as any; }
  const websiteId = (w as any).id;
  const { data: ex } = await sb.from("website_pages").select("id").eq("tenant_id", P).eq("website_id", websiteId).eq("slug", "home-assembled").maybeSingle();
  const row = { tenant_id: P, website_id: websiteId, title: "Home (AI-assembled)", slug: "home-assembled", is_home: false, is_public: false, order_index: 0, draft_sections: sections, draft_seo: { seo_title: "AI Biz Connect" } };
  let pageId: string;
  if (ex) { await sb.from("website_pages").update(row).eq("id", (ex as any).id); pageId = (ex as any).id; }
  else { const ins = await sb.from("website_pages").insert(row).select("id").single(); pageId = (ins.data as any).id; }
  console.log(`\neditor: https://app.aibizconnect.app/tenants/${P}/website/${websiteId}  · preview: https://app.aibizconnect.app/tenants/${P}/website/preview/${pageId}`);
})();
