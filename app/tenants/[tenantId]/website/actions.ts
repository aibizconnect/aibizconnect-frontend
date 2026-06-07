"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { imagenGenerateAndImport, imageGenEnabled as aiImageGenEnabled, hasKey as aiHasImageKey } from "@/lib/ai/generateAiImages";
import {
  sectionSchema,
  sectionSchemas,
  sectionTypes,
  defaultContentFor,
  type SectionType,
} from "@/lib/sections/schemas";
import {
  deepMerge,
  resolveTheme,
  mergeBrandRows,
  validateThemePatch,
  type ThemeTokens,
} from "@/lib/sections/theme";
import { getCurrentUserId } from "@/lib/auth/current-user";
import type { SitePreviewPage } from "@/lib/agent/website-generator";
import { canUseFeature, FEATURES } from "@/lib/entitlements";
import { getPrimaryWebsite, createWebsite } from "./website-actions";
import { listPopups, savePopup, deletePopup, type Popup, type PopupContent } from "@/lib/popups";

/**
 * Resolve the website to scope by. Returns null when the websites table isn't live
 * yet (synthetic primary) — callers then fall back to tenant-scoped behavior, so
 * everything works before AND after the 0016 migration (Copilot's runtime check).
 */
async function effectiveWebsiteId(tenantId: string, websiteId?: string): Promise<string | null> {
  const primary = await getPrimaryWebsite(tenantId);
  if (primary.synthetic) return null;        // table not migrated → scoping off
  return websiteId || primary.id;            // explicit website, else the primary
}

export interface ClonedPage {
  id: string;
  title: string;
  slug: string;
  order_index: number;
}

// AUTH NOTE (same as useTemplate): this app uses a custom JWT + external backend
// for tenant scoping, NOT Supabase Auth, so we do not guard these with
// supabase.auth.getUser() (it would always be null). Tenant authorization is
// the external backend's responsibility for now; a future phase can move these
// mutations behind it or verify the JWT server-side.

// ---------------------------------------------------------------------------
// AI-assisted section generation (Step 30).
// PLUGGABLE MODEL: uses OPENAI_API_KEY if present, else a deterministic local
// generator (so the feature works without an AI key). All ops write to
// draft_sections only. Output is always validated against the Zod schemas.
// ---------------------------------------------------------------------------

function pickType(prompt: string): SectionType {
  const p = prompt.toLowerCase();
  if (/testimonial|review|quote/.test(p)) return "testimonials";
  if (/feature|benefit/.test(p)) return "features";
  if (/listing|propert|product|catalog/.test(p)) return "listings";
  if (/contact|form|reach|email us/.test(p)) return "contact-form";
  if (/cta|call to action|sign ?up|get started|subscribe/.test(p)) return "cta";
  return "hero";
}

/** Deterministic placeholder generator (no AI key). Returns valid content. */
function stubGenerate(prompt: string, existing?: any): any {
  const type: SectionType = existing?.type ?? pickType(prompt);
  const content: any = existing
    ? JSON.parse(JSON.stringify(existing))
    : defaultContentFor(type);
  const title = prompt.trim().slice(0, 60) || content.heading;
  if ("heading" in content) content.heading = title;
  if ("subheading" in content) content.subheading = prompt.trim();
  return content;
}

/**
 * Call the section-generation model. If OPENAI_API_KEY is set, ask the model
 * for strict section JSON; otherwise fall back to the deterministic stub.
 * Returns a section CONTENT object (includes its own `type`).
 */
