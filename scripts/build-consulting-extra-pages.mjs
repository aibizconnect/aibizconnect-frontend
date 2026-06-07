// Add 6 service detail pages + a public /seo marketing page to the consulting
// tenant. Reuses the existing Footer block + branding. Live writes; reversible
// via cycle2-rollback.mjs (deletes ALL builder rows for the tenant).
//
// Usage: node scripts/build-consulting-extra-pages.mjs [TENANT_UUID]

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const TENANT_ID = process.argv.find((a) => /^[0-9a-f-]{36}$/i.test(a)) || "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const cta = (label, href) => ({ label, href });

const SERVICE_PAGES = [
  { title: "AI Automation", slug: "ai-automation", sub: "Lead capture, scoring, follow-up, and pipeline management — automated from day one inside GoHighLevel.", feats: [
    { title: "Automated lead capture", description: "Every inbound lead is captured, tagged, and routed the moment it arrives." },
    { title: "Engagement scoring", description: "We build your Engagement Score system so your team works the hottest leads first." },
    { title: "AI follow-up sequences", description: "AI-drafted emails and nurture sequences keep prospects warm 24/7." },
    { title: "Pipeline management", description: "Deals advance through your pipeline automatically based on real signals." },
  ] },
  { title: "AI Business Consulting", slug: "ai-consulting", sub: "We find your highest-ROI automation opportunities and implement them in a focused sprint — no bloated retainers.", feats: [
    { title: "ROI-first roadmap", description: "We map where AI creates the most leverage in your specific business." },
    { title: "Structured sprints", description: "Scoped, time-boxed engagements — not open-ended retainers." },
    { title: "Hands-on implementation", description: "We build and deploy working systems, not just advice." },
    { title: "Knowledge transfer", description: "Your team learns to run and extend everything we ship." },
  ] },
  { title: "AI-Powered SEO & GEO", slug: "seo-geo", sub: "Get found on Google and in AI-generated answers (ChatGPT, Gemini, Perplexity).", feats: [
    { title: "Traditional SEO", description: "On-page, technical, and content optimization built for Google." },
    { title: "Generative Engine Optimization", description: "Structure content so AI assistants surface and cite you." },
    { title: "Schema markup", description: "Rich structured data so engines truly understand your site." },
    { title: "Measurable scoring", description: "Track your combined SEO + GEO score with our analyzer." },
  ], extraCta: { heading: "Score your site now", sub: "Run the free SEO + GEO Analyzer.", cta: cta("Launch the Analyzer", "/seo") } },
  { title: "Lead Generation Systems", slug: "lead-generation", sub: "Multi-step lead funnels with qualifying intake, automated CRM entry, tagging, and pipeline placement.", feats: [
    { title: "Qualifying funnels", description: "Intake forms that pre-qualify so you talk to fit prospects only." },
    { title: "Automated CRM entry", description: "Every lead lands in your CRM, tagged and placed — no manual entry." },
    { title: "Smart routing", description: "Leads are routed to the right pipeline and owner instantly." },
    { title: "Warm-lead focus", description: "Your team spends time on warm leads, not cold outreach." },
  ] },
  { title: "GoHighLevel CRM Setup", slug: "ghl-crm", sub: "Full GoHighLevel sub-account buildout for agencies, brokers, and consultants.", feats: [
    { title: "Pipelines & workflows", description: "Complete pipeline and automation buildout tailored to your process." },
    { title: "Custom fields & Snapshots", description: "Reusable Snapshots and custom fields configured clean." },
    { title: "White-label portals", description: "Branded client portals ready to hand off." },
    { title: "Clean deployment", description: "Deployed right the first time, fully documented." },
  ] },
  { title: "AI Training & Bootcamps", slug: "ai-training", sub: "Hands-on training for business owners and teams to build internal AI capability.", feats: [
    { title: "Live bootcamps", description: "Hands-on cohorts that turn theory into deployed systems." },
    { title: "On-demand courses", description: "Self-paced lessons your whole team can take." },
    { title: "Community support", description: "Practitioner channels for real answers as you build." },
    { title: "Internal capability", description: "Your team learns to run and extend AI on their own." },
  ] },
];

