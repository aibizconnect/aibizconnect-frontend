// Build the AIBizConnect Consulting site (aibizconnect.ca tenant) — improved
// content derived from the live aibizconnect.ca, styled to match aibizconnect.app.
// Live writes; reversible via cycle2-rollback.mjs <tenant> --yes.
//
// Usage: node scripts/build-consulting-site.mjs [TENANT_UUID]
// Default tenant: the consulting owner tenant.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const TENANT_ID = process.argv.find((a) => !a.startsWith("--") && /^[0-9a-f-]{36}$/i.test(a))
  || "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ── aibizconnect.app brand palette (so .ca matches .app) ────────────────────
const brand = {
  tenant_id: TENANT_ID,
  primary_color: "#0F62FE", secondary_color: "#393939", accent_color: "#FF7EB6",
  font_heading: "Inter", font_body: "Inter", tone: "professional",
  theme: { colors: { primary: "#0F62FE", secondary: "#393939", accent: "#FF7EB6", bg: "#FFFFFF", text: "#161616" }, radius: "0.5rem", spacing: "comfortable" },
};

const services = [
  { title: "AI Automation", description: "Lead capture, scoring, follow-up, and pipeline management — automated from day one inside GoHighLevel." },
  { title: "AI Business Consulting", description: "We pinpoint your highest-ROI automation opportunities and implement them in a focused sprint — no bloated retainers." },
  { title: "AI-Powered SEO & GEO", description: "Get found on Google and in AI answers (ChatGPT, Gemini, Perplexity) with traditional + generative engine optimization." },
  { title: "Lead Generation Systems", description: "Multi-step funnels with qualifying intake, automated CRM entry, tagging, and pipeline placement — so your team works warm leads only." },
  { title: "GoHighLevel CRM Setup", description: "Full GHL sub-account buildout: pipelines, workflows, custom fields, Snapshots, and white-label portals — deployed clean." },
  { title: "AI Training & Bootcamps", description: "Live bootcamps, on-demand courses, and community support to build internal AI capability." },
];
const steps = [
  { title: "1 · Discovery Call", description: "15 minutes to identify your #1 automation opportunity and confirm fit. No pitch decks, no fluff." },
  { title: "2 · Build Sprint", description: "We scope, design, and deploy your system in a 1–3 week sprint. You get working infrastructure, not a report." },
  { title: "3 · Handoff & Scale", description: "Full documentation, a walkthrough, and a 30-day support window. Your system runs autonomously while you grow." },
];
const whyUs = [
  { title: "Implementation, not advice", description: "End-to-end AI systems — we build, deploy, and hand off working infrastructure, not templates or slide decks." },
  { title: "100% Satisfaction Guaranteed", description: "We stand behind every build." },
  { title: "Free 15-Minute Strategy Call", description: "Find your highest-ROI automation before you spend a dollar." },
  { title: "No Infrastructure Cost to Start", description: "Get moving without heavy upfront tooling spend." },
];

const PAGES = [
  { title: "Home", slug: "home", isHome: true, sections: [
    { type: "hero", heading: "Stop Trading Time for Money — Let AI Work 24/7", subheading: "AIBizConnect helps independent professionals and growing businesses automate operations, capture more leads, and scale revenue without hiring more people.", primaryCta: { label: "Book My Free Consultation", href: "/contact" }, secondaryCta: { label: "Explore Services", href: "/services" } },
    { type: "features", heading: "End-to-End AI Implementation", features: services },
    { type: "features", heading: "How It Works", features: steps },
    { type: "cta", heading: "Ready to put AI to work?", subheading: "100% satisfaction guaranteed. No infrastructure cost to start.", cta: { label: "Book My Free Consultation", href: "/contact" } },
  ] },
  { title: "Services", slug: "services", sections: [
    { type: "hero", heading: "Services", subheading: "End-to-end AI implementation — we build, deploy, and hand off working systems." },
    { type: "features", heading: "What We Build", features: services },
    { type: "cta", heading: "Not sure where to start?", subheading: "Book a free 15-minute call and we'll find your #1 automation opportunity.", cta: { label: "Book a Call", href: "/contact" } },
  ] },
  { title: "About", slug: "about", sections: [
    { type: "hero", heading: "Canada's AI Business Automation Consultancy", subheading: "We build the systems that run your business while you focus on growth." },
    { type: "features", heading: "Why AIBizConnect", features: whyUs },
    { type: "cta", heading: "Let's find your leverage", cta: { label: "Book My Free Consultation", href: "/contact" } },
  ] },
  { title: "Contact", slug: "contact", sections: [
    { type: "hero", heading: "Let's Talk", subheading: "Book a free 15-minute strategy call. Richmond Hill, Ontario · (416) 727-7111" },
    { type: "contact-form", heading: "Book My Free Consultation", subheading: "Tell us a little about your business and we'll reach out within one business day.", fields: [
      { name: "name", label: "Name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "message", label: "What would you like to automate?", type: "textarea" },
    ], submitLabel: "Book My Free Consultation", successMessage: "Thanks — we'll reach out within one business day." },
  ] },
];
const footer = { type: "cta", heading: "AIBizConnect", subheading: "Canada's AI Business Automation Consultancy · Richmond Hill, ON · (416) 727-7111", cta: { label: "Book a Call", href: "/contact" } };

async function createPage(p, order) {
  if (p.isHome) await sb.from("website_pages").update({ is_home: false }).eq("tenant_id", TENANT_ID).eq("is_home", true);
  const { data, error } = await sb.from("website_pages").insert({
    tenant_id: TENANT_ID, title: p.title, slug: p.slug, order_index: order, is_home: !!p.isHome,
    draft_title: p.title, draft_slug: p.slug, draft_seo: {}, draft_sections: p.sections,
  }).select("id").single();
  if (error) throw new Error(`createPage ${p.slug}: ${error.message}`);
  return data.id;
}
async function publish(pageId, sections) {
  await sb.from("website_pages").update({ is_public: true, published_at: new Date().toISOString(), draft_sections: [] }).eq("id", pageId).eq("tenant_id", TENANT_ID);
  await sb.from("website_page_sections").delete().eq("tenant_id", TENANT_ID).eq("page_id", pageId);
  await sb.from("website_page_sections").insert(sections.map((content, i) => ({ tenant_id: TENANT_ID, page_id: pageId, type: content.type, content, order_index: i })));
}

async function main() {
  console.log("Building consulting site for tenant", TENANT_ID);
  await sb.from("website_brand_settings").upsert(brand, { onConflict: "tenant_id" });

  const { data: blk } = await sb.from("website_global_blocks").insert({ tenant_id: TENANT_ID, name: "Footer", type: "cta", content: footer }).select("id").single();

  const ids = [];
  for (let i = 0; i < PAGES.length; i++) ids.push(await createPage(PAGES[i], i));
  for (let i = 0; i < PAGES.length; i++) {
    await sb.from("website_page_block_refs").insert({ tenant_id: TENANT_ID, page_id: ids[i], block_id: blk.id, order_index: 0 });
    await sb.from("website_navigation").insert({ tenant_id: TENANT_ID, menu_key: "primary", label: PAGES[i].title, page_id: ids[i], order_index: i });
    await publish(ids[i], PAGES[i].sections);
  }
  console.log(JSON.stringify({ tenant: TENANT_ID, brand: brand.primary_color, pages: PAGES.map((p, i) => ({ title: p.title, slug: p.slug, id: ids[i], sections: p.sections.length })) }, null, 2));
  console.log("\nDONE — consulting site published.");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