async function generateContent(
  prompt: string,
  theme: ThemeTokens,
  existing?: any
): Promise<any> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return stubGenerate(prompt, existing);

  const system = [
    "You generate website section content as STRICT JSON.",
    "Allowed section types: " + sectionTypes.join(", ") + ".",
    "Output ONLY a JSON object of the form {\"type\": <one of the allowed>, \"content\": { ... }} matching the section's schema. No prose.",
    "Use semantic theme tokens (primary/accent/etc.) conceptually; do NOT output raw hex colors — sections never store colors.",
    "Theme context: " + JSON.stringify(theme),
    existing ? "Rewrite this existing section, keeping its type: " + JSON.stringify(existing) : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}`);
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    // Accept either {type, content} or a bare content object.
    return parsed.content && parsed.type
      ? { type: parsed.type, ...parsed.content }
      : parsed;
  } catch {
    // Network/parse failure -> safe fallback so the action still succeeds.
    return stubGenerate(prompt, existing);
  }
}

function validateGenerated(content: any): SectionType {
  const type = content?.type;
  if (!type || !sectionTypes.includes(type)) {
    throw new Error("AI returned an unknown or missing section type.");
  }
  const parsed = sectionSchemas[type as SectionType].safeParse(content);
  if (!parsed.success) {
    throw new Error(
      "AI returned invalid section content: " +
        parsed.error.issues.map((i) => i.message).join("; ")
    );
  }
  return type as SectionType;
}

async function loadDraftBase(
  supabase: any,
  tenantId: string,
  pageId: string
): Promise<any[]> {
  const { data: page } = await supabase
    .from("website_pages")
    .select("draft_sections")
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();
  const draft = page?.draft_sections;
  if (Array.isArray(draft) && draft.length > 0) return draft;
  const { data: rows } = await supabase
    .from("website_page_sections")
    .select("content, order_index")
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId)
    .order("order_index");
  return (rows ?? []).map((r: any) => r.content);
}

/** Generate a new section from a prompt; appends to draft_sections. */
export async function generateSectionAI(
  pageId: string,
  tenantId: string,
  prompt: string
): Promise<any[]> {
  const theme = await getTheme(tenantId);
  const content = await generateContent(prompt, theme);
  validateGenerated(content);

  const supabase = createSupabaseServiceClient();
  const base = await loadDraftBase(supabase, tenantId, pageId);
  const next = [...base, content];
  await supabase
    .from("website_pages")
    .update({ draft_sections: next })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);
  return next;
}

/** Rewrite an existing draft section with AI; replaces draft_sections[index]. */
export async function rewriteSectionAI(
  pageId: string,
  tenantId: string,
  sectionIndex: number,
  prompt: string
): Promise<any[]> {
  const theme = await getTheme(tenantId);
  const supabase = createSupabaseServiceClient();
  const base = await loadDraftBase(supabase, tenantId, pageId);
  if (sectionIndex < 0 || sectionIndex >= base.length) {
    throw new Error("Section not found.");
  }
  const content = await generateContent(prompt, theme, base[sectionIndex]);
  validateGenerated(content);

  const next = [...base];
  next[sectionIndex] = content;
  await supabase
    .from("website_pages")
    .update({ draft_sections: next })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);
  return next;
}

// ---------------------------------------------------------------------------
// AI SEO / GEO auto-fill (Step 25b) — generate all SEO meta from page content.
// Uses the shared LLMProvider (BYOK via KeyStore); falls back to deterministic
// extraction when no key is configured so the button always returns something.
// ---------------------------------------------------------------------------

export interface GeneratedSeo {
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
  keywords: string;
  schema_type: string;
  image_alt: string;
}

/** Recursively pull human-readable text out of a draft section tree. */
function harvestText(node: any, out: string[], cap = 1200): void {
  if (out.join(" ").length > cap) return;
  if (node == null) return;
  if (typeof node === "string") { const t = node.trim(); if (t) out.push(t); return; }
  if (Array.isArray(node)) { for (const n of node) harvestText(n, out, cap); return; }
  if (typeof node === "object") {
    for (const k of ["heading", "subheading", "title", "subtitle", "text", "label", "content", "eyebrow", "quote", "name"]) {
      const v = (node as any)[k];
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
    for (const k of ["children", "items", "columns", "cards", "features", "rows", "cells"]) {
      if ((node as any)[k]) harvestText((node as any)[k], out, cap);
    }
  }
}

const SEO_SCHEMA_TYPES = ["", "LocalBusiness", "Organization", "Article", "Product", "Service", "FAQPage", "Event"];

export async function generateSeoAI(
  pageId: string,
  tenantId: string
): Promise<GeneratedSeo> {
  const supabase = createSupabaseServiceClient();
  const { data: page } = await supabase
    .from("website_pages")
    .select("title, slug, draft_sections")
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();
  if (!page) throw new Error("Page not found.");

  // Brand context (business name) improves the generated copy. Multi-row safe: pick the
  // first row that carries a business name/industry (maybeSingle would null on >1 row).
  const { data: brandRows } = await supabase
    .from("website_brand_settings")
    .select("business_name, name, industry")
    .eq("tenant_id", tenantId);
  const brandList = Array.isArray(brandRows) ? brandRows : [];
  const business = (brandList.find((b: any) => b?.business_name || b?.name) as any)?.business_name
    || (brandList.find((b: any) => b?.name) as any)?.name || "";
  const industry = (brandList.find((b: any) => b?.industry) as any)?.industry || "";

  const parts: string[] = [];
  harvestText(Array.isArray(page.draft_sections) ? page.draft_sections : [], parts);
  const pageText = parts.join(" • ").slice(0, 1400);
  const pageTitle = page.title || "";

  // 1) Try the LLM (returns null when no key is configured).
  let raw: string | null = null;
  try {
    const { llm, stripFences } = await import("@/lib/agent/llm");
    const sys =
      "You are an expert SEO + generative-engine-optimization (GEO) copywriter. " +
      "Given a web page's content, return STRICT JSON with keys: " +
      "seo_title (<=60 chars, compelling, includes the primary keyword), " +
      "seo_description (<=155 chars, benefit-led, includes the keyword), " +
      "focus_keyword (the single best primary keyword phrase), " +
      "keywords (comma-separated, 4-7 relevant terms), " +
      "schema_type (one of: " + SEO_SCHEMA_TYPES.filter(Boolean).join(", ") + "), " +
      "image_alt (concise alt text for the page's social image). " +
      "No markdown, no commentary — JSON only.";
    const user =
      `Business: ${business || "(unknown)"}\nIndustry: ${industry || "(unknown)"}\n` +
      `Page title: ${pageTitle}\nPage URL slug: ${page.slug || ""}\n` +
      `Page content: ${pageText || "(no content yet)"}`;
    raw = await llm.complete({ system: sys, user, jsonObject: true, temperature: 0.5 }, tenantId);
    if (raw) {
      const j = JSON.parse(stripFences(raw));
      const schema = SEO_SCHEMA_TYPES.includes(j.schema_type) ? j.schema_type : "";
      return {
        seo_title: String(j.seo_title ?? "").slice(0, 70),
        seo_description: String(j.seo_description ?? "").slice(0, 165),
        focus_keyword: String(j.focus_keyword ?? ""),
        keywords: String(j.keywords ?? ""),
        schema_type: schema,
        image_alt: String(j.image_alt ?? ""),
      };
    }
  } catch {
    /* fall through to deterministic */
  }

  // 2) Deterministic fallback — derive from page content without an LLM.
  const firstHeading = parts[0] || pageTitle || "Untitled page";
  const titleBase = pageTitle || firstHeading;
  const seo_title = (business ? `${titleBase} | ${business}` : titleBase).slice(0, 60);
  const blurb = parts.slice(1).join(". ").replace(/\s+/g, " ").trim();
  const seo_description = (blurb || `${titleBase}${business ? ` from ${business}` : ""}. Learn more.`).slice(0, 155);
  // crude keyword extraction: most frequent meaningful words
  const stop = new Set("the a an and or to of for in on with your you our we are is be this that get more learn from at by as it".split(" "));
  const freq = new Map<string, number>();
  for (const w of (pageText + " " + pageTitle).toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
  return {
    seo_title,
    seo_description,
    focus_keyword: top[0] ?? "",
    keywords: top.join(", "),
    schema_type: industry ? "LocalBusiness" : "",
    image_alt: firstHeading.slice(0, 100),
  };
}

// ---------------------------------------------------------------------------
// Navigation v2 (Step 32) — named menus + draft-aware items.
// ---------------------------------------------------------------------------

export interface MenuItem {
  id: string;
  label: string;
  url: string | null;
  page_id: string | null;
  hasDraft: boolean;
}

export async function listMenus(tenantId: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("website_navigation")
    .select("menu_key")
    .eq("tenant_id", tenantId);
  const keys = new Set<string>(["primary", "footer"]);
  (data ?? []).forEach((r: any) => r.menu_key && keys.add(r.menu_key));
  return [...keys];
}

export async function getMenu(
  tenantId: string,
  menuKey: string,
  preview = false
): Promise<MenuItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("website_navigation")
    .select("id, label, url, page_id, draft_label, draft_url, draft_page_id, order_index")
    .eq("tenant_id", tenantId)
    .eq("menu_key", menuKey)
    .order("order_index");
  return (data ?? []).map((r: any) => {
    const hasDraft =
      r.draft_label != null || r.draft_url != null || r.draft_page_id != null;
    if (preview && hasDraft) {
      return {
        id: r.id,
        label: r.draft_label ?? r.label,
        url: r.draft_page_id ? null : r.draft_url ?? r.url,
        page_id: r.draft_page_id ?? (r.draft_url ? null : r.page_id),
        hasDraft,
      };
    }
    return { id: r.id, label: r.label, url: r.url, page_id: r.page_id, hasDraft };
  });
}

export async function createNavItem(
  tenantId: string,
  menuKey: string,
  kind: "internal" | "external",
  target: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("website_navigation")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("menu_key", menuKey);
  const { error } = await supabase.from("website_navigation").insert({
    tenant_id: tenantId,
    menu_key: menuKey,
    label: "New link",
    page_id: kind === "internal" ? target : null,
    url: kind === "external" ? target : null,
    order_index: count ?? 0,
  });
  if (error) throw new Error(error.message);
}

export async function updateNavItemDraft(
  tenantId: string,
  itemId: string,
  patch: { draft_label?: string | null; draft_url?: string | null; draft_page_id?: string | null }
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_navigation")
    .update(patch)
    .eq("id", itemId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function publishNavItem(
  tenantId: string,
  itemId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: item } = await supabase
    .from("website_navigation")
    .select("label, url, page_id, draft_label, draft_url, draft_page_id")
    .eq("id", itemId)
    .eq("tenant_id", tenantId)
    .single();
  if (!item) throw new Error("Menu item not found.");

  const newLabel = item.draft_label ?? item.label;
  let newUrl = item.url;
  let newPageId = item.page_id;
  if (item.draft_page_id) {
    newPageId = item.draft_page_id;
    newUrl = null;
  } else if (item.draft_url != null) {
    newUrl = item.draft_url;
    newPageId = null;
  }

  if (newUrl) {
    if (!/^https?:\/\//.test(newUrl)) {
      throw new Error("External URL must start with http(s)://");
    }
  }
  if (newPageId) {
    const { data: pg } = await supabase
      .from("website_pages")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", newPageId)
      .maybeSingle();
    if (!pg) throw new Error("Internal link points to a missing page.");
  }

  const { error } = await supabase
    .from("website_navigation")
    .update({
      label: newLabel,
      url: newUrl,
      page_id: newPageId,
      draft_label: null,
      draft_url: null,
      draft_page_id: null,
    })
    .eq("id", itemId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function reorderMenuItems(
  tenantId: string,
  menuKey: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("website_navigation")
        .update({ order_index: index })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .eq("menu_key", menuKey)
    )
  );
}

// ---------------------------------------------------------------------------
// Global Blocks (Step 31) — reusable, tenant-scoped section blocks with their
// own draft lifecycle. Editing a block updates every page that references it.
// ---------------------------------------------------------------------------

export interface GlobalBlock {
  id: string;
  tenant_id: string;
  name: string;
  type: SectionType;
  content: any;
  draft_content: any | null;
}

export interface ResolvedBlock {
  id: string;
  name: string;
  type: SectionType;
  content: any;
}

export async function listGlobalBlocks(
  tenantId: string
): Promise<GlobalBlock[]> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("website_global_blocks")
    .select("id, tenant_id, name, type, content, draft_content")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GlobalBlock[];
}

export async function createGlobalBlock(
  tenantId: string,
  name: string,
  type: SectionType,
  content: any
): Promise<GlobalBlock> {
  if (!sectionTypes.includes(type)) throw new Error("Unknown section type.");
  if (!sectionSchemas[type].safeParse(content).success) {
    throw new Error("Block content is invalid for its type.");
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_global_blocks")
    .insert({ tenant_id: tenantId, name, type, content })
    .select("id, tenant_id, name, type, content, draft_content")
    .single();
  if (error) throw new Error(error.message);
  return data as GlobalBlock;
}

/** Update a block's DRAFT content (and/or name). Does not touch live content. */
export async function updateGlobalBlock(
  tenantId: string,
  blockId: string,
  patch: { name?: string; draft_content?: any }
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.draft_content !== undefined) update.draft_content = patch.draft_content;
  const { error } = await supabase
    .from("website_global_blocks")
    .update(update)
    .eq("id", blockId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Delete a saved global block (Saved Assets). Also detaches it from any pages that
 *  reference it so nothing renders a dangling block. Service client (RLS-safe). */
export async function deleteGlobalBlock(tenantId: string, blockId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  // Detach from any page references first so nothing renders a dangling block.
  try { await supabase.from("website_page_block_refs").delete().eq("tenant_id", tenantId).eq("block_id", blockId); } catch { /* best-effort */ }
  const { error } = await supabase
    .from("website_global_blocks").delete().eq("id", blockId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Publish a block: validate draft_content, copy -> content, clear draft. */
export async function publishGlobalBlock(
  tenantId: string,
  blockId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: block } = await supabase
    .from("website_global_blocks")
    .select("type, content, draft_content")
    .eq("id", blockId)
    .eq("tenant_id", tenantId)
    .single();
  if (!block) throw new Error("Block not found.");
  const next = block.draft_content ?? block.content;
  const type = block.type as SectionType;
  if (!sectionSchemas[type]?.safeParse(next).success) {
    throw new Error("Cannot publish block: content is invalid.");
  }
  const { error } = await supabase
    .from("website_global_blocks")
    .update({ content: next, draft_content: null, updated_at: new Date().toISOString() })
    .eq("id", blockId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * Save + publish a global block in ONE round-trip. The editor previously called
 * updateGlobalBlock (write draft) THEN publishGlobalBlock (re-select + write content) —
 * three sequential Supabase calls per block, which made saving global Header/Footer slow.
 * This validates the content in-process and writes content + clears the draft in a single
 * UPDATE. Content is provided by the caller (already in memory), so no extra SELECT.
 */
export async function saveGlobalBlockNow(
  tenantId: string,
  blockId: string,
  content: unknown,
  type: SectionType,
): Promise<void> {
  if (!sectionSchemas[type]?.safeParse(content).success) {
    throw new Error("Cannot save block: content is invalid.");
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_global_blocks")
    .update({ content, draft_content: null, updated_at: new Date().toISOString() })
    .eq("id", blockId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * List the pages that REFERENCE the given global block(s) — i.e. the pages that a
 * global Header/Footer edit will change. Powers the "this affects N pages" consent
 * modal. Returns distinct page titles (live or draft title), ordered.
 */
export async function getPagesUsingBlocks(
  tenantId: string,
  blockIds: string[]
): Promise<{ id: string; title: string }[]> {
  if (!blockIds.length) return [];
  const supabase = createSupabaseServiceClient();
  const { data: refs } = await supabase
    .from("website_page_block_refs")
    .select("page_id")
    .eq("tenant_id", tenantId)
    .in("block_id", blockIds);
  const pageIds = Array.from(new Set((refs ?? []).map((r: any) => r.page_id)));
  if (!pageIds.length) return [];
  const { data: pages } = await supabase
    .from("website_pages")
    .select("id, title, draft_title, order_index")
    .eq("tenant_id", tenantId)
    .in("id", pageIds)
    .order("order_index", { ascending: true });
  return (pages ?? []).map((p: any) => ({ id: p.id, title: p.draft_title || p.title }));
}

export async function attachBlockToPage(
  pageId: string,
  tenantId: string,
  blockId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase
    .from("website_page_block_refs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId);
  const { error } = await supabase.from("website_page_block_refs").insert({
    tenant_id: tenantId,
    page_id: pageId,
    block_id: blockId,
    order_index: count ?? 0,
  });
  if (error) throw new Error(error.message);
}

/**
 * Make a single-section Global Block (e.g. a legacy `cta` Footer) EDITABLE by converting
 * it into a 1-column row whose pieces become individually-editable elements (preserving
 * the existing text). Header/footer built by old scripts were single sections; this lets
 * the tenant edit them like any row. No-op if it's already a row.
 */
export async function makeGlobalEditable(tenantId: string, blockId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: blk } = await supabase
    .from("website_global_blocks")
    .select("name, content")
    .eq("id", blockId).eq("tenant_id", tenantId).single();
  if (!blk) return { ok: false, error: "Block not found." };
  const c: any = blk.content ?? {};
  if (c.type === "row") return { ok: true }; // already editable

  const kids: any[] = [];
  if (c.heading) kids.push({ type: "heading", level: "h3", text: c.heading, align: "center", _name: "Brand" });
  if (c.subheading) kids.push({ type: "text", text: c.subheading, align: "center", _name: "Copyright" });
  if (c.body) kids.push({ type: "text", text: c.body, align: "center", _name: "Text" });
  if (c.cta?.label) kids.push({ type: "button", label: c.cta.label, href: c.cta.href || "#", _name: "Button", align: "center" });
  if (!kids.length) kids.push({ type: "text", text: blk.name || "Footer", align: "center" });

  const row = {
    type: "row", columns: 1, contentWidth: "boxed", _name: blk.name || "Footer",
    _style: c._style ?? {}, children: [kids],
  };
  const { error } = await supabase
    .from("website_global_blocks")
    .update({ type: "row", content: row, draft_content: row, updated_at: new Date().toISOString() })
    .eq("id", blockId).eq("tenant_id", tenantId);
  return { ok: !error, error: error?.message };
}

export async function detachBlockFromPage(
  pageId: string,
  tenantId: string,
  blockId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_page_block_refs")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId)
    .eq("block_id", blockId);
  if (error) throw new Error(error.message);
}

/**
 * Resolve the global blocks attached to a page, in ref order. preview=true
 * resolves each block to its draft_content (falling back to content).
 */
export async function getPageBlocks(
  pageId: string,
  tenantId: string,
  preview = false
): Promise<ResolvedBlock[]> {
  const supabase = createSupabaseServiceClient();
  const { data: refs } = await supabase
    .from("website_page_block_refs")
    .select("block_id, order_index")
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId)
    .order("order_index");
  if (!refs || refs.length === 0) return [];

  const ids = refs.map((r: any) => r.block_id);
  const { data: blocks } = await supabase
    .from("website_global_blocks")
    .select("id, name, type, content, draft_content")
    .eq("tenant_id", tenantId)
    .in("id", ids);

  const byId = new Map((blocks ?? []).map((b: any) => [b.id, b]));
  return refs
    .map((r: any) => byId.get(r.block_id))
    .filter(Boolean)
    .map((b: any) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      content: preview ? b.draft_content ?? b.content : b.content,
    }));
}

// ---------------------------------------------------------------------------
// Theme tokens (Step 29) — colors/fonts/radii/spacing on website_brand_settings.
// ---------------------------------------------------------------------------

/**
 * Resilient tenant-level read of the brand `theme` jsonb. A tenant can have MULTIPLE brand
 * rows (0019 per-website) — `.maybeSingle()` NULLS OUT on >1 row, which would make site
 * settings / background / occasions read as EMPTY and, on the next merge-save, WIPE keys that
 * actually live on another row. Fetch all rows and deep-merge their theme (later rows win) so
 * every saved key is visible regardless of which row holds it. Single-row tenants: unchanged.
 */
async function readTenantTheme(supabase: any, tenantId: string): Promise<any> {
  const { data: rows } = await supabase
    .from("website_brand_settings").select("theme").eq("tenant_id", tenantId);
  const list = Array.isArray(rows) ? rows : [];
  let theme: any = {};
  for (const r of list) if (r?.theme && typeof r.theme === "object") theme = deepMerge(theme, r.theme);
  return theme;
}

/**
 * Option A (Copilot canonical): read the brand `theme` for an EXACT website when a
 * websiteId is given (ensuring its row exists first), else the tenant-merged theme.
 * Every website-scoped read/write goes through this + writeScopedTheme so sites are
 * fully isolated — no cross-site bleed.
 */
async function readScopedTheme(supabase: any, tenantId: string, websiteId?: string | null): Promise<any> {
  if (websiteId) {
    await ensureBrandRow(tenantId, websiteId);
    const { data } = await supabase
      .from("website_brand_settings").select("theme")
      .eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
    return (data?.theme && typeof data.theme === "object") ? data.theme : {};
  }
  return readTenantTheme(supabase, tenantId);
}

/** Write the brand `theme` to the EXACT website row (Option A) when websiteId is given,
 *  else the tenant-level row (legacy/admin). Throws on error. */
async function writeScopedTheme(supabase: any, tenantId: string, websiteId: string | null | undefined, theme: any): Promise<void> {
  const row = websiteId
    ? await supabase.from("website_brand_settings").upsert({ tenant_id: tenantId, website_id: websiteId, theme }, { onConflict: "tenant_id,website_id" })
    : await supabase.from("website_brand_settings").upsert({ tenant_id: tenantId, theme });
  if (row.error) throw new Error(row.error.message);
}

/**
 * Return the resolved theme. WEBSITE-AWARE (Copilot ruling D): when a websiteId is
 * given and a brand row exists for it, that wins; otherwise we fall back to the
 * tenant's row (single-website tenants are unaffected — their one row is tagged with
 * the primary website during the 0017 backfill).
 */
export async function getTheme(tenantId: string, websiteId?: string): Promise<ThemeTokens> {
  const supabase = createSupabaseServiceClient();
  const cols = "primary_color, secondary_color, accent_color, font_heading, font_body, theme";
  if (websiteId) {
    const { data: bySite } = await supabase
      .from("website_brand_settings").select(cols).eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
    if (bySite) return resolveTheme(bySite);
    // Option A self-heal: no exact row yet → seed one from the tenant's merged brand
    // so future reads/writes are website-scoped (no cross-site bleed). Best-effort.
    await ensureBrandRow(tenantId, websiteId);
  }
  const { data: rows } = await supabase
    .from("website_brand_settings").select(cols).eq("tenant_id", tenantId);
  return resolveTheme(mergeBrandRows(Array.isArray(rows) ? rows : []));
}

/**
 * Option A (Copilot canonical): guarantee an exact brand row exists for (tenant,
 * website). If absent, seed it from the tenant's merged brand so the new website
 * inherits the current look once, then diverges independently. Idempotent & safe to
 * call pre-0019 (composite index) — falls back to a plain insert on conflict error.
 */
export async function ensureBrandRow(tenantId: string, websiteId: string): Promise<void> {
  if (!websiteId) return;
  const supabase = createSupabaseServiceClient();
  const { data: existing } = await supabase
    .from("website_brand_settings").select("id")
    .eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
  if (existing) return;
  // Seed from the merged tenant brand (one-time inheritance), then scope it.
  const { data: rows } = await supabase
    .from("website_brand_settings")
    .select("primary_color, secondary_color, accent_color, font_heading, font_body, theme")
    .eq("tenant_id", tenantId);
  const merged = mergeBrandRows(Array.isArray(rows) ? rows : []) as any;
  const seed: any = { tenant_id: tenantId, website_id: websiteId, theme: merged.theme ?? {} };
  for (const c of ["primary_color", "secondary_color", "accent_color", "font_heading", "font_body"]) {
    if (merged[c] != null) seed[c] = merged[c];
  }
  try {
    await supabase.from("website_brand_settings").upsert(seed, { onConflict: "tenant_id,website_id" });
  } catch {
    try { await supabase.from("website_brand_settings").insert(seed); } catch { /* race or pre-0019 — non-fatal */ }
  }
}

/**
 * Backfill: ensure every existing website has its own brand row (Option A migration
 * step). Returns how many rows were created. Admin/maintenance — call once after 0019.
 */
export async function backfillBrandRows(tenantId: string): Promise<{ created: number }> {
  const supabase = createSupabaseServiceClient();
  const { data: sites } = await supabase.from("websites").select("id").eq("tenant_id", tenantId);
  let created = 0;
  for (const s of sites ?? []) {
    const { data: has } = await supabase
      .from("website_brand_settings").select("id")
      .eq("tenant_id", tenantId).eq("website_id", (s as any).id).maybeSingle();
    if (!has) { await ensureBrandRow(tenantId, (s as any).id); created++; }
  }
  return { created };
}

/**
 * Save the legacy brand columns (colors/fonts/tone) via the SERVICE client.
 * The browser client is blocked by RLS on website_brand_settings, so panels must
 * write through here or the change is silently dropped.
 */
export async function updateBrandColumns(
  tenantId: string,
  patch: Partial<{
    primary_color: string; secondary_color: string; accent_color: string;
    font_heading: string; font_body: string; tone: string; logo_url: string;
  }>,
  websiteId?: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (websiteId) await ensureBrandRow(tenantId, websiteId);
  const row = websiteId
    ? await supabase.from("website_brand_settings").upsert({ tenant_id: tenantId, website_id: websiteId, ...patch }, { onConflict: "tenant_id,website_id" })
    : await supabase.from("website_brand_settings").upsert({ tenant_id: tenantId, ...patch });
  if (row.error) throw new Error(row.error.message);
}

/**
 * "Reset all text to Typography": strip every per-element text-style override
 * (font family/size/weight/italic/spacing/line-height/transform) from all text
 * elements across the tenant's page DRAFTS, so they all follow the global role
 * defaults again. Keeps content, _role, alignment, color, etc. Returns the count.
 */
export async function resetTextStyles(tenantId: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const PROPS = ["fontFamily", "fontSize", "fontWeight", "italic", "letterSpacing", "lineHeight", "textTransform"];
  const TYPES = new Set(["heading", "subheading", "text", "button"]);
  let count = 0;
  const strip = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (TYPES.has(n.type)) for (const p of PROPS) if (p in n) { delete n[p]; count++; }
    for (const k of ["children", "items", "columns", "cards", "rows", "cells"]) {
      if (n[k]) (Array.isArray(n[k]) ? n[k] : []).forEach((c: any) => (Array.isArray(c) ? c.forEach(strip) : strip(c)));
    }
  };
  const { data: pages } = await supabase.from("website_pages").select("id, draft_sections").eq("tenant_id", tenantId);
  for (const p of pages ?? []) {
    if (!Array.isArray(p.draft_sections)) continue;
    const before = count;
    p.draft_sections.forEach(strip);
    if (count > before) await supabase.from("website_pages").update({ draft_sections: p.draft_sections }).eq("tenant_id", tenantId).eq("id", p.id);
  }
  return count;
}

/**
 * Replace the typography role map (and uploaded custom fonts) wholesale. Uses
 * REPLACE (not deep-merge) so clearing a per-role property — e.g. toggling Bold
 * off — actually removes it. Service client (browser writes are RLS-blocked).
 */
export async function saveTypography(
  tenantId: string,
  payload: { typography: Record<string, unknown>; customFonts?: unknown[] },
  websiteId?: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const theme: any = { ...(await readScopedTheme(supabase, tenantId, websiteId)) };
  theme.typography = payload.typography;
  if (payload.customFonts !== undefined) theme.customFonts = payload.customFonts;
  await writeScopedTheme(supabase, tenantId, websiteId, theme);
}

/** Read the site background (an ElementStyle stored in theme.pageBackground). */
export async function getSiteBackground(tenantId: string, websiteId?: string): Promise<Record<string, unknown> | null> {
  const supabase = createSupabaseServiceClient();
  const theme: any = await readScopedTheme(supabase, tenantId, websiteId);
  const bg = theme.pageBackground;
  return bg && typeof bg === "object" ? bg : null;
}

/** Save the site background (behind all sections). Merged into theme.pageBackground;
 *  pass null/empty to clear it. Service client (browser writes are RLS-blocked). */
export async function saveSiteBackground(tenantId: string, style: Record<string, unknown> | null, websiteId?: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const theme: any = { ...(await readScopedTheme(supabase, tenantId, websiteId)) };
  if (style && Object.keys(style).length) theme.pageBackground = style;
  else delete theme.pageBackground;
  await writeScopedTheme(supabase, tenantId, websiteId, theme);
}

// ---- Global Site Settings (stored in website_brand_settings.theme.site) ----
export interface SiteSettings {
  siteName?: string;
  language?: string;        // e.g. "en", "fr"
  timezone?: string;
  headScripts?: string;     // injected near top of <head>/body (analytics, pixels)
  footerScripts?: string;   // injected before </body>
  ga4Id?: string;           // convenience: Google Analytics 4 measurement ID
  gtmId?: string;           // Google Tag Manager container ID
  metaPixelId?: string;     // Meta (Facebook) Pixel ID
  defaultOgImage?: string;  // fallback social share image
  robotsNoindex?: boolean;  // site-wide noindex (staging)
  faviconUrl?: string;      // browser-tab icon (link rel=icon)
  customDomain?: string;    // desired custom domain (store-only until DNS is provisioned)
  domainPath?: string;      // sub-path the site serves under (e.g. /aibizconnect)
  // Payments & checkout (store-only flags; actual processing requires a connected provider).
  paymentMode?: boolean;    // accept live payments
  requireCard?: boolean;    // require a card even for $0
  // Performance & compliance (store-only flags surfaced to the publish pipeline).
  imageOptimization?: boolean; // optimize/serve images via CDN (default on)
  optimizeJs?: boolean;        // lazy-load custom JS/HTML (default on)
  gdprFonts?: boolean;         // self-host fonts instead of Google Fonts
  cookieConsent?: {
    enabled?: boolean;
    message?: string;
    acceptLabel?: string;
    declineLabel?: string;
    policyUrl?: string;
    position?: "bottom" | "bottom-left" | "bottom-right";
  };
  occasions?: import("@/lib/occasions").OccasionsConfig; // seasonal/holiday effects engine
}

// ── Popups (exit/timer/load lead-capture overlays) ─────────────────────────
// Real backend lives in lib/popups (website_global_blocks, type='popup'). These thin
// server-action wrappers let the editor PopupSettingsPanel do CRUD from the client.
// (import is hoisted to the top of the file — see imports block.)
export async function getPopups(tenantId: string): Promise<Popup[]> {
  return listPopups(tenantId);
}
export async function upsertPopup(tenantId: string, name: string, content: PopupContent, id?: string): Promise<{ ok: boolean; error?: string }> {
  return savePopup({ tenantId, id, name, content });
}
export async function removePopup(tenantId: string, id: string): Promise<{ ok: boolean }> {
  return deletePopup(tenantId, id);
}

/** Read a website's global site settings (theme.site). Website-scoped (Option A) when a
 *  websiteId is given — so domain/favicon/etc. don't bleed across a tenant's sites. */
export async function getSiteSettings(tenantId: string, websiteId?: string): Promise<SiteSettings> {
  const supabase = createSupabaseServiceClient();
  const theme: any = await readScopedTheme(supabase, tenantId, websiteId);
  return (theme.site && typeof theme.site === "object" ? theme.site : {}) as SiteSettings;
}

/** Merge-save global site settings into theme.site, website-scoped when websiteId given. */
export async function saveSiteSettings(tenantId: string, patch: Partial<SiteSettings>, websiteId?: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const theme: any = { ...(await readScopedTheme(supabase, tenantId, websiteId)) };
  theme.site = { ...(theme.site && typeof theme.site === "object" ? theme.site : {}), ...patch };
  await writeScopedTheme(supabase, tenantId, websiteId, theme);
}

/** Read a PAGE's own background (ElementStyle). Falls back to the site-wide default
 *  (theme.pageBackground) when the page has none. Returns { style, scope } so the UI
 *  can show whether it's inheriting the site default or has a per-page override. */
export async function getPageBackground(
  tenantId: string,
  pageId: string
): Promise<{ style: Record<string, unknown> | null; scope: "page" | "site" | "none" }> {
  const supabase = createSupabaseServiceClient();
  // Page-level (column may not exist until migration 0024 is applied → ignore error).
  try {
    const { data, error } = await supabase
      .from("website_pages")
      .select("page_background")
      .eq("tenant_id", tenantId)
      .eq("id", pageId)
      .maybeSingle();
    if (!error) {
      const bg = (data as any)?.page_background;
      if (bg && typeof bg === "object" && Object.keys(bg).length) return { style: bg, scope: "page" };
    }
  } catch { /* column not applied yet */ }
  // Fall back to the site-wide default.
  const site = await getSiteBackground(tenantId);
  return site ? { style: site, scope: "site" } : { style: null, scope: "none" };
}

/** Save a PAGE's own background. Pass null/empty to clear (the page then inherits the
 *  site-wide default again). Service client (browser writes are RLS-blocked). */
export async function savePageBackground(
  tenantId: string,
  pageId: string,
  style: Record<string, unknown> | null
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const value = style && Object.keys(style).length ? style : null;
  const { error } = await supabase
    .from("website_pages")
    .update({ page_background: value })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);
  if (error) {
    if (/page_background/.test(error.message) || /column .* does not exist/i.test(error.message)) {
      throw new Error("Per-page backgrounds need migration 0024 (page_background). Please run it, then try again.");
    }
    throw new Error(error.message);
  }
}

/** Fetch a single page's editor meta by id (service-role, so it reads DRAFT/private
 *  pages too — e.g. funnel-step pages that RLS hides from the browser client). */
export async function getPageForEditor(
  tenantId: string,
  pageId: string
): Promise<{ id: string; title: string; slug: string; is_public: boolean; website_id: string | null } | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("website_pages")
    .select("id, title, slug, is_public, draft_title, draft_slug, website_id")
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: (data as any).draft_title ?? data.title,
    slug: (data as any).draft_slug ?? data.slug,
    is_public: !!data.is_public,
    website_id: (data as any).website_id ?? null,
  };
}

/** Deep-merge a validated patch into the tenant's theme jsonb. */
export async function updateTheme(
  tenantId: string,
  patch: Record<string, unknown>,
  websiteId?: string
): Promise<ThemeTokens> {
  validateThemePatch(patch);
  const supabase = createSupabaseServiceClient();
  const current = await readScopedTheme(supabase, tenantId, websiteId);
  const mergedTheme = deepMerge(current, patch);
  await writeScopedTheme(supabase, tenantId, websiteId, mergedTheme);
  return resolveTheme({ theme: mergedTheme });
}

/**
 * Create a brand-new blank page for a tenant (Builder-Agent support, Cycle 2).
 * Inserts into website_pages using the EXISTING schema only (zero DDL): live
 * title/slug/order_index/is_home plus initialized draft_* fields. order_index is
 * computed from the tenant's current page count. New pages start unpublished
 * (is_public defaults to false). If isHome is true, any other home page for the
 * tenant is demoted first, preserving the "one home per tenant" rule.
 *
 * Returns the new page id (needed by downstream saveDraft/publish/attach steps).
 */
/**
 * Ensure the tenant has a single Header and Footer global block (single source of
 * truth). Creates sensible defaults the first time. Returns their ids so a new
 * page can REFERENCE them (never copy). Idempotent.
 */
async function ensureGlobalBlocks(tenantId: string, tenantName: string, websiteId?: string | null): Promise<{ headerId: string; footerId: string }> {
  const supabase = createSupabaseServiceClient();
  let q = supabase.from("website_global_blocks").select("id, name, website_id").eq("tenant_id", tenantId);
  if (websiteId) q = q.eq("website_id", websiteId);
  const { data: existing } = await q;
  const byName = (re: RegExp) => (existing ?? []).find((b: any) => re.test(b.name))?.id as string | undefined;
  const stamp = websiteId ? { website_id: websiteId } : {};

  let headerId = byName(/header/i);
  let footerId = byName(/footer/i);

  if (!headerId) {
    const headerContent = {
      type: "row", columns: 3, gap: 16, valign: "center", contentWidth: "boxed", widths: [0.22, 0.62, 0.16],
      _name: "Header",
      children: [
        [{ type: "image", url: "/logos/wordmark-blue.png", alt: tenantName, width: 160, align: "left", _name: "Logo" }],
        [{ type: "menu", orientation: "horizontal", align: "center", gap: 18, _name: "Main menu",
          items: [{ label: "Home", href: "/" }] }],
        [{ type: "button", label: "Sign in", href: "/login", variant: "solid", size: "sm", align: "right", _name: "Sign in" }],
      ],
    };
    const { data } = await supabase.from("website_global_blocks")
      .insert({ tenant_id: tenantId, name: "Header", type: "row", content: headerContent, ...stamp }).select("id").single();
    headerId = data?.id;
  }
  if (!footerId) {
    const footerContent = {
      type: "row", columns: 1, contentWidth: "boxed", _name: "Footer",
      children: [[{ type: "text", text: `© ${tenantName}. All rights reserved.`, align: "center", color: "#64748b", _name: "Copyright" }]],
    };
    const { data } = await supabase.from("website_global_blocks")
      .insert({ tenant_id: tenantId, name: "Footer", type: "row", content: footerContent, ...stamp }).select("id").single();
    footerId = data?.id;
  }
  return { headerId: headerId!, footerId: footerId! };
}

/**
 * Create a new WEBSITE for a tenant and scaffold its first Home page (Header ref +
 * Hero + Body + Footer ref, on the new website's theme/SEO). Returns the website id
 * so the UI can open its editor. Requires the 0016 migration (else createWebsite
 * throws a friendly message).
 */
export async function createWebsiteAndHome(tenantId: string, name: string): Promise<{ websiteId: string }> {
  const site = await createWebsite(tenantId, name);
  // Page slugs are currently unique per TENANT (not per website), so a second site's
  // "home" can collide. Fall back to a website-unique slug if "home" is taken.
  try {
    await createPage(tenantId, { title: "Home", slug: "home", isHome: true, websiteId: site.id });
  } catch {
    await createPage(tenantId, { title: "Home", slug: `home-${site.id.slice(0, 8)}`, isHome: true, websiteId: site.id });
  }
  return { websiteId: site.id };
}

export async function createPage(
  tenantId: string,
  input: { title: string; slug: string; isHome?: boolean; websiteId?: string }
): Promise<{ id: string; title: string; slug: string; order_index: number; is_home: boolean }> {
  const title = (input.title ?? "").trim();
  const slug = (input.slug ?? "").trim().toLowerCase();
  if (!title) throw new Error("Page title is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must be lowercase alphanumeric with single hyphens.");
  }

  const supabase = createSupabaseServiceClient();

  // Enforce one home page per tenant: demote any existing home first.
  if (input.isHome) {
    await supabase
      .from("website_pages")
      .update({ is_home: false })
      .eq("tenant_id", tenantId)
      .eq("is_home", true);
  }

  // Next order_index = current page count for this tenant.
  const { count } = await supabase
    .from("website_pages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  // Tenant display name (for default header logo + SEO title).
  const { data: tenant } = await supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const tenantName = (tenant?.name as string) || title;

  // Resolve the website this page belongs to (null until 0016 is live → tenant-scoped).
  const wid = await effectiveWebsiteId(tenantId, input.websiteId);
  let websiteSeoDefaults: Record<string, any> = {};
  if (wid) {
    const { data: site } = await supabase.from("websites").select("seo_defaults").eq("id", wid).maybeSingle();
    if (site?.seo_defaults && typeof site.seo_defaults === "object") websiteSeoDefaults = site.seo_defaults as any;
  }

  // AUTO-SCAFFOLD (Copilot ruling C): every new page is born with a global Header
  // (ref) + Hero + empty Body + global Footer (ref), inherits the tenant theme
  // (applied at render) and seeds SEO from tenant defaults. Drafts only — no publish.
  const heroPreset: any = {
    type: "hero", _name: "Hero",
    heading: title,
    subheading: `Welcome to ${tenantName}.`,
    primaryCta: { label: "Get Started", href: "#" },
    secondaryCta: { label: "Learn More", href: "#" },
  };
  const emptyBody: any = { ...(defaultContentFor("row") as any), _name: "Body" };
  // Seed SEO from the WEBSITE's defaults (Copilot ruling D), then page specifics.
  const draftSeo = {
    ...websiteSeoDefaults,
    title: `${title} — ${tenantName}`,
    description: `${title} · ${tenantName}`,
  };

  const { data, error } = await supabase
    .from("website_pages")
    .insert({
      tenant_id: tenantId,
      ...(wid ? { website_id: wid } : {}),
      title,
      slug,
      order_index: count ?? 0,
      is_home: input.isHome ?? false,
      is_public: false,           // drafts only — never auto-publish
      draft_title: title,
      draft_slug: slug,
      draft_seo: draftSeo,
      draft_sections: [heroPreset, emptyBody],
    })
    .select("id, title, slug, order_index, is_home")
    .single();

  // A unique_slug_per_tenant violation surfaces here as a Postgres error.
  if (error) throw new Error(error.message);

  // Reference (never copy) the tenant's global Header + Footer on this page.
  try {
    const { headerId, footerId } = await ensureGlobalBlocks(tenantId, tenantName, wid);
    await supabase.from("website_page_block_refs").insert([
      { tenant_id: tenantId, page_id: (data as any).id, block_id: headerId, order_index: 0 },
      { tenant_id: tenantId, page_id: (data as any).id, block_id: footerId, order_index: 1 },
    ]);
  } catch {
    // Non-fatal: the page still exists; header/footer can be attached later.
  }

  return data as {
    id: string;
    title: string;
    slug: string;
    order_index: number;
    is_home: boolean;
  };
}

// ---------------------------------------------------------------------------
// GHL-style Website → Pages grid (Cycle 3). Server-action page CRUD so writes
// actually persist (service-role), replacing the old client-side PageList that
// wrote via the anon browser client and was silently blocked by RLS.
// ---------------------------------------------------------------------------

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  is_home: boolean;
  is_public: boolean;
  order_index: number;
  hasDraft: boolean;
}

/** List a tenant's website pages (excludes funnel steps) for the Pages grid. */
export async function listSitePages(tenantId: string, websiteId?: string): Promise<SitePage[]> {
  const supabase = createSupabaseServiceClient();
  const wid = await effectiveWebsiteId(tenantId, websiteId);
  let query = supabase
    .from("website_pages")
    .select("id, title, slug, is_home, is_public, order_index, draft_title, draft_sections")
    .eq("tenant_id", tenantId)
    .is("funnel_id", null);
  // Scope to a website once the column is live (backfill assigned all pages a website).
  if (wid) query = query.eq("website_id", wid);
  const { data } = await query.order("order_index", { ascending: true });
  return (data ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    is_home: !!p.is_home,
    is_public: !!p.is_public,
    order_index: p.order_index ?? 0,
    hasDraft: p.draft_title != null || (Array.isArray(p.draft_sections) && p.draft_sections.length > 0),
  }));
}

/** Delete a page and its sections (service-role; tenant-scoped). */
// Roles that may delete pages without an explicit grant.
const PAGE_DELETE_ROLES = new Set(["owner", "admin", "superadmin"]);

/**
 * Authorize a page deletion (secure-delete guard):
 *  • the page must exist and BELONG to this tenant (ownership / tenant scope),
 *  • the Home page is protected (set another Home first),
 *  • the caller must be an ACTIVE member of the tenant whose role is owner/admin/
 *    superadmin, OR whom an admin has granted the `delete_pages` permission.
 * Fail-safe: if a workspace has no members configured yet (RBAC not seeded), we
 * fall back to the interim posture (allow) rather than lock the owner out.
 * Throws a user-friendly Error when not permitted.
 */
async function assertCanDeletePage(tenantId: string, pageId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();

  // 1) Ownership + existence + Home protection.
  const { data: page } = await supabase
    .from("website_pages")
    .select("id, tenant_id, is_home, title")
    .eq("id", pageId)
    .maybeSingle();
  if (!page) throw new Error("Page not found.");
  if (page.tenant_id !== tenantId) throw new Error("This page belongs to a different workspace — you can only delete your own pages.");
  if (page.is_home) throw new Error("You can't delete the Home page. Set another page as Home first, then delete this one.");

  // 2) Membership + permission.
  const { data: members } = await supabase
    .from("tenant_users")
    .select("user_id, role, status")
    .eq("tenant_id", tenantId);
  const hasRbac = Array.isArray(members) && members.length > 0;
  if (!hasRbac) return; // interim: workspace not yet using member roles — don't lock anyone out

  const userId = await getCurrentUserId();
  const me = userId ? (members as any[]).find((m) => m.user_id === userId && m.status === "active") : null;
  // If the acting identity isn't yet mapped to a workspace member (the JWT↔member
  // wiring is still interim), don't lock them out — ownership + Home protection
  // above already apply. Enforcement below is STRICT for KNOWN members.
  if (!me) return;

  const allowed = PAGE_DELETE_ROLES.has(me.role) || (await canUseFeature(tenantId, userId!, FEATURES.DELETE_PAGES));
  if (!allowed) throw new Error("You don't have permission to delete pages. Ask an admin to grant you delete access.");
}

/**
 * Whether the CURRENT user may delete pages in this workspace (drives the editor UI:
 * only users with delete rights see the small delete affordance; everyone else must
 * ask their admin). Mirrors the membership/role/grant logic in `assertCanDeletePage`,
 * minus the per-page (Home / ownership) checks. Never throws — returns false on doubt.
 */
export async function canDeletePages(tenantId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data: members } = await supabase
      .from("tenant_users").select("user_id, role, status").eq("tenant_id", tenantId);
    const hasRbac = Array.isArray(members) && members.length > 0;
    if (!hasRbac) return true; // interim: RBAC not seeded — don't hide the control from the owner

    const userId = await getCurrentUserId();
    const me = userId ? (members as any[]).find((m) => m.user_id === userId && m.status === "active") : null;
    if (!me) return true; // identity not yet mapped to a member (interim) — keep usable
    // Sole active member is effectively the owner of their own workspace.
    const activeCount = (members as any[]).filter((m) => m.status === "active").length;
    if (activeCount <= 1) return true;
    if (PAGE_DELETE_ROLES.has(me.role)) return true;
    return await canUseFeature(tenantId, userId!, FEATURES.DELETE_PAGES);
  } catch {
    return false;
  }
}

export async function deletePage(pageId: string, tenantId: string): Promise<void> {
  await assertCanDeletePage(tenantId, pageId); // secure-delete guard (ownership + role/permission)
  const supabase = createSupabaseServiceClient();
  await supabase.from("website_page_sections").delete().eq("tenant_id", tenantId).eq("page_id", pageId);
  await supabase.from("website_page_block_refs").delete().eq("tenant_id", tenantId).eq("page_id", pageId);
  const { error } = await supabase.from("website_pages").delete().eq("tenant_id", tenantId).eq("id", pageId);
  if (error) throw new Error(error.message);
}

/**
 * Admin/owner action: grant or revoke a specific user's permission to delete
 * pages in this workspace (writes a user_feature_entitlements override). Only an
 * active owner/admin/superadmin of the tenant may call this.
 */
export async function setPageDeletePermission(tenantId: string, targetUserId: string, allowed: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: members } = await supabase.from("tenant_users").select("user_id, role, status").eq("tenant_id", tenantId);
  if (Array.isArray(members) && members.length > 0) {
    const callerId = await getCurrentUserId();
    const caller = (members as any[]).find((m) => m.user_id === callerId && m.status === "active");
    if (!caller || !PAGE_DELETE_ROLES.has(caller.role)) {
      throw new Error("Only an owner or admin can change page-delete permissions.");
    }
  }
  const { error } = await supabase
    .from("user_feature_entitlements")
    .upsert({ tenant_id: tenantId, user_id: targetUserId, feature_key: FEATURES.DELETE_PAGES, enabled: allowed, source: "tenant_override" },
      { onConflict: "tenant_id,user_id,feature_key" });
  if (error) throw new Error(error.message);
}

/** Rename a page's draft title (and slug). Applied to live on publish. */
export async function renamePageDraft(pageId: string, tenantId: string, title: string): Promise<void> {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_pages")
    .update({ draft_title: title, draft_slug: slug })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);
  if (error) throw new Error(error.message);
}

/** Set a page as the tenant's home page (demotes any existing home). */
export async function setHomePage(pageId: string, tenantId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("website_pages").update({ is_home: false }).eq("tenant_id", tenantId).eq("is_home", true);
  const { error } = await supabase.from("website_pages").update({ is_home: true }).eq("tenant_id", tenantId).eq("id", pageId);
  if (error) throw new Error(error.message);
}

// Draft/publish workflow (Step 28). The editor writes to draft_* fields;
// publishPage copies them into the live fields + website_page_sections.
export interface DraftPatch {
  draft_title?: string | null;
  draft_slug?: string | null;
  draft_seo?: Record<string, unknown>;
  draft_sections?: unknown[];
}

/** Save the editor's in-progress state into the page's draft_* fields. */
/**
 * Load the editor's working sections for a page (service client, so it can read
 * UNPUBLISHED drafts that RLS hides from the browser client). Returns draft_sections
 * when present, else the live published sections.
 */
export async function getEditorSections(pageId: string, tenantId: string): Promise<any[]> {
  const supabase = createSupabaseServiceClient();
  const { data: page } = await supabase
    .from("website_pages")
    .select("draft_sections")
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();
  const draft = page?.draft_sections;
  if (Array.isArray(draft) && draft.length > 0) return draft;
  const { data: rows } = await supabase
    .from("website_page_sections")
    .select("content, order_index")
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId)
    .order("order_index");
  return (rows ?? []).map((r: any) => r.content);
}

export async function saveDraft(
  pageId: string,
  tenantId: string,
  patch: DraftPatch
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_pages")
    .update(patch)
    .eq("id", pageId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

// ---- AI Website Generator (Path B — draft-only, ratified by Copilot) ----

/**
 * STEP 1 — generate a reviewable PLAN PREVIEW from a business brief. Reuses the existing
 * Builder-Agent brain (generatePlan), parses its v1 plan into a page/section outline, and
 * returns it for the UI to show. NO database writes happen here.
 */
export async function generateWebsitePlan(
  tenantId: string, brief: string,
): Promise<{ pages: SitePreviewPage[]; warnings: string[]; source?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please sign in to generate a website.");
  if (!brief || brief.trim().length < 8) throw new Error("Add a short description of the business first.");
  const { generatePlan } = await import("@/lib/agent/builder");
  const r = await generatePlan({ tenantId, role: "website.editor", goal: brief.trim() });
  if (!r.plan) throw new Error(r.error || "Could not generate a plan. Try a more descriptive brief.");
  const { planToSitePreview } = await import("@/lib/agent/website-generator");
  const preview = planToSitePreview(r.plan);
  return { pages: preview.pages, warnings: preview.warnings, source: r.source };
}

export interface WebsiteDraftResult { created: { id: string; title: string; slug: string }[]; notes: string[] }

/**
 * STEP 2 — on the user's confirm, write the previewed pages as DRAFTS (createPage +
 * saveDraft). Hard-coded draft-only: it NEVER publishes, never mutates nav/global settings.
 * Applies the pre-commit sanity filter (max pages/sections, dedupe slugs, one home page).
 */
export async function generateWebsiteDraft(
  tenantId: string, preview: { pages: SitePreviewPage[] },
): Promise<WebsiteDraftResult> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please sign in.");
  const { sanitizeForDraft } = await import("@/lib/agent/website-generator");
  const { pages, notes } = sanitizeForDraft({ pages: preview.pages ?? [], warnings: [] });

  const created: WebsiteDraftResult["created"] = [];
  const usedSlugs = new Set<string>();
  for (const pg of pages) {
    let base = (pg.slug || pg.title || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";
    let slug = base; let n = 2;
    while (usedSlugs.has(slug)) { slug = `${base}-${n++}`.slice(0, 40); }
    usedSlugs.add(slug);
    try {
      const page = await createPage(tenantId, { title: pg.title || "Untitled", slug, isHome: pg.isHome });
      await saveDraft(page.id, tenantId, { draft_sections: pg.sections.map((s) => s.content) as any });
      created.push({ id: page.id, title: page.title, slug: page.slug });
    } catch (e: any) {
      notes.push(`"${pg.title}" was skipped: ${e?.message ?? e}`);
    }
  }
  if (!created.length) throw new Error("No pages were created. " + notes.join(" "));
  return { created, notes };
}

/**
 * Publish a page: copies draft_* -> live (title, slug, seo_*), rebuilds
 * website_page_sections from draft_sections, sets is_public + published_at, and
 * clears the draft_* fields. Validates the effective slug + every section, and
 * refuses to publish on any failure.
 */
export async function publishPage(pageId: string, tenantId: string) {
  const supabase = createSupabaseServiceClient();

  const { data: page } = await supabase
    .from("website_pages")
    .select(
      "title, slug, draft_title, draft_slug, draft_seo, draft_sections"
    )
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();
  if (!page) throw new Error("Page not found.");

  const newTitle = page.draft_title ?? page.title;
  const newSlug = page.draft_slug ?? page.slug;

  if (!SLUG_RE.test(newSlug)) {
    throw new Error(
      "Slug must be lowercase letters, numbers and hyphens (e.g. about-us)."
    );
  }
  const { data: existing } = await supabase
    .from("website_pages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", newSlug)
    .neq("id", pageId)
    .maybeSingle();
  if (existing) throw new Error("Another page already uses this slug.");

  const hasDraftSections =
    Array.isArray(page.draft_sections) && page.draft_sections.length > 0;

  let sectionsToPublish: any[];
  if (hasDraftSections) {
    sectionsToPublish = page.draft_sections as any[];
  } else {
    const { data: liveRows } = await supabase
      .from("website_page_sections")
      .select("content, order_index")
      .eq("tenant_id", tenantId)
      .eq("page_id", pageId)
      .order("order_index");
    sectionsToPublish = (liveRows ?? []).map((r: any) => r.content);
  }

  if (!sectionsToPublish.every((s) => sectionSchema.safeParse(s).success)) {
    throw new Error(
      "Cannot publish: one or more sections are invalid. Fix them and try again."
    );
  }

  // Copy draft SEO (if any) into live seo_* columns.
  const draftSeo: Record<string, any> =
    page.draft_seo && typeof page.draft_seo === "object"
      ? (page.draft_seo as Record<string, any>)
      : {};
  const seoCols = [
    "seo_title",
    "seo_description",
    "seo_image_url",
    "canonical_url",
    "noindex",
    "nofollow",
  ];
  const seoUpdate: Record<string, any> = {};
  for (const k of seoCols) if (k in draftSeo) seoUpdate[k] = draftSeo[k];

  const { error: upErr } = await supabase
    .from("website_pages")
    .update({
      title: newTitle,
      slug: newSlug,
      ...seoUpdate,
      is_public: true,
      published_at: new Date().toISOString(),
      draft_title: null,
      draft_slug: null,
      // Keep the full SEO blob so the live page can render the extended GEO fields
      // (schema type, author, language, focus keyword) — there are no live columns
      // for these, so draft_seo doubles as the applied-SEO store.
      draft_seo: draftSeo,
      draft_sections: [],
    })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);
  if (upErr) throw new Error(upErr.message);

  // Rebuild live sections only when there were draft section changes.
  if (hasDraftSections) {
    await supabase
      .from("website_page_sections")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("page_id", pageId);
    if (sectionsToPublish.length) {
      await supabase.from("website_page_sections").insert(
        sectionsToPublish.map((content, index) => ({
          tenant_id: tenantId,
          page_id: pageId,
          type: (content as any).type,
          content,
          order_index: index,
        }))
      );
    }
  }

  return { published: true as const };
}

/**
 * Duplicate a page as an unpublished draft: "Copy of X" with a unique slug and
 * the source page's current sections copied into draft_sections.
 */
export async function duplicatePage(
  pageId: string,
  tenantId: string
): Promise<{ id: string; title: string; slug: string; is_public: boolean }> {
  const supabase = createSupabaseServiceClient();

  const { data: src } = await supabase
    .from("website_pages")
    .select(
      "title, slug, order_index, seo_title, seo_description, seo_image_url, canonical_url, noindex, nofollow"
    )
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();
  if (!src) throw new Error("Page not found.");

  const { data: liveRows } = await supabase
    .from("website_page_sections")
    .select("content, order_index")
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId)
    .order("order_index");
  const sections = (liveRows ?? []).map((r: any) => r.content);

  // Resolve a unique slug: x-copy, x-copy-2, ...
  const base = `${src.slug}-copy`;
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: ex } = await supabase
      .from("website_pages")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .maybeSingle();
    if (!ex) break;
    slug = `${base}-${n++}`;
  }

  const title = `Copy of ${src.title}`;
  const { data: newPage, error } = await supabase
    .from("website_pages")
    .insert({
      tenant_id: tenantId,
      title,
      slug,
      order_index: (src.order_index ?? 0) + 1,
      is_home: false,
      is_public: false,
      draft_title: title,
      draft_slug: slug,
      draft_seo: {
        seo_title: src.seo_title,
        seo_description: src.seo_description,
        seo_image_url: src.seo_image_url,
        canonical_url: src.canonical_url,
        noindex: src.noindex,
        nofollow: src.nofollow,
      },
      draft_sections: sections,
    })
    .select("id, title, slug, is_public")
    .single();
  if (error) throw new Error(error.message);
  return newPage as {
    id: string;
    title: string;
    slug: string;
    is_public: boolean;
  };
}

// ---------------------------------------------------------------------------
// Media library (Step 27) — tenant-scoped assets in Supabase Storage.
// Requires a public Storage bucket "website-media" + policies (provision in the
// Supabase dashboard). Same deferred-auth posture.
// ---------------------------------------------------------------------------

const MEDIA_BUCKET = "website-media";

/**
 * Ensure the public media bucket exists before any upload. Without this, uploads
 * fail silently (the storage call throws "Bucket not found") and nothing is stored —
 * which is why freshly "uploaded" images never appeared. Idempotent; cached per process.
 */
let _bucketReady = false;
async function ensureMediaBucket(): Promise<void> {
  if (_bucketReady) return;
  const supabase = createSupabaseServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets ?? []).some((b: any) => b.name === MEDIA_BUCKET)) {
    await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
  }
  _bucketReady = true;
}

/**
 * Media source. We derive it from the storage-path folder
 *   tenantId/<source>/<uuid>.<ext>
 * so no DB migration (no `source` column) is required for Phase 1:
 *   upload | ai | canva | stock | system
 * Stock is URL-based (no stored object) — we still record a `tenantId/stock/<uuid>`
 * path purely so the source derives correctly.
 */
export type MediaSource = "upload" | "ai" | "canva" | "stock" | "system";
const MEDIA_SOURCES: MediaSource[] = ["upload", "ai", "canva", "stock", "system"];

export interface MediaItem {
  id: string;
  tenant_id: string;
  url: string;
  storage_path: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  source: MediaSource;   // derived from storage_path folder
  folder?: string;       // alias of source (kept for backward-compat callers)
  folder_id?: string | null; // user folder (media_folders), null = root; undefined pre-migration
  website_id?: string | null; // optional website tag (shared pool, filter not isolation)
  is_system?: boolean;        // owned by the global SYSTEM tenant → read-only (copy-on-use)
  tags?: string[];            // multi-tag categories (0030) — an image can be in several
}

function deriveSource(storagePath: string): MediaSource {
  const seg = (storagePath || "").split("/")[1] || "";
  return (MEDIA_SOURCES as string[]).includes(seg) ? (seg as MediaSource) : "upload";
}
const withMeta = (m: any): MediaItem => {
  const source = deriveSource(m.storage_path);
  return { ...m, source, folder: source };
};

// One-time probe: does website_media have the folder_id column (0021 applied)? Lets us
// stay tolerant — folder features activate automatically once the migration lands.
let _mediaHasFolderId = false; // only memoize TRUE, so it flips on after the migration without a server restart
async function mediaHasFolderId(): Promise<boolean> {
  if (_mediaHasFolderId) return true;
  try {
    const sb = createSupabaseServiceClient();
    const { error } = await sb.from("website_media").select("folder_id").limit(1);
    if (!error) _mediaHasFolderId = true;
  } catch { /* column not present yet */ }
  return _mediaHasFolderId;
}
// Probe: does website_media have the tags column (0030 applied)? Memoize TRUE only.
let _mediaHasTags = false;
async function mediaHasTags(): Promise<boolean> {
  if (_mediaHasTags) return true;
  try {
    const sb = createSupabaseServiceClient();
    const { error } = await sb.from("website_media").select("tags").limit(1);
    if (!error) _mediaHasTags = true;
  } catch { /* column not present yet */ }
  return _mediaHasTags;
}
const MEDIA_COLS = "id, tenant_id, url, storage_path, filename, mime_type, size_bytes, created_at";

/** Upload an image to a tenant folder and record it. `source` decides the folder. */
export async function uploadMedia(
  tenantId: string,
  file: File,
  source: MediaSource = "upload",
  folderId?: string | null,
  websiteId?: string | null
): Promise<MediaItem> {
  await requireTenantAccess(tenantId);
  // GHL parity: accept any file type (images, fonts, PDFs, JSON, etc.).
  const folder: MediaSource = MEDIA_SOURCES.includes(source) ? source : "upload";
  const supabase = createSupabaseServiceClient();
  await ensureMediaBucket();

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const storagePath = `${tenantId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, file, { contentType: file.type });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  const hasFolder = await mediaHasFolderId();
  const row: Record<string, any> = {
    tenant_id: tenantId, url: pub.publicUrl, storage_path: storagePath,
    filename: file.name, mime_type: file.type, size_bytes: file.size,
  };
  if (hasFolder && folderId) row.folder_id = folderId;
  if (hasFolder && websiteId) row.website_id = websiteId;
  const { data, error } = await supabase
    .from("website_media").insert(row)
    .select(hasFolder ? `${MEDIA_COLS}, folder_id, website_id` : MEDIA_COLS)
    .single();
  if (error) throw new Error(error.message);
  return withMeta(data);
}

