// Cycle 2 — Builder-Agent: 3-page starter site builder (one-off seed script).
//
// WHY a script: the builder mutations are Next.js "use server" actions that
// cannot be invoked headlessly. This script faithfully reproduces their inserts
// against the live DB using @supabase/supabase-js + the service-role key.
//
// SAFETY: refuses to run unless a REAL tenant UUID is supplied. Placeholder
// values like "<REAL_TENANT_UUID>" are rejected.
//
// Usage:
//   node scripts/cycle2-build.mjs <TENANT_UUID>
//
// Section content is built to satisfy lib/sections/schemas.ts EXACTLY:
//   real types = hero | features | testimonials | listings | contact-form | cta
//   (there is NO "richtext" and NO "footer" type — remapped below).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- load env from .env.local (Node does not auto-load it) ----------------
function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}
const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// --- args + tenant guard ---------------------------------------------------
const ARGS = process.argv.slice(2);
const DRY = ARGS.includes("--dry-run");
const TENANT_ID = ARGS.find((a) => !a.startsWith("--"));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!TENANT_ID || !UUID_RE.test(TENANT_ID) || TENANT_ID.includes("<")) {
  console.error(
    `REFUSING TO RUN: tenant id "${TENANT_ID}" is not a real UUID. ` +
      `Pass a real tenant UUID: node scripts/cycle2-build.mjs <uuid>`
  );
  process.exit(1);
}
if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
if (DRY) console.log("\n*** DRY RUN — no database writes will occur ***\n");

const sb = DRY
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const results = [];
const log = (tool, args, result) => results.push({ tool, args, result });

async function createPage(title, slug, isHome = false) {
  if (DRY) {
    const id = `dry-${slug}-id`;
    log("createPage", { title, slug, isHome }, { id, order_index: "(computed at runtime)" });
    return id;
  }
  if (isHome) {
    await sb.from("website_pages").update({ is_home: false }).eq("tenant_id", TENANT_ID).eq("is_home", true);
  }
  const { count } = await sb
    .from("website_pages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", TENANT_ID);
  const { data, error } = await sb
    .from("website_pages")
    .insert({
      tenant_id: TENANT_ID,
      title,
      slug,
      order_index: count ?? 0,
      is_home: isHome,
      draft_title: title,
      draft_slug: slug,
      draft_seo: {},
      draft_sections: [],
    })
    .select("id, title, slug, order_index, is_home")
    .single();
  if (error) throw new Error(`createPage(${slug}): ${error.message}`);
  log("createPage", { title, slug, isHome }, data);
  return data.id;
}

async function saveDraftSections(pageId, sections) {
  if (DRY) {
    log("saveDraft", { pageId, sectionTypes: sections.map((s) => s.type) }, { ok: true });
    return;
  }
  const { error } = await sb
    .from("website_pages")
    .update({ draft_sections: sections })
    .eq("id", pageId)
    .eq("tenant_id", TENANT_ID);
  if (error) throw new Error(`saveDraft(${pageId}): ${error.message}`);
  log("saveDraft", { pageId, sectionCount: sections.length }, { ok: true });
}

async function publishPage(pageId) {
  if (DRY) {
    log("publishPage", { pageId }, { published: true, note: "(would copy draft->live + rebuild sections)" });
    return;
  }
  // Faithful reproduction of publishPage(): copy draft -> live, rebuild sections.
  const { data: page } = await sb
    .from("website_pages")
    .select("title, slug, draft_title, draft_slug, draft_seo, draft_sections")
    .eq("tenant_id", TENANT_ID)
    .eq("id", pageId)
    .single();
  const newTitle = page.draft_title ?? page.title;
  const newSlug = page.draft_slug ?? page.slug;
  const sections = Array.isArray(page.draft_sections) ? page.draft_sections : [];
  await sb
    .from("website_pages")
    .update({
      title: newTitle,
      slug: newSlug,
      is_public: true,
      published_at: new Date().toISOString(),
      draft_title: null,
      draft_slug: null,
      draft_seo: {},
      draft_sections: [],
    })
    .eq("tenant_id", TENANT_ID)
    .eq("id", pageId);
  await sb.from("website_page_sections").delete().eq("tenant_id", TENANT_ID).eq("page_id", pageId);
  if (sections.length) {
    await sb.from("website_page_sections").insert(
      sections.map((content, index) => ({
        tenant_id: TENANT_ID,
        page_id: pageId,
        type: content.type,
        content,
        order_index: index,
      }))
    );
  }
  log("publishPage", { pageId }, { published: true });
}

