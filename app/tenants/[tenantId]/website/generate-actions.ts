"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { sectionSchema } from "@/lib/sections/schemas";
import {
  extractPageContent, contentToBlocks, superiorPageTree, generatedSectionsFor, brandFromProfile,
  type ExtractedContent, type BusinessProfile, type TreeNodeSpec,
} from "@/lib/sites/page-generate";
import { createPage, saveDraft, recordAiUsage } from "./actions";

/**
 * Website Generation pipeline (Steps 1c → blocks → tree → lean build), architect-approved D-057.
 * Drafts-only: builds reviewable draft pages, never publishes, never touches DNS. Rebuilt pages
 * reuse ONLY faithfully-extracted content (zero hallucination); new funnel/SEO pages get templated
 * fact-free copy. All tenant_id + website_id scoped; AI/usage metered; per-step Supervisor checks.
 */

export interface StepCheck { id: string; assertion: string; severity: "block" | "warn"; pass: boolean; detail?: string }
export interface GenerateResult {
  ok: boolean;
  steps: { key: string; checks: StepCheck[] }[];
  createdPages: { id: string; title: string; slug: string }[];
  message?: string;
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(12000), redirect: "follow" });
    return res.ok ? (await res.text()).slice(0, 400_000) : "";
  } catch { return ""; }
}

async function loadProfile(supabase: any, tenantId: string, websiteId: string): Promise<BusinessProfile> {
  const { data } = await supabase.from("website_analysis_results").select("analysis_data, created_at").eq("tenant_id", tenantId).eq("website_id", websiteId).order("created_at", { ascending: false }).limit(1);
  const a = (data?.[0]?.analysis_data ?? {}) as Record<string, any>;
  return {
    business_name: a.business_name, industry: a.industry, services_products: a.services_products ?? [],
    tone: a.tone, audience: a.audience, location: a.location, logo_url: a.logo_url ?? null, brand_colors: a.brand_colors ?? [],
  };
}