/** Record a free stock / external image by URL — no storage upload (no cost). */
export async function importStockMedia(tenantId: string, url: string, filename?: string): Promise<MediaItem> {
  await requireTenantAccess(tenantId);
  if (!/^https?:\/\//i.test(url)) throw new Error("Enter a valid http(s) image URL.");
  const supabase = createSupabaseServiceClient();
  const storagePath = `${tenantId}/stock/${crypto.randomUUID()}`; // marker only — no object stored
  const { data, error } = await supabase
    .from("website_media")
    .insert({
      tenant_id: tenantId,
      url,
      storage_path: storagePath,
      filename: filename || url.split("/").pop()?.split("?")[0] || "stock-image",
      mime_type: "image/*",
      size_bytes: null,
    })
    .select("id, tenant_id, url, storage_path, filename, mime_type, size_bytes, created_at")
    .single();
  if (error) throw new Error(error.message);
  return withMeta(data);
}

/** AI-generated image upload (same storage path, source='ai'). */
export async function importAiMedia(tenantId: string, file: File): Promise<MediaItem> {
  return uploadMedia(tenantId, file, "ai");
}

/** Canva import (placeholder — wired like an upload, source='canva'). */
export async function importCanvaMedia(tenantId: string, file: File): Promise<MediaItem> {
  return uploadMedia(tenantId, file, "canva");
}

export interface MediaFilters {
  source?: MediaSource;
  q?: string;
  sort?: "new" | "old" | "name";
  folderId?: string | null; // filter to a folder (null = root); omit = all folders
  websiteId?: string | null; // filter to a website tag; omit = all websites
  includeSystem?: boolean;   // also merge global SYSTEM-tenant assets (read-only)
}

/** List a tenant's media, newest first, with optional source/search/sort/folder/website filters. */
export async function listMedia(tenantId: string, filters?: MediaFilters): Promise<MediaItem[]> {
  const supabase = createSupabaseServiceClient();
  const hasFolder = await mediaHasFolderId();
  const hasTags = await mediaHasTags();
  const cols = `${MEDIA_COLS}${hasFolder ? ", folder_id, website_id" : ""}${hasTags ? ", tags" : ""}`;
  const { data } = await supabase
    .from("website_media")
    .select(cols)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  let items = (data ?? []).map(withMeta);
  // Merge global SYSTEM-tenant assets (read-only) when requested. The tenant SEES them
  // but can't mutate them — using one copies it into their own media (copy-on-use).
  if (filters?.includeSystem && tenantId !== SYSTEM_TENANT_ID) {
    const { data: sys } = await supabase
      .from("website_media")
      .select(cols)
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .order("created_at", { ascending: false });
    items = items.concat((sys ?? []).map((m: any) => ({ ...withMeta(m), is_system: true })));
  }
  if (hasFolder && filters && "folderId" in filters) {
    items = items.filter((m) => (m.folder_id ?? null) === (filters.folderId ?? null));
  }
  if (hasFolder && filters?.websiteId) {
    items = items.filter((m) => (m.website_id ?? null) === filters.websiteId);
  }
  if (filters?.source) items = items.filter((m) => m.source === filters.source);
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    items = items.filter((m) => (m.filename ?? "").toLowerCase().includes(q));
  }
  if (filters?.sort === "old") items = items.slice().reverse();
  else if (filters?.sort === "name") items = items.slice().sort((a, b) => (a.filename ?? "").localeCompare(b.filename ?? ""));
  return items;
}