async function createGlobalBlock(name, type, content) {
  if (DRY) {
    const id = `dry-${name.toLowerCase()}-block-id`;
    log("createGlobalBlock", { name, type }, { id });
    return id;
  }
  const { data, error } = await sb
    .from("website_global_blocks")
    .insert({ tenant_id: TENANT_ID, name, type, content })
    .select("id, name, type")
    .single();
  if (error) throw new Error(`createGlobalBlock(${name}): ${error.message}`);
  log("createGlobalBlock", { name, type }, data);
  return data.id;
}

async function attachBlock(pageId, blockId, orderIndex) {
  if (DRY) {
    log("attachBlockToPage", { pageId, blockId, orderIndex }, { ok: true });
    return;
  }
  const { error } = await sb
    .from("website_page_block_refs")
    .insert({ tenant_id: TENANT_ID, page_id: pageId, block_id: blockId, order_index: orderIndex });
  if (error) throw new Error(`attachBlock(${pageId}): ${error.message}`);
  log("attachBlockToPage", { pageId, blockId, orderIndex }, { ok: true });
}

async function createNavItem(label, pageId, orderIndex) {
  if (DRY) {
    const id = `dry-nav-${label.toLowerCase()}-id`;
    log("createNavItem", { label, pageId, orderIndex }, { id });
    return id;
  }
  const { data, error } = await sb
    .from("website_navigation")
    .insert({
      tenant_id: TENANT_ID,
      menu_key: "primary",
      label,
      page_id: pageId,
      order_index: orderIndex,
    })
    .select("id, label")
    .single();
  if (error) throw new Error(`createNavItem(${label}): ${error.message}`);
  log("createNavItem", { label, pageId, orderIndex }, data);
  return data.id;
}

// --- schema-valid section content (matches lib/sections/schemas.ts) --------
const homeSections = [
  { type: "hero", heading: "Welcome to Your New Site", subheading: "Built by the Builder-Agent.", primaryCta: { label: "Get Started", href: "/contact" } },
  { type: "features", heading: "What We Offer", features: [
    { title: "Fast", description: "Quick to launch." },
    { title: "Flexible", description: "Edit anything." },
    { title: "Multi-tenant", description: "Isolated per tenant." },
  ] },
  { type: "cta", heading: "Ready to begin?", cta: { label: "Contact us", href: "/contact" } },
];
const aboutSections = [
  { type: "hero", heading: "About Us", subheading: "Our story." },
  // 'RichText' has no schema -> remapped to a features block describing the company.
  { type: "features", heading: "Who We Are", features: [
    { title: "Mission", description: "Help businesses get online fast." },
    { title: "Team", description: "A small, focused crew." },
  ] },
];
const contactSections = [
  { type: "hero", heading: "Get in Touch" },
  { type: "contact-form", heading: "Contact Us", fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "message", label: "Message", type: "textarea" },
  ], submitLabel: "Send" },
];
// 'Footer' has no section type -> modeled as a 'cta' block (valid section type).
const footerContent = { type: "cta", heading: "AIBizConnect", subheading: "© 2026 All rights reserved.", cta: { label: "Home", href: "/home" } };

async function main() {
  const plan = "Create Home/About/Contact (drafts) -> add 3 primary nav items -> create+attach a Footer (cta) global block -> publish blocks, nav, and all pages.";
  console.log("PLAN:", plan);

  const homeId = await createPage("Home", "home", true);
  const aboutId = await createPage("About", "about");
  const contactId = await createPage("Contact", "contact");

  await saveDraftSections(homeId, homeSections);
  await saveDraftSections(aboutId, aboutSections);
  await saveDraftSections(contactId, contactSections);

  const footerId = await createGlobalBlock("Footer", "cta", footerContent);
  await attachBlock(homeId, footerId, 0);
  await attachBlock(aboutId, footerId, 0);
  await attachBlock(contactId, footerId, 0);

  await createNavItem("Home", homeId, 0);
  await createNavItem("About", aboutId, 1);
  await createNavItem("Contact", contactId, 2);

  await publishPage(homeId);
  await publishPage(aboutId);
  await publishPage(contactId);

  console.log(JSON.stringify({ plan, tenantId: TENANT_ID, toolCalls: results }, null, 2));
  console.log("\nDONE — 3-page site published for tenant", TENANT_ID);
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