const SEO_PAGE = { title: "SEO + GEO Analyzer", slug: "seo", sections: [
  { type: "hero", heading: "SEO + GEO Score Analyzer", subheading: "Score your site for traditional search AND AI answer engines (ChatGPT, Gemini, Perplexity) — then get a clear, prioritized action plan.", primaryCta: cta("Launch the Analyzer", "https://seo.aibizconnect.ca"), secondaryCta: cta("Book a Consultation", "/contact") },
  { type: "features", heading: "What it analyzes", features: [
    { title: "SEO score", description: "On-page, technical, and content signals that drive Google rankings." },
    { title: "GEO score", description: "How ready your content is to be surfaced and cited by AI assistants." },
    { title: "Schema markup guide", description: "Exactly which structured data to add, with copy-ready examples." },
    { title: "Multi-site tracking", description: "Track multiple sites and watch scores improve over time." },
    { title: "Branded reports", description: "Export a polished, client-ready report of findings and tasks." },
  ] },
  { type: "cta", heading: "Want it done for you?", subheading: "We'll implement every fix the analyzer surfaces.", cta: cta("Book My Free Consultation", "/contact") },
] };

function buildServiceSections(p) {
  const s = [
    { type: "hero", heading: p.title, subheading: p.sub, primaryCta: cta("Book a Free Consultation", "/contact"), secondaryCta: cta("All Services", "/services") },
    { type: "features", heading: "What you get", features: p.feats },
  ];
  if (p.extraCta) s.push({ type: "cta", heading: p.extraCta.heading, subheading: p.extraCta.sub, cta: p.extraCta.cta });
  s.push({ type: "cta", heading: `Ready to implement ${p.title}?`, cta: cta("Book My Free Consultation", "/contact") });
  return s;
}

async function createAndPublish(title, slug, sections, order, footerId) {
  const { data: page, error } = await sb.from("website_pages").insert({
    tenant_id: TENANT_ID, title, slug, order_index: order, is_home: false,
    draft_title: title, draft_slug: slug, draft_seo: {}, draft_sections: [],
  }).select("id").single();
  if (error) throw new Error(`createPage ${slug}: ${error.message}`);
  await sb.from("website_page_block_refs").insert({ tenant_id: TENANT_ID, page_id: page.id, block_id: footerId, order_index: 0 });
  await sb.from("website_pages").update({ is_public: true, published_at: new Date().toISOString() }).eq("id", page.id);
  await sb.from("website_page_sections").insert(sections.map((content, i) => ({ tenant_id: TENANT_ID, page_id: page.id, type: content.type, content, order_index: i })));
  return { title, slug, id: page.id, sections: sections.length };
}

async function main() {
  const { data: footer } = await sb.from("website_global_blocks").select("id").eq("tenant_id", TENANT_ID).eq("name", "Footer").maybeSingle();
  if (!footer) throw new Error("Footer block not found — run build-consulting-site.mjs first.");
  const { count: pageCount } = await sb.from("website_pages").select("id", { count: "exact", head: true }).eq("tenant_id", TENANT_ID);
  let order = pageCount ?? 0;

  const out = [];
  for (const p of SERVICE_PAGES) out.push(await createAndPublish(p.title, p.slug, buildServiceSections(p), order++, footer.id));
  out.push(await createAndPublish(SEO_PAGE.title, SEO_PAGE.slug, SEO_PAGE.sections, order++, footer.id));

  // Add the SEO Analyzer page to the primary nav (append).
  const { count: navCount } = await sb.from("website_navigation").select("id", { count: "exact", head: true }).eq("tenant_id", TENANT_ID).eq("menu_key", "primary");
  const seoPage = out.find((o) => o.slug === "seo");
  await sb.from("website_navigation").insert({ tenant_id: TENANT_ID, menu_key: "primary", label: "SEO Analyzer", page_id: seoPage.id, order_index: navCount ?? 0 });

  console.log(JSON.stringify({ tenant: TENANT_ID, created: out }, null, 2));
  console.log("\nDONE — 6 service pages + /seo published; SEO Analyzer added to nav.");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