/**
 * Copy-on-use (Copilot ruling): copy a global SYSTEM asset into a tenant's own media so
 * they can edit/crop/recolor/rename/move/delete it WITHOUT touching the SYSTEM original.
 * Copies the storage object into the tenant's `uploads/` folder and inserts a tenant row.
 * Returns the new tenant-owned MediaItem.
 */
export async function importSystemAssetToTenant(tenantId: string, systemMediaId: string): Promise<MediaItem> {
  const supabase = createSupabaseServiceClient();
  const { data: src, error: e1 } = await supabase
    .from("website_media").select("*").eq("tenant_id", SYSTEM_TENANT_ID).eq("id", systemMediaId).single();
  if (e1 || !src) throw new Error("System asset not found.");

  await ensureMediaBucket();
  const ext = (src.filename ?? "asset").split(".").pop() || "png";
  const destPath = `${tenantId}/uploads/system-${systemMediaId.slice(0, 8)}-${Date.now()}.${ext}`;
  // Copy the underlying storage object (system original is never mutated).
  const { error: copyErr } = await supabase.storage.from("website-media").copy(src.storage_path, destPath);
  if (copyErr) throw new Error(copyErr.message);
  const { data: pub } = supabase.storage.from("website-media").getPublicUrl(destPath);

  const { data: row, error: e2 } = await supabase.from("website_media").insert({
    tenant_id: tenantId, url: pub.publicUrl, storage_path: destPath,
    filename: src.filename, mime_type: src.mime_type, size_bytes: src.size_bytes,
  }).select(MEDIA_COLS).single();
  if (e2 || !row) throw new Error(e2?.message ?? "Could not import system asset.");
  return withMeta(row);
}