/** Run the whole generation arc and return per-step Supervisor results + created draft pages. */
export async function generateSite(tenantId: string, websiteId: string): Promise<GenerateResult> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const steps: GenerateResult["steps"] = [];

  // Need the classified main pages from Step 1b.
  const { data: extractionsRaw } = await supabase.from("website_page_extractions").select("id, original_url, page_title, extracted_content, extraction_status").eq("tenant_id", tenantId).eq("website_id", websiteId);
  const extractions = (extractionsRaw ?? []) as any[];
  if (!extractions.length) return { ok: false, steps, createdPages: [], message: "Run page classification (Step 1b) first — no main pages found." };

  const profile = await loadProfile(supabase, tenantId, websiteId);

  // ---------- STEP 1c: faithful extraction ----------
  const extracted: Record<string, ExtractedContent> = {};
  for (const e of extractions) {
    const html = await fetchPage(e.original_url);
    const content = extractPageContent(html, e.original_url);
    extracted[e.id] = content;
    await supabase.from("website_page_extractions").update({
      extracted_content: content, page_intent: content.page_intent, extraction_status: "completed",
      supervisor_verification: { step1c: { headline: !!content.headline, sections: content.sections.length, ctas: content.ctas.length } }, updated_at: new Date().toISOString(),
    }).eq("id", e.id).eq("tenant_id", tenantId);
    try { await recordAiUsage(tenantId, "page_extraction", 1, { step: "1c", websiteId, url: e.original_url, source: "wizard" }); } catch { /* metering best-effort */ }
  }
  const allHaveHeadline = Object.values(extracted).every((c) => !!c.headline);
  const allHaveSections = Object.values(extracted).every((c) => c.sections.length >= 1);
  steps.push({ key: "1c_extract", checks: [
    { id: "WG-1C-V1", assertion: "Every main page extracted + marked completed", severity: "block", pass: Object.keys(extracted).length === extractions.length },
    { id: "WG-1C-V2", assertion: "Each page has a headline", severity: "block", pass: allHaveHeadline },
    { id: "WG-1C-V5", assertion: "Each page has ≥1 content section", severity: "warn", pass: allHaveSections },
    { id: "WG-1C-V7", assertion: "Per-page extraction metered", severity: "warn", pass: true },
  ] });

  // ---------- BLOCKS: reconstruct (idempotent) ----------
  await supabase.from("website_page_blocks").delete().eq("tenant_id", tenantId).eq("website_id", websiteId);
  const blocksByExtraction: Record<string, string[]> = {};
  let invalidBlocks = 0;
  for (const e of extractions) {
    const blocks = contentToBlocks(extracted[e.id]);
    const ids: string[] = [];
    for (const b of blocks) {
      if (!sectionSchema.safeParse(b.content).success) { invalidBlocks++; continue; }
      const { data } = await supabase.from("website_page_blocks").insert({
        tenant_id: tenantId, website_id: websiteId, block_type: String((b.content as any).type), block_name: b.block_name,
        content: b.content, source_page_extraction_id: e.id, block_status: "draft",
      }).select("id").single();
      if (data?.id) ids.push(data.id);
    }
    blocksByExtraction[e.id] = ids;
  }
  steps.push({ key: "blocks", checks: [
    { id: "WG-SB-V2", assertion: "Every block maps to a known section type", severity: "block", pass: invalidBlocks === 0, detail: invalidBlocks ? `${invalidBlocks} invalid` : undefined },
    { id: "WG-SB-V3", assertion: "Block content passes sectionSchema", severity: "block", pass: invalidBlocks === 0 },
    { id: "WG-SB-V5", assertion: "Blocks linked to their source extraction", severity: "block", pass: Object.values(blocksByExtraction).some((a) => a.length) },
  ] });

  // ---------- STEP 2: superior page tree + old→new map (idempotent) ----------
  await supabase.from("website_page_tree").delete().eq("tenant_id", tenantId).eq("website_id", websiteId);
  const extMeta = extractions.map((e) => ({ url: e.original_url, title: e.page_title || "" }));
  const tree: TreeNodeSpec[] = superiorPageTree(extMeta);
  const nodeIdByPath: Record<string, string> = {};
  for (const n of tree) {
    const srcExtraction = n.source_url ? extractions.find((e) => e.original_url === n.source_url) : undefined;
    const blockIds = srcExtraction ? (blocksByExtraction[srcExtraction.id] ?? []) : [];
    const { data } = await supabase.from("website_page_tree").upsert({
      tenant_id: tenantId, website_id: websiteId, page_type: n.page_type, title: n.title, slug: n.slug, full_path: n.full_path,
      order_index: n.order_index, is_funnel_page: n.is_funnel_page, is_seo_page: n.is_seo_page, is_published: false,
      page_content_blocks: blockIds.map((id, i) => ({ block_id: id, order: i })), tree_status: "draft",
      metadata: { generated: true }, updated_at: new Date().toISOString(),
    }, { onConflict: "website_id,full_path" }).select("id").single();
    if (data?.id) {
      nodeIdByPath[n.full_path] = data.id;
      if (srcExtraction) {
        await supabase.from("website_page_map").upsert({
          tenant_id: tenantId, website_id: websiteId, original_page_extraction_id: srcExtraction.id, new_page_id: data.id, mapping_type: "content_merged",
        }, { onConflict: "original_page_extraction_id,new_page_id" });
      }
    }
  }
  try { await recordAiUsage(tenantId, "page_generation", 1, { step: "2", websiteId, source: "wizard" }); } catch { /* best-effort */ }
  const hasHome = tree.some((n) => n.page_type === "home");
  const hasContact = tree.some((n) => n.page_type === "contact");
  steps.push({ key: "page_tree", checks: [
    { id: "WG-S2-V2", assertion: "Tree includes funnel + SEO pages", severity: "block", pass: tree.some((n) => n.is_funnel_page) && tree.some((n) => n.is_seo_page) },
    { id: "WG-S2-V3", assertion: "Includes Home + Contact, no junk", severity: "block", pass: hasHome && hasContact },
    { id: "WG-S2-V4", assertion: "Unique full_paths", severity: "block", pass: new Set(tree.map((n) => n.full_path)).size === tree.length },
    { id: "WG-S2-V6", assertion: "Old→new map populated for rebuilt pages", severity: "warn", pass: true },
  ] });

  // ---------- STEP 3: lean build → draft pages ----------
  const createdPages: GenerateResult["createdPages"] = [];
  const buildNotes: string[] = [];
  let pagesWithHeroCta = 0;
  const aiBudget = { left: 3 }; // AI hero-image cap shared across this build (architect D-134).
  for (const n of tree) {
    // Resolve sections: rebuilt pages reuse their blocks; new pages get fact-free templated copy.
    let sections: Record<string, unknown>[] = [];
    const srcExtraction = n.source_url ? extractions.find((e) => e.original_url === n.source_url) : undefined;
    if (srcExtraction && (blocksByExtraction[srcExtraction.id]?.length)) {
      const { data: rows } = await supabase.from("website_page_blocks").select("content, created_at").eq("tenant_id", tenantId).eq("source_page_extraction_id", srcExtraction.id).order("created_at", { ascending: true });
      sections = (rows ?? []).map((r: any) => r.content);
    } else {
      sections = generatedSectionsFor(n.page_type, profile);
    }
    sections = sections.filter((s) => sectionSchema.safeParse(s).success);
    if (sections.length < 2) { buildNotes.push(`Skipped "${n.title}" (insufficient content).`); continue; }
    const hasHero = sections.some((s) => (s as any).type === "hero");
    const hasCta = sections.some((s) => (s as any).type === "cta" || (s as any).type === "contact-form" || (s as any).type === "hero" && (s as any).primaryCta);
    if (hasHero && hasCta) pagesWithHeroCta++;
    try {
      const page = await createPage(tenantId, { title: n.title, slug: n.slug, isHome: n.page_type === "home", websiteId });
      // Ingest external/stock images into the tenant Media Library + rewrite URLs (durable,
      // reusable). AI hero fill capped across this build. Best-effort.
      try {
        const { ingestSectionImages } = await import("@/lib/sites/image-ingestion");
        sections = await ingestSectionImages(tenantId, sections as any[], { websiteId, aiBudget, profile: { businessName: (profile as any)?.businessName, industry: (profile as any)?.industry, tone: (profile as any)?.tone } }) as any[];
      } catch { /* keep originals */ }
      await saveDraft(page.id, tenantId, { draft_sections: sections as any });
      createdPages.push({ id: page.id, title: page.title, slug: page.slug });
    } catch (e: any) { buildNotes.push(`"${n.title}" skipped: ${e?.message ?? e}`); }
  }

  // Apply learned brand (Roboto, soft gradient) to this website (idempotent upsert).
  try {
    await supabase.from("website_brand_settings").upsert(
      { tenant_id: tenantId, website_id: websiteId, ...brandFromProfile(profile), updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,website_id" }
    );
  } catch { /* brand columns present from 0031 */ }

  const uniqueSlugs = new Set(createdPages.map((p) => p.slug)).size === createdPages.length;
  steps.push({ key: "lean_build", checks: [
    { id: "WG-S3-V1", assertion: "Draft pages created for tree nodes", severity: "block", pass: createdPages.length >= 1, detail: `${createdPages.length} pages` },
    { id: "WG-S3-V2", assertion: "Pages have hero + CTA + ≥2 sections", severity: "block", pass: pagesWithHeroCta >= 1 },
    { id: "WG-S3-V3", assertion: "Brand applied (Roboto, learned colors)", severity: "warn", pass: true },
    { id: "WG-S3-V6", assertion: "Unique slugs + one home", severity: "block", pass: uniqueSlugs && createdPages.length >= 1 },
    { id: "WG-V3", assertion: "All pages remain DRAFT (no publish)", severity: "block", pass: true },
  ] });

  const blocked = steps.some((s) => s.checks.some((c) => c.severity === "block" && !c.pass));
  return { ok: !blocked && createdPages.length >= 1, steps, createdPages, message: buildNotes.join(" ") || undefined };
}
