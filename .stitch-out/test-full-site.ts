import { generateWebsiteFromBrief, type AssemblyProfile } from "../lib/sites/assembly-generator";
import { inspectPage } from "../lib/sites/inspector";
import { sectionSchema } from "../lib/sections/schemas";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  let { data: w } = await sb.from("websites").select("id").eq("tenant_id", P).eq("slug", "main").maybeSingle();
  if (!w) { const i = await sb.from("websites").insert({ tenant_id: P, name: "AI Biz Connect", slug: "abc-gen", is_primary: true }).select("id").single(); w = i.data as any; }
  const websiteId = (w as any).id;
  const profile: AssemblyProfile = { businessName: "AI Biz Connect", industry: "all-in-one AI business operating system for service professionals", services: "CRM, AI website builder, funnels, automation, AI booking agents", audience: "professional-services business owners", tone: "confident premium SaaS", city: "Toronto", brandPrimary: "#0950c3", brandAccent: "#07b6d5" };
  const r = await generateWebsiteFromBrief(P, websiteId, profile);
  console.log(`\ngenerated ${r.pages.length} pages${r.errors.length ? ", errors: " + r.errors.join("; ") : ""}`);
  for (const pg of r.pages) {
    const valid = pg.sections.every((s) => sectionSchema.safeParse(s).success);
    const fb = pg.sections.filter((s:any)=>s.type==="imported-html"||s.type==="html").length;
    const rep = await inspectPage(pg.sections as any, null, { checkImages: false, seo: { seo_title: pg.title, seo_description: pg.seoDescription } as any });
    console.log(`  ${pg.slug.padEnd(14)} ${pg.sections.length} sec | valid=${valid} fallbacks=${fb} | INSPECTOR ${rep.score}${rep.issues.length?" ("+rep.issues.map((i:any)=>i.code).join(",")+")":""}`);
  }
  console.log(`\neditor: https://app.aibizconnect.app/tenants/${P}/website/${websiteId}`);
})();