/**
 * Storage quota for a tenant (Copilot Q2). Hardcoded 1 GB today but routed through a
 * function so it can later read per-plan limits from tenant_feature_policies/entitlements
 * without touching the meter UI.
 */
export async function getTenantQuota(_tenantId: string): Promise<{ maxBytes: number }> {
  return { maxBytes: 1_000_000_000 };
}

// ---- Platform-admin: SYSTEM library housekeeping (declutter) ----

/** True when the current user is a platform admin (founder/allowlist). Client-safe boolean. */
export async function amIPlatformAdmin(): Promise<boolean> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  return isPlatformAdmin();
}

/** True when the user may MANAGE the System library (bulk upload/describe): admin OR staff. */
export async function amISystemManager(): Promise<boolean> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  return canManageSystemLibrary();
}

/** True when the EFFECTIVE user is the owner — gates destructive System ops in the UI. */
export async function amISuperAdmin(): Promise<boolean> {
  const { isPlatformSuperAdmin } = await import("@/lib/auth/platform-admin");
  return isPlatformSuperAdmin();
}

/**
 * Diagnostic: what identity does the server see for the current request? Lets the UI show
 * "signed in as X · admin: yes/no" so admin-gating issues are visible, not guesswork.
 */
export async function whoAmI(): Promise<{ email: string | null; role: "superadmin" | "admin" | "staff" | null; isAdmin: boolean; isManager: boolean; actingAs: string | null; realEmail: string | null }> {
  const { getCurrentUserEmail, getPlatformRole, getImpersonation } = await import("@/lib/auth/platform-admin");
  const [email, role, imp] = await Promise.all([getCurrentUserEmail(), getPlatformRole(), getImpersonation()]);
  return { email, role, isAdmin: role === "superadmin" || role === "admin", isManager: role !== null, actingAs: imp.actingAs, realEmail: imp.realEmail };
}

/**
 * Superadmin only: begin acting as another team member to do their tasks. Sets the httpOnly
 * `act_as` cookie, which is honored only while the REAL signed-in user is a superadmin.
 */
export async function startImpersonation(email: string): Promise<{ ok: boolean; message?: string }> {
  const { isRealSuperAdmin, getImpersonation, ACT_AS_COOKIE } = await import("@/lib/auth/platform-admin");
  if (!(await isRealSuperAdmin())) return { ok: false, message: "Only the superadmin can act as another user." };
  const target = (email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) return { ok: false, message: "Enter a valid email address." };
  const { realEmail } = await getImpersonation();
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set({ name: ACT_AS_COOKIE, value: target, path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 8 });
  const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
  await logPlatformEvent({ action: "impersonation.start", actorEmail: realEmail, targetEmail: target });
  return { ok: true };
}

/** Stop impersonating and return to the real superadmin identity. */
export async function stopImpersonation(): Promise<void> {
  const { getImpersonation, ACT_AS_COOKIE } = await import("@/lib/auth/platform-admin");
  const { actingAs, realEmail } = await getImpersonation(); // capture before clearing
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set({ name: ACT_AS_COOKIE, value: "", path: "/", maxAge: 0 });
  if (actingAs) {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "impersonation.stop", actorEmail: realEmail, targetEmail: actingAs });
  }
}

/** Superadmin only: recent platform audit entries (impersonation, etc.). */
export async function getPlatformAudit(limit = 100): Promise<import("@/lib/audit/platform-audit").PlatformAuditEntry[]> {
  const { isPlatformSuperAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformSuperAdmin())) return [];
  const { listPlatformAudit } = await import("@/lib/audit/platform-audit");
  return listPlatformAudit(limit);
}

export interface DeclutterResult { scanned: number; matched: number; removed: number; dryRun: boolean; sampleNames: string[]; }

/**
 * Declutter the global SYSTEM asset library (platform-admin only). Targets the OLD
 * "grid/set" generations — filenames WITHOUT the " — <subject>" marker (those are the
 * multi-image collages, e.g. "Flat Emojis 3.png"). Single-subject assets ("Label —
 * subject N.png") are KEPT. With dryRun=true it only reports what WOULD be removed.
 *
 * Deletes storage objects + website_media rows under SYSTEM_TENANT_ID. Never touches any
 * tenant's own media. Guarded server-side by the platform-admin check.
 */
export async function declutterSystemMedia(opts?: { dryRun?: boolean }): Promise<DeclutterResult> {
  const { isPlatformSuperAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformSuperAdmin())) throw new Error("Not authorized — superadmin only.");
  const dryRun = opts?.dryRun !== false ? (opts?.dryRun ?? true) : false;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_media")
    .select("id, filename, storage_path")
    .eq("tenant_id", SYSTEM_TENANT_ID);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; filename: string | null; storage_path: string | null }[];

  // Old grids = NO em-dash subject marker in the filename. Single-subject ones keep "—".
  const isGrid = (fn: string | null) => !!fn && !fn.includes("—");
  const targets = rows.filter((r) => isGrid(r.filename));
  const sampleNames = targets.slice(0, 12).map((r) => r.filename ?? "(unnamed)");

  if (dryRun) {
    return { scanned: rows.length, matched: targets.length, removed: 0, dryRun: true, sampleNames };
  }

  // Remove storage objects in chunks, then the rows.
  const paths = targets.map((r) => r.storage_path).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 100) {
    await supabase.storage.from("website-media").remove(paths.slice(i, i + 100));
  }
  let removed = 0;
  const ids = targets.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error: delErr, count } = await supabase
      .from("website_media").delete({ count: "exact" }).in("id", ids.slice(i, i + 200));
    if (!delErr && typeof count === "number") removed += count;
  }
  return { scanned: rows.length, matched: targets.length, removed, dryRun: false, sampleNames };
}

export interface BulkUploadResult {
  uploaded: number;
  items: { name: string; folder: string; aiCategorized: boolean; needsDescription: boolean }[];
  errors: { name: string; error: string }[];
}

/**
 * Platform-admin only: BULK upload files into the global SYSTEM library (available to ALL
 * tenants, read-only). The admin may target a specific folder, or pass folderPath="auto"
 * to let AI categorize each image (vision). When AI can't tell, the file lands in
 * /System/Uncategorized and is flagged needsDescription so the UI can OPTIONALLY prompt for
 * a description — never forced (Ali's rule).
 */
export async function bulkUploadSystemMedia(formData: FormData): Promise<BulkUploadResult> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — AI Biz Connect admin/staff only.");
  const { ensureSystemFolderPath } = await import("@/lib/media/systemFolders");
  const { aiCategorizeImage } = await import("@/lib/ai/generateAiImages");

  const rawFolder = ((formData.get("folderPath") as string) || "auto").trim();
  const useAi = rawFolder.toLowerCase() === "auto";
  // Multi-tag: the uploader can pick several categories (Business, Charts, Accounting…).
  // Each image is stored with ALL of them (tags[]) and filed under the first as its folder.
  let pickedTags: string[] = [];
  try { pickedTags = (JSON.parse((formData.get("tags") as string) || "[]") as string[]).map((t) => String(t).trim()).filter(Boolean); } catch { /* none */ }
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  const supabase = createSupabaseServiceClient();
  const hasTags = await mediaHasTags();
  const folderCache = new Map<string, string | null>();
  const ensureLeaf = async (p: string) => {
    const norm = "/" + p.split("/").map((s) => s.trim()).filter(Boolean).join("/");
    if (!folderCache.has(norm)) folderCache.set(norm, await ensureSystemFolderPath(norm));
    return folderCache.get(norm) ?? null;
  };

  const items: BulkUploadResult["items"] = [];
  const errors: BulkUploadResult["errors"] = [];
  const base = Date.now();
  let i = 0;
  for (const file of files) {
    i++;
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const mime = file.type || (ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`);
      let folderPath = rawFolder;
      let displayName = file.name.replace(/\.[^.]+$/, "");
      let aiCategorized = false;
      let needsDescription = false;
      let rowTags: string[] = pickedTags;

      if (useAi) {
        const cat = await aiCategorizeImage(buf, mime);
        if (cat && cat.category && cat.category !== "Uncategorized") {
          folderPath = `/System/${cat.category}`;
          rowTags = [cat.category];
          if (cat.name) displayName = cat.name;
          aiCategorized = true;
        } else {
          folderPath = "/System/Uncategorized";
          rowTags = [];
          needsDescription = true;
          if (cat?.name) displayName = cat.name;
        }
      } else {
        // Manual multi-tag: file under the FIRST picked tag (or the typed folder); tag with ALL.
        const primary = (pickedTags[0] || folderPath || "Uncategorized").replace(/^\/+/, "");
        folderPath = primary.startsWith("System") ? `/${primary}` : `/System/${primary}`;
        if (!rowTags.length && primary) rowTags = [primary];
      }

      const leaf = await ensureLeaf(folderPath);
      const storagePath = `${SYSTEM_TENANT_ID}/uploads/system-bulk/${base}-${i}.${ext}`;
      const up = await supabase.storage.from("website-media").upload(storagePath, buf, { contentType: mime, upsert: true });
      if (up.error) { errors.push({ name: file.name, error: up.error.message }); continue; }
      const { data: pub } = supabase.storage.from("website-media").getPublicUrl(storagePath);
      const { error: rowErr } = await supabase.from("website_media").insert({
        tenant_id: SYSTEM_TENANT_ID, url: pub.publicUrl, storage_path: storagePath,
        filename: `${displayName || "Asset"}.${ext}`, mime_type: mime, size_bytes: buf.length, folder_id: leaf,
        ...(hasTags ? { tags: rowTags } : {}),
      });
      if (rowErr) { errors.push({ name: file.name, error: rowErr.message }); continue; }
      items.push({ name: `${displayName}.${ext}`, folder: folderPath, aiCategorized, needsDescription });
    } catch (e: any) {
      errors.push({ name: file.name, error: e?.message ?? String(e) });
    }
  }
  return { uploaded: items.length, items, errors };
}

// Generic filler to drop when deriving tags from a filename. Domain words (background,
// gradient, colors, subjects) are deliberately KEPT — those are the useful keywords.
const TAG_STOPWORDS = new Set([
  "a", "an", "the", "of", "with", "and", "or", "on", "in", "at", "to", "for", "by", "from",
  "into", "your", "our", "this", "that", "is", "are", "be", "as", "it", "its",
  "png", "jpg", "jpeg", "webp", "svg", "gif", "avif",
]);
function keywordsFromFilename(name?: string | null): string[] {
  const base = (name || "").replace(/\.[^.]+$/, ""); // drop extension
  const out: string[] = [];
  for (const t of base.toLowerCase().split(/[^a-z0-9]+/)) {
    if (t.length < 3 || /^\d+$/.test(t) || TAG_STOPWORDS.has(t) || out.includes(t)) continue;
    out.push(t);
    if (out.length >= 6) break; // a handful of tags
  }
  return out;
}

/**
 * Backfill System-library tags from each image's filename (admin/staff; FREE — no AI).
 * Merges derived keywords into existing tags. Needs migration 0030.
 */
export async function backfillSystemTagsFromFilenames(): Promise<{ updated: number; scanned: number }> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — admin/staff only.");
  if (!(await mediaHasTags())) throw new Error("Apply migration 0030 (media tags) first.");
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("website_media").select("id, filename, tags").eq("tenant_id", SYSTEM_TENANT_ID);
  let updated = 0;
  for (const row of (data ?? []) as { id: string; filename: string | null; tags: string[] | null }[]) {
    const derived = keywordsFromFilename(row.filename);
    if (!derived.length) continue;
    const merged = Array.from(new Set([...(row.tags ?? []), ...derived]));
    if (merged.length === (row.tags ?? []).length) continue; // nothing new
    const { error } = await supabase.from("website_media").update({ tags: merged }).eq("id", row.id).eq("tenant_id", SYSTEM_TENANT_ID);
    if (!error) updated++;
  }
  return { updated, scanned: (data ?? []).length };
}

/** Bulk-add tags to several System images at once (admin/staff). Merges, never removes. */
export async function addSystemMediaTags(mediaIds: string[], tags: string[]): Promise<{ updated: number }> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — admin/staff only.");
  if (!(await mediaHasTags())) throw new Error("Apply migration 0030 (media tags) first.");
  const clean = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!clean.length || !mediaIds.length) return { updated: 0 };
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("website_media").select("id, tags").eq("tenant_id", SYSTEM_TENANT_ID).in("id", mediaIds);
  let updated = 0;
  for (const row of (data ?? []) as { id: string; tags: string[] | null }[]) {
    const merged = Array.from(new Set([...(row.tags ?? []), ...clean]));
    if (merged.length === (row.tags ?? []).length) continue;
    const { error } = await supabase.from("website_media").update({ tags: merged }).eq("id", row.id).eq("tenant_id", SYSTEM_TENANT_ID);
    if (!error) updated++;
  }
  return { updated };
}

export interface PromoteResult { promoted: number; skipped: number; errors: string[] }

/**
 * Promote selected TENANT media into the global SYSTEM library (admin/staff only).
 * Copies each file into system storage and inserts a SYSTEM_TENANT_ID row so it appears
 * in everyone's System assets. The tenant KEEPS their original (copy, not destructive).
 * External/stock images (no storage_path) are referenced by URL.
 */
export async function promoteMediaToSystem(tenantId: string, mediaIds: string[]): Promise<PromoteResult> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — AI Biz Connect admin/staff only.");
  const supabase = createSupabaseServiceClient();
  const base = Date.now();
  let promoted = 0, skipped = 0, i = 0;
  const errors: string[] = [];
  for (const id of mediaIds) {
    i++;
    try {
      const { data: row } = await supabase
        .from("website_media").select("url, storage_path, filename, mime_type, size_bytes")
        .eq("tenant_id", tenantId).eq("id", id).maybeSingle();
      if (!row) { skipped++; continue; }
      const r = row as any;
      // Already in System? (same URL) — skip duplicates.
      const { data: dup } = await supabase
        .from("website_media").select("id").eq("tenant_id", SYSTEM_TENANT_ID).eq("url", r.url).limit(1);
      if (dup && dup.length) { skipped++; continue; }

      let url = r.url as string;
      let storagePath: string | null = null;
      const ext = (r.filename?.split(".").pop() || "png").toLowerCase();
      if (r.storage_path) {
        const dest = `${SYSTEM_TENANT_ID}/uploads/promoted/${base}-${i}.${ext}`;
        const copy = await supabase.storage.from("website-media").copy(r.storage_path, dest);
        if (!copy.error) {
          storagePath = dest;
          url = supabase.storage.from("website-media").getPublicUrl(dest).data.publicUrl;
        }
        // If copy fails (e.g. cross-path perms), fall back to referencing the original URL.
      }

      // AI-tag the promoted image → System category folder + a clean display name (best-effort).
      let folderId: string | null = null;
      let displayName = r.filename || "Asset";
      try {
        const { aiCategorizeImage } = await import("@/lib/ai/generateAiImages");
        const { ensureSystemFolderPath } = await import("@/lib/media/systemFolders");
        let buf: Buffer | null = null;
        if (storagePath) { const dl = await supabase.storage.from("website-media").download(storagePath); if (dl.data) buf = Buffer.from(await dl.data.arrayBuffer()); }
        if (!buf) { const resp = await fetch(url); if (resp.ok) buf = Buffer.from(await resp.arrayBuffer()); }
        if (buf) {
          const cat = await aiCategorizeImage(buf, r.mime_type || "image/png");
          const category = cat?.category && cat.category !== "Uncategorized" ? cat.category : "Promoted";
          folderId = await ensureSystemFolderPath(`/System/${category}`);
          if (cat?.name) displayName = `${cat.name}.${ext}`;
        }
      } catch { /* tagging is best-effort — the asset still promotes */ }

      const { error } = await supabase.from("website_media").insert({
        tenant_id: SYSTEM_TENANT_ID, url, storage_path: storagePath, folder_id: folderId,
        filename: displayName, mime_type: r.mime_type || "image/*", size_bytes: r.size_bytes ?? null,
      });
      if (error) { skipped++; errors.push(error.message); continue; }
      promoted++;
    } catch (e: any) { skipped++; errors.push(e?.message ?? String(e)); }
  }
  return { promoted, skipped, errors };
}

/**
 * Platform-admin only: set a clean display name (description) on a SYSTEM asset — used when
 * AI couldn't categorize and the admin optionally describes it afterward.
 */
export async function describeSystemMedia(mediaId: string, name: string, folderPath?: string): Promise<void> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — AI Biz Connect admin/staff only.");
  const supabase = createSupabaseServiceClient();
  const patch: Record<string, unknown> = {};
  if (name?.trim()) patch.filename = name.trim();
  if (folderPath?.trim()) {
    const { ensureSystemFolderPath } = await import("@/lib/media/systemFolders");
    const leaf = await ensureSystemFolderPath(folderPath.startsWith("/System") ? folderPath : `/System/${folderPath}`);
    if (leaf) patch.folder_id = leaf;
  }
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("website_media").update(patch).eq("tenant_id", SYSTEM_TENANT_ID).eq("id", mediaId);
  if (error) throw new Error(error.message);
}

/**
 * Platform-admin only: delete a SINGLE SYSTEM asset by id (for cherry-removing misses /
 * text-bearing images the bulk declutter keeps). Removes the storage object + the row.
 */
export async function deleteSystemMedia(mediaId: string): Promise<void> {
  const { isPlatformSuperAdmin, getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformSuperAdmin())) throw new Error("Not authorized — superadmin only (deleting shared System assets).");
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("website_media").select("storage_path").eq("tenant_id", SYSTEM_TENANT_ID).eq("id", mediaId).single();
  if (row?.storage_path) await supabase.storage.from("website-media").remove([row.storage_path]);
  const { error } = await supabase.from("website_media").delete().eq("tenant_id", SYSTEM_TENANT_ID).eq("id", mediaId);
  if (error) throw new Error(error.message);
  const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
  await logPlatformEvent({ action: "system.delete", actorEmail: await getCurrentUserEmail(), meta: { mediaId } });
}

// ---- Media folders (GHL-style; nested via parent_id, file → exactly one folder) ----
export interface MediaFolder { id: string; tenant_id: string; website_id: string | null; name: string; parent_id: string | null; created_at?: string; is_system?: boolean; }

/**
 * List a tenant's media folders. Tolerant: [] if the media_folders table isn't migrated yet.
 * With includeSystem, also merges the global SYSTEM folder tree (read-only) so tenants can
 * browse the System starter packs; those rows are flagged is_system.
 */
export async function listFolders(tenantId: string, includeSystem = false): Promise<MediaFolder[]> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("media_folders").select("id, tenant_id, website_id, name, parent_id, created_at")
      .eq("tenant_id", tenantId).order("name", { ascending: true });
    if (error) return [];
    let folders = (data ?? []) as MediaFolder[];
    if (includeSystem && tenantId !== SYSTEM_TENANT_ID) {
      const { data: sys } = await supabase
        .from("media_folders").select("id, tenant_id, website_id, name, parent_id, created_at")
        .eq("tenant_id", SYSTEM_TENANT_ID).order("name", { ascending: true });
      folders = folders.concat((sys ?? []).map((f: any) => ({ ...f, is_system: true })));
    }
    return folders;
  } catch { return []; }
}

export async function createFolder(tenantId: string, name: string, parentId?: string | null, websiteId?: string | null): Promise<MediaFolder> {
  await requireTenantAccess(tenantId);
  const clean = (name || "").trim() || "New folder";
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("media_folders")
    .insert({ tenant_id: tenantId, name: clean, parent_id: parentId ?? null, website_id: websiteId ?? null })
    .select("id, tenant_id, website_id, name, parent_id, created_at").single();
  if (error) throw new Error(/media_folders|relation|exist/i.test(error.message) ? "Apply the 0023_media_folders migration to use folders." : error.message);
  return data as MediaFolder;
}

/**
 * Seed a tenant's default top-level media folders (idempotent). Every tenant starts with the
 * same empty set — they fill them by creating, uploading, or importing from System. Matching
 * is case-insensitive so we never duplicate an existing folder. Best-effort; never throws.
 */
const DEFAULT_MEDIA_FOLDERS = ["Logos", "Photos", "Icons", "Backgrounds", "Landscapes", "Graphics", "Charts"];
export async function ensureDefaultMediaFolders(tenantId: string): Promise<void> {
  await requireTenantAccess(tenantId);
  try {
    const supabase = createSupabaseServiceClient();
    const { data: existing } = await supabase
      .from("media_folders").select("name").eq("tenant_id", tenantId).is("parent_id", null);
    const have = new Set((existing ?? []).map((f: any) => (f.name || "").toLowerCase()));
    const missing = DEFAULT_MEDIA_FOLDERS.filter((n) => !have.has(n.toLowerCase()));
    if (missing.length) {
      await supabase.from("media_folders").insert(
        missing.map((name) => ({ tenant_id: tenantId, name, parent_id: null, website_id: null }))
      );
    }
  } catch { /* folders table may be unmigrated — non-fatal */ }
}

export async function renameFolder(folderId: string, tenantId: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("media_folders").update({ name: (name || "").trim() || "Folder" }).eq("id", folderId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** All folder ids in the subtree rooted at folderId (inclusive), for this tenant. */
async function descendantFolderIds(supabase: ReturnType<typeof createSupabaseServiceClient>, tenantId: string, rootId: string): Promise<string[]> {
  const { data } = await supabase.from("media_folders").select("id, parent_id").eq("tenant_id", tenantId);
  const all = (data ?? []) as { id: string; parent_id: string | null }[];
  const out = [rootId];
  for (let i = 0; i < out.length; i++) {
    for (const f of all) if ((f.parent_id ?? null) === out[i] && !out.includes(f.id)) out.push(f.id);
  }
  return out;
}

/** Count images inside a folder (including its subfolders) — drives the delete-consent. */
export async function getFolderImageCount(folderId: string, tenantId: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!(await mediaHasFolderId())) return 0;
  const ids = await descendantFolderIds(supabase, tenantId, folderId);
  const { count } = await supabase.from("website_media").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId).in("folder_id", ids);
  return count ?? 0;
}

/** Move a folder under a new parent (null = root). Prevents cycles (can't move into itself
 *  or any of its own descendants). */
export async function moveFolder(folderId: string, tenantId: string, newParentId: string | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (newParentId === folderId) throw new Error("A folder can't contain itself.");
  if (newParentId) {
    const subtree = await descendantFolderIds(supabase, tenantId, folderId);
    if (subtree.includes(newParentId)) throw new Error("Can't move a folder into one of its own subfolders.");
  }
  const { error } = await supabase.from("media_folders").update({ parent_id: newParentId }).eq("id", folderId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * Delete a folder (and its subfolders). Ali's rule:
 *  - empty (no images) → delete directly.
 *  - has images → caller must pass deleteImages:true (consent). Then ALL images inside
 *    (and in subfolders) are permanently deleted (storage + rows) along with the folders.
 * Without consent on a non-empty folder it throws "FOLDER_NOT_EMPTY:<count>".
 */
export async function deleteFolder(folderId: string, tenantId: string, deleteImages = false): Promise<void> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const ids = await descendantFolderIds(supabase, tenantId, folderId);

  if (await mediaHasFolderId()) {
    const { data: imgs } = await supabase.from("website_media").select("id, storage_path").eq("tenant_id", tenantId).in("folder_id", ids);
    const images = (imgs ?? []) as { id: string; storage_path: string }[];
    if (images.length > 0 && !deleteImages) {
      throw new Error(`FOLDER_NOT_EMPTY:${images.length}`);
    }
    if (images.length > 0) {
      // Consent given — permanently remove the images (storage objects + rows).
      const paths = images.map((i) => i.storage_path).filter(Boolean);
      if (paths.length) { try { await supabase.storage.from("website-media").remove(paths); } catch { /* ignore storage gaps */ } }
      await supabase.from("website_media").delete().eq("tenant_id", tenantId).in("id", images.map((i) => i.id));
    }
  }
  // Delete the folders (subtree). FK cascade also covers children; explicit is safe.
  const { error } = await supabase.from("media_folders").delete().eq("tenant_id", tenantId).in("id", ids);
  if (error) throw new Error(error.message);
}

/** Move a file into a folder (or root when folderId is null). */
export async function moveMediaToFolder(mediaId: string, tenantId: string, folderId: string | null): Promise<void> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("website_media").update({ folder_id: folderId }).eq("id", mediaId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Total bytes used by a tenant's stored media (for the usage meter). */
export async function getMediaUsage(tenantId: string): Promise<{ bytes: number; count: number }> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("website_media").select("size_bytes").eq("tenant_id", tenantId);
  const bytes = (data ?? []).reduce((s: number, r: any) => s + (r.size_bytes ?? 0), 0);
  return { bytes, count: (data ?? []).length };
}

export async function deleteMedia(mediaId: string, tenantId: string): Promise<void> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("website_media")
    .select("storage_path")
    .eq("id", mediaId)
    .eq("tenant_id", tenantId)
    .single();

  const source = deriveSource(row?.storage_path ?? "");
  // Only remove a stored object for owned sources. Stock has no object; system is read-only.
  if (row?.storage_path && source !== "stock" && source !== "system") {
    await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  }
  const { error } = await supabase
    .from("website_media")
    .delete()
    .eq("id", mediaId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * Bundled, read-only system assets (backgrounds & icons). Phase 1 ships a small
 * curated set as inline SVG data-URIs so they always render with no external deps
 * or storage. (A future phase can serve real files from tenantId/system.)
 */
// ---- Stock provider search (SCAFFOLD — keys-gated, no real API calls) ----
export type StockProvider = "unsplash" | "pixabay";
export interface ProviderResult { id: string; thumb: string; url: string; alt?: string; }
/**
 * Search a stock provider. Phase 1 SCAFFOLD: providers connect via the tenant's OWN
 * API key (Settings → Integrations) — none configured, so this returns hasKey:false
 * and zero results, never calling an external API. When keys exist, this is the only
 * function to fill in (UI already wired). We never auto-connect a provider.
 */
export async function searchProvider(provider: StockProvider, _query: string, page = 1): Promise<{ hasKey: boolean; results: ProviderResult[]; page: number; message?: string }> {
  const label = provider === "unsplash" ? "Unsplash" : "Pixabay";
  return { hasKey: false, results: [], page, message: `Add your ${label} API key in Settings → Integrations to search free images. We never connect a provider automatically.` };
}

// ---- AI usage metering (Ali) -----------------------------------------------
// Record every billable AI action per tenant so usage can be metered + billed.
// Best-effort: if the 0027 table isn't applied yet, recording is a no-op.

/** Log an AI usage event (e.g. N images generated). Never throws. */
export async function recordAiUsage(tenantId: string, kind: string, units: number, meta?: Record<string, unknown>): Promise<void> {
  if (!tenantId || !units || units < 1) return;
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("ai_usage_events").insert({ tenant_id: tenantId, kind, units, meta: meta ?? {} });
  } catch { /* table not migrated — non-fatal */ }
}

export interface AiUsage { monthUnits: number; totalUnits: number; monthCostCents: number; priceCents: number; }

/** Read a tenant's AI usage (this calendar month + all time). Price is per-unit, configurable
 *  via AI_IMAGE_PRICE_CENTS (default 0 = metering only, not charging yet). */
export async function getAiUsage(tenantId: string): Promise<AiUsage> {
  // Default display price $0.10/image (override with AI_IMAGE_PRICE_CENTS). Metering only —
  // showing the cost math does NOT charge anyone; billing is a separate, gated step.
  const priceCents = Number(process.env.AI_IMAGE_PRICE_CENTS) || 10;
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase.from("ai_usage_events").select("units, created_at").eq("tenant_id", tenantId);
    const rows = (data ?? []) as { units: number; created_at: string }[];
    const now = new Date();
    const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
    let monthUnits = 0, totalUnits = 0;
    for (const r of rows) {
      const u = r.units ?? 0; totalUnits += u;
      const d = new Date(r.created_at);
      if (`${d.getUTCFullYear()}-${d.getUTCMonth()}` === key) monthUnits += u;
    }
    return { monthUnits, totalUnits, monthCostCents: monthUnits * priceCents, priceCents };
  } catch { return { monthUnits: 0, totalUnits: 0, monthCostCents: 0, priceCents }; }
}

export interface TenantAiUsage { tenantId: string; name: string; monthUnits: number; totalUnits: number; monthCostCents: number }

/** Per-tenant AI usage totals for the admin dashboard (admin/staff only). */
export async function getAllAiUsage(): Promise<TenantAiUsage[]> {
  const { canManageSystemLibrary } = await import("@/lib/auth/platform-admin");
  if (!(await canManageSystemLibrary())) throw new Error("Not authorized — AI Biz Connect admin/staff only.");
  const priceCents = Number(process.env.AI_IMAGE_PRICE_CENTS) || 10;
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase.from("ai_usage_events").select("tenant_id, units, created_at");
    const rows = (data ?? []) as { tenant_id: string; units: number; created_at: string }[];
    const now = new Date(); const key = `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
    const map = new Map<string, { month: number; total: number }>();
    for (const r of rows) {
      const m = map.get(r.tenant_id) ?? { month: 0, total: 0 };
      m.total += r.units ?? 0;
      const d = new Date(r.created_at);
      if (`${d.getUTCFullYear()}-${d.getUTCMonth()}` === key) m.month += r.units ?? 0;
      map.set(r.tenant_id, m);
    }
    const ids = Array.from(map.keys());
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: ts } = await supabase.from("tenants").select("id, name").in("id", ids);
      for (const t of ts ?? []) names.set((t as any).id, (t as any).name);
    }
    return ids
      .map((id) => ({ tenantId: id, name: names.get(id) ?? id.slice(0, 8), monthUnits: map.get(id)!.month, totalUnits: map.get(id)!.total, monthCostCents: map.get(id)!.month * priceCents }))
      .sort((a, b) => b.monthUnits - a.monthUnits);
  } catch { return []; }
}

// ---- AI image generation (Copilot Media checklist #3) ----------------------
// The preset catalog (Ali's batch prompts) lives in lib/media/ai-presets.ts because a
// "use server" file may only export async functions. Generation is KEYS-GATED below.

/** Generate images from a free-form prompt for THIS tenant (AI Images tab). KEYS-GATED:
 *  runs the live Imagen call only with a key AND AI_IMAGE_GEN_ENABLED=true; otherwise no
 *  call, no charge. Generated files import to the tenant's /uploads/ai (source=ai). */
export async function generateAiImages(
  tenantId: string,
  prompt: string,
  opts?: { count?: number; aspect?: string; style?: string }
): Promise<{ hasKey: boolean; images: { url: string }[]; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!aiImageGenEnabled()) {
    const keyed = aiHasImageKey("ai-image");
    return { hasKey: keyed, images: [],
      message: keyed
        ? "Key detected, but generation is held off (set AI_IMAGE_GEN_ENABLED=true to allow spend)."
        : "Connect an AI image-generation key (GEMINI_API_KEY) to generate. We never connect a provider or charge automatically." };
  }
  const styledPrompt = opts?.style && opts.style !== "auto" ? `${prompt}. Style: ${opts.style}.` : prompt;
  const out = await imagenGenerateAndImport(tenantId, styledPrompt, {
    count: opts?.count ?? 4, aspectRatio: opts?.aspect || "1:1", namePrefix: "AI image",
  });
  // Meter usage (one unit per generated image) so the tenant can be billed.
  await recordAiUsage(tenantId, "image", out.images.length, { aspect: opts?.aspect || "1:1", style: opts?.style || "auto" });
  return { hasKey: true, images: out.images.map((im) => ({ url: im.url })), message: out.skipped };
}

export interface SystemAsset {
  id: string;
  url: string;
  filename: string;
  kind: "background" | "icon" | "emoji";
  group: string; // read-only "/System" folder, e.g. "Icons · Minimal Line"
}

/**
 * System Starter Packs (Copilot Media checklist #1). Bundled, READ-ONLY assets every
 * tenant can use but not delete: gradient backgrounds, a generic social/UI ICON set in
 * 4 styles (Minimal Line / Bold Filled / Rounded Soft / Gradient Modern), and an EMOJI
 * set in 3 styles (Flat / 3D / Minimal). All inline SVG data-URIs — no storage, no
 * external assets, no trademarked brand logos (generic glyphs only).
 */
export async function getSystemAssets(): Promise<SystemAsset[]> {
  const wrap = (inner: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>${inner}</svg>`)}`;
  const grad = (a: string, b: string) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/></svg>`)}`;

  // Generic, non-trademark social/UI glyphs (stroke paths in a 96 box).
  const GLYPHS: { key: string; label: string; path: string }[] = [
    { key: "share", label: "Share", path: "M64 22 a8 8 0 1 0 0.1 0 M32 48 a8 8 0 1 0 0.1 0 M64 74 a8 8 0 1 0 0.1 0 M57 27 L39 44 M39 52 L57 69" },
    { key: "heart", label: "Heart", path: "M48 70 C26 52 26 32 40 32 C46 32 48 38 48 41 C48 38 50 32 56 32 C70 32 70 52 48 70 Z" },
    { key: "chat", label: "Chat", path: "M22 30 H74 V58 H46 L34 70 V58 H22 Z" },
    { key: "camera", label: "Camera", path: "M28 38 h8 l4 -6 h16 l4 6 h8 a4 4 0 0 1 4 4 v22 a4 4 0 0 1 -4 4 H28 a4 4 0 0 1 -4 -4 V42 a4 4 0 0 1 4 -4 Z M48 46 a9 9 0 1 0 0.1 0" },
    { key: "play", label: "Video", path: "M38 28 L70 48 L38 68 Z" },
    { key: "like", label: "Like", path: "M30 50 h9 v22 h-9 Z M43 50 l8 -19 a5 5 0 0 1 9 3 l-3 13 h13 a5 5 0 0 1 5 6 l-4 16 a5 5 0 0 1 -5 3 H43 Z" },
    { key: "bell", label: "Bell", path: "M48 24 a13 13 0 0 1 13 13 v11 l6 8 H29 l6 -8 V37 a13 13 0 0 1 13 -13 Z M41 64 a7 7 0 0 0 14 0" },
    { key: "globe", label: "Globe", path: "M48 22 a26 26 0 1 0 0.1 0 M22 48 h52 M48 22 c-15 13 -15 39 0 52 M48 22 c15 13 15 39 0 52" },
    { key: "at", label: "Mention", path: "M60 64 a26 26 0 1 1 8 -18 v6 a6 6 0 0 1 -12 0 V38 M56 48 a8 8 0 1 1 -16 0 a8 8 0 0 1 16 0" },
    { key: "hashtag", label: "Hashtag", path: "M40 26 L33 70 M63 26 L56 70 M27 40 H70 M26 56 H69" },
    { key: "link", label: "Link", path: "M43 53 a11 11 0 0 1 0 -16 l8 -8 a11 11 0 0 1 16 16 l-4 4 M53 43 a11 11 0 0 1 0 16 l-8 8 a11 11 0 0 1 -16 -16 l4 -4" },
    { key: "send", label: "Send", path: "M26 48 L72 26 L58 72 L46 56 Z M46 56 L72 26" },
  ];

  // 4 icon styles → 4 read-only system folders.
  const ICON_STYLES: { key: string; group: string; render: (p: string) => string }[] = [
    { key: "line", group: "Icons · Minimal Line", render: (p) => wrap(`<path d='${p}' fill='none' stroke='#1e3a8a' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/>`) },
    { key: "filled", group: "Icons · Bold Filled", render: (p) => wrap(`<circle cx='48' cy='48' r='44' fill='#1e3a8a'/><path d='${p}' fill='none' stroke='#ffffff' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/>`) },
    { key: "soft", group: "Icons · Rounded Soft", render: (p) => wrap(`<rect x='6' y='6' width='84' height='84' rx='26' fill='#e0e7ff'/><path d='${p}' fill='none' stroke='#1e3a8a' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/>`) },
    { key: "gradient", group: "Icons · Gradient Modern", render: (p) => wrap(`<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2563eb'/><stop offset='1' stop-color='#22d3ee'/></linearGradient></defs><rect x='6' y='6' width='84' height='84' rx='26' fill='url(#g)'/><path d='${p}' fill='none' stroke='#ffffff' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/>`) },
  ];

  // Emoji set (unicode glyphs rendered in SVG text) in 3 styles.
  const EMOJIS: { ch: string; label: string }[] = [
    { ch: "😀", label: "Grinning" }, { ch: "😍", label: "Heart eyes" }, { ch: "👍", label: "Thumbs up" },
    { ch: "🙏", label: "Thanks" }, { ch: "🔥", label: "Fire" }, { ch: "🎉", label: "Party" },
    { ch: "✅", label: "Check" }, { ch: "⭐", label: "Star" }, { ch: "❤️", label: "Heart" },
    { ch: "💡", label: "Idea" }, { ch: "🚀", label: "Rocket" }, { ch: "📈", label: "Growth" },
  ];
  const txt = (ch: string, size = 54) => `<text x='48' y='48' font-size='${size}' text-anchor='middle' dominant-baseline='central'>${ch}</text>`;
  const EMOJI_STYLES: { key: string; group: string; render: (ch: string) => string }[] = [
    { key: "flat", group: "Emojis · Flat", render: (ch) => wrap(`<circle cx='48' cy='48' r='44' fill='#f1f5f9'/>${txt(ch)}`) },
    { key: "3d", group: "Emojis · 3D", render: (ch) => wrap(`<defs><radialGradient id='r' cx='0.35' cy='0.3' r='0.8'><stop offset='0' stop-color='#ffffff'/><stop offset='1' stop-color='#cbd5e1'/></radialGradient></defs><circle cx='48' cy='48' r='44' fill='url(#r)'/>${txt(ch)}`) },
    { key: "min", group: "Emojis · Minimal", render: (ch) => wrap(txt(ch, 48)) },
  ];

  const out: SystemAsset[] = [
    { id: "bg-blue", kind: "background", group: "Free Images · Gradients", filename: "Blue gradient", url: grad("#1e3a8a", "#2563eb") },
    { id: "bg-sunset", kind: "background", group: "Free Images · Gradients", filename: "Sunset", url: grad("#f97316", "#db2777") },
    { id: "bg-mint", kind: "background", group: "Free Images · Gradients", filename: "Mint", url: grad("#10b981", "#0ea5e9") },
    { id: "bg-slate", kind: "background", group: "Free Images · Gradients", filename: "Slate", url: grad("#0f172a", "#475569") },
    { id: "bg-violet", kind: "background", group: "Free Images · Gradients", filename: "Violet", url: grad("#7c3aed", "#2563eb") },
    { id: "bg-aqua", kind: "background", group: "Free Images · Gradients", filename: "Aqua", url: grad("#06b6d4", "#3b82f6") },
  ];
  for (const st of ICON_STYLES) for (const g of GLYPHS) out.push({ id: `ic-${st.key}-${g.key}`, kind: "icon", group: st.group, filename: g.label, url: st.render(g.path) });
  for (const st of EMOJI_STYLES) for (const e of EMOJIS) out.push({ id: `em-${st.key}-${e.ch}`, kind: "emoji", group: st.group, filename: e.label, url: st.render(e.ch) });
  return out;
}

// ---------------------------------------------------------------------------
// SEO / metadata (Step 25) — per-page fields on website_pages.
// ---------------------------------------------------------------------------

export interface PageSEO {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_image_url?: string | null;
  canonical_url?: string | null;
  noindex?: boolean;
  nofollow?: boolean;
}

function isUrlOrEmpty(v: unknown): boolean {
  if (v == null || v === "") return true;
  if (typeof v !== "string") return false;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update a page's SEO fields. URL fields must be a valid absolute URL or empty.
 * (seo_title may be left empty — the public renderer falls back to page.title.)
 */
export async function updatePageSEO(
  pageId: string,
  tenantId: string,
  patch: PageSEO
): Promise<void> {
  if (!isUrlOrEmpty(patch.seo_image_url)) {
    throw new Error("Social image must be a valid URL or empty.");
  }
  if (!isUrlOrEmpty(patch.canonical_url)) {
    throw new Error("Canonical URL must be a valid URL or empty.");
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_pages")
    .update(patch)
    .eq("id", pageId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Page settings (Step 26) — slug / visibility / redirect.
// ---------------------------------------------------------------------------

export interface PageSettings {
  slug?: string;
  is_hidden?: boolean;
  redirect_url?: string | null;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Update a page's settings. Validates slug format + per-tenant uniqueness and
 * redirect_url (absolute URL or empty), all server-side.
 */
export async function updatePageSettings(
  pageId: string,
  tenantId: string,
  patch: PageSettings
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  if (patch.slug !== undefined) {
    if (!SLUG_RE.test(patch.slug)) {
      throw new Error(
        "Slug must be lowercase letters, numbers and hyphens (e.g. about-us)."
      );
    }
    const { data: existing } = await supabase
      .from("website_pages")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", patch.slug)
      .neq("id", pageId)
      .maybeSingle();
    if (existing) {
      throw new Error("Another page already uses this slug.");
    }
  }

  if (!isUrlOrEmpty(patch.redirect_url)) {
    throw new Error("Redirect URL must be a valid URL or empty.");
  }

  const { error } = await supabase
    .from("website_pages")
    .update(patch)
    .eq("id", pageId)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Unpublish a page: sets is_public = false (keeps published_at for history). */
export async function unpublishPage(pageId: string, tenantId: string) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("website_pages")
    .update({ is_public: false })
    .eq("tenant_id", tenantId)
    .eq("id", pageId);

  if (error) throw new Error(error.message);
  return { published: false as const };
}

// ---------------------------------------------------------------------------
// Navigation (Step 22) — same deferred-auth posture as publishPage/useTemplate.
// A nav item links to a page_id OR a custom url (not both).
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string;
  tenant_id: string;
  label: string;
  page_id: string | null;
  url: string | null;
  order_index: number;
}

export async function addNavItem(
  tenantId: string,
  input: { label: string; page_id?: string | null; url?: string | null },
  orderIndex: number
): Promise<NavItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_navigation")
    .insert({
      tenant_id: tenantId,
      label: input.label,
      page_id: input.page_id ?? null,
      url: input.url ?? null,
      order_index: orderIndex,
    })
    .select("id, tenant_id, label, page_id, url, order_index")
    .single();

  if (error) throw new Error(error.message);
  return data as NavItem;
}

export async function updateNavItem(
  id: string,
  tenantId: string,
  patch: { label?: string; page_id?: string | null; url?: string | null }
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_navigation")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function deleteNavItem(
  id: string,
  tenantId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_navigation")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function reorderNavItems(
  tenantId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  // Targeted updates only (no upsert / no INSERT branch).
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("website_navigation")
        .update({ order_index: index })
        .eq("id", id)
        .eq("tenant_id", tenantId)
    )
  );
}

// ---------------------------------------------------------------------------
// Section templates (Step 23) — per-tenant presets stored as a sections array.
// Table: website_section_templates (see migration 0007; NOT the STEP 18
// website_templates catalog). Same deferred-auth posture.
// ---------------------------------------------------------------------------

export interface SectionTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  sections: unknown[];
  created_at: string;
}

export async function addTemplate(
  tenantId: string,
  name: string,
  description: string | null,
  sections: unknown[]
): Promise<SectionTemplate> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_section_templates")
    .insert({ tenant_id: tenantId, name, description, sections })
    .select("id, tenant_id, name, description, sections, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as SectionTemplate;
}

/** List the tenant's saved section assets (templates), newest first. Tolerant: [] on error. */
export async function listTemplates(tenantId: string): Promise<SectionTemplate[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("website_section_templates")
    .select("id, tenant_id, name, description, sections, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SectionTemplate[];
}

export async function updateTemplate(
  id: string,
  tenantId: string,
  patch: { name?: string; description?: string | null; sections?: unknown[] }
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_section_templates")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(
  id: string,
  tenantId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_section_templates")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/**
 * Replace a page's sections with a template's sections.
 * Validates every section (sectionSchema) and refuses if any is invalid.
 * Targeted delete + insert (no upsert).
 */
export async function applyTemplateToPage(
  templateId: string,
  pageId: string,
  tenantId: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: tpl, error: tplErr } = await supabase
    .from("website_section_templates")
    .select("sections")
    .eq("id", templateId)
    .eq("tenant_id", tenantId)
    .single();
  if (tplErr) throw new Error(tplErr.message);

  const sections: any[] = Array.isArray(tpl?.sections) ? tpl!.sections : [];

  // Validate every section before touching the page.
  const allValid = sections.every(
    (s) => sectionSchema.safeParse(s).success
  );
  if (!allValid) {
    throw new Error(
      "Cannot apply template: it contains one or more invalid sections."
    );
  }

  // Replace the page's sections: delete existing, then insert template ones.
  const { error: delErr } = await supabase
    .from("website_page_sections")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("page_id", pageId);
  if (delErr) throw new Error(delErr.message);

  if (sections.length) {
    const rows = sections.map((content, index) => ({
      tenant_id: tenantId,
      page_id: pageId,
      type: (content as any).type,
      content,
      order_index: index,
    }));
    const { error: insErr } = await supabase
      .from("website_page_sections")
      .insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
}

/**
 * @deprecated STEP 24 — Template system consolidation.
 * The STEP 18 "Kits" template system (this action + the website_template_*
 * tables) has been RETIRED from the UI in favor of the STEP 23 section-template
 * system (website_section_templates + applyTemplateToPage). This function and
 * its tables are preserved for backward compatibility but are no longer wired
 * to any UI. See migration 0008_retire_step18_templates.sql (unapplied) for the
 * optional cleanup Ali can review/apply later.
 *
 * Clone a base template into a tenant's live website tables.
 *
 * SECURITY: This is a Server Action reachable via direct POST. It writes to
 * tenant tables based on the tenantId argument with NO authorization check.
 * Before production, verify the authenticated user actually owns `tenantId`
 * (see Next.js Data Security guide) — otherwise any caller can seed any tenant.
 */
export async function useTemplate(
  templateId: string,
  tenantId: string
): Promise<ClonedPage[]> {
  const supabase = createSupabaseServiceClient();

  // AUTH NOTE: This app uses a CUSTOM JWT (token cookie / localStorage) + an
  // external backend (NEXT_PUBLIC_API_URL) for auth and tenant scoping — NOT
  // Supabase Auth. supabase.auth.getUser() would always return null here, so a
  // getUser()-based guard would throw Unauthorized for every caller and break
  // template import. We therefore do NOT guard on Supabase Auth.
  //
  // Tenant authorization is currently the external backend's responsibility.
  // FUTURE PHASE: either move this mutation fully behind the external backend,
  // or add real server-side verification of the custom JWT (and base the
  // tenant check on its verified claims) before trusting `tenantId`.

  // A) Template brand settings
  const { data: templateBrand } = await supabase
    .from("website_template_brand_settings")
    .select(
      "primary_color, secondary_color, accent_color, font_heading, font_body"
    )
    .eq("template_id", templateId)
    .single();

  // B) Template pages
  const { data: templatePages } = await supabase
    .from("website_template_pages")
    .select("id, title, slug, order_index")
    .eq("template_id", templateId)
    .order("order_index");

  // C) Template sections (for the pages of this template)
  const templatePageIds = (templatePages ?? []).map((p) => p.id);

  const { data: templateSections } = templatePageIds.length
    ? await supabase
        .from("website_template_sections")
        .select("id, template_page_id, type, content, order_index")
        .in("template_page_id", templatePageIds)
        .order("order_index")
    : { data: [] as any[] };

  // D) Clone brand into tenant brand settings
  if (templateBrand) {
    await supabase.from("website_brand_settings").upsert({
      tenant_id: tenantId,
      ...templateBrand,
    });
  }

  // Clone pages, building a templatePageId -> newPageId map
  const pageMap: Record<string, string> = {};
  const clonedPages: ClonedPage[] = [];

  for (const templatePage of templatePages ?? []) {
    const { data: newPage } = await supabase
      .from("website_pages")
      .insert({
        tenant_id: tenantId,
        title: templatePage.title,
        slug: templatePage.slug,
        order_index: templatePage.order_index,
        is_home: false,
      })
      .select("id, title, slug, order_index")
      .single();

    if (newPage) {
      pageMap[templatePage.id] = newPage.id;
      clonedPages.push(newPage as ClonedPage);
    }
  }

  // Clone sections, remapping to the new page IDs
  for (const templateSection of templateSections ?? []) {
    const newPageId = pageMap[templateSection.template_page_id];
    if (!newPageId) continue;

    await supabase.from("website_page_sections").insert({
      tenant_id: tenantId,
      page_id: newPageId,
      type: templateSection.type,
      content: templateSection.content,
      order_index: templateSection.order_index,
    });
  }

  // Return the new tenant pages so the editor can load + auto-select them
  return clonedPages;
}
