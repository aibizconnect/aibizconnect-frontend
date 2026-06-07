"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Sites → Websites page-management actions (GHL-style). Service-role writes (the tenant
 * workspace carries no Postgres RLS claim in this context). Data-only — no DDL, no
 * publish/charge. New pages start as private drafts (is_public=false).
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "page";

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  is_public: boolean;
  order_index: number;
  is_home: boolean;
}

export async function listPagesAction(tenantId: string): Promise<SitePage[]> {
  const sb = service();
  const { data } = await sb.from("website_pages")
    .select("id, title, slug, is_public, order_index, is_home")
    .eq("tenant_id", tenantId).order("order_index");
  return (data ?? []) as SitePage[];
}

async function uniqueSlug(sb: SupabaseClient, tenantId: string, base: string): Promise<string> {
  const root = SLUG_RE.test(base) ? base : slugify(base);
  let slug = root;
  for (let i = 0; i < 50; i++) {
    const { data } = await sb.from("website_pages").select("id").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${root}-${i + 2}`;
  }
  return `${root}-${Date.now() % 100000}`;
}

export async function createPageAction(tenantId: string, title = "New Page"): Promise<{ ok: boolean; error?: string; pages: SitePage[] }> {
  const sb = service();
  const slug = await uniqueSlug(sb, tenantId, slugify(title));
  const { count } = await sb.from("website_pages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { error } = await sb.from("website_pages").insert({
    tenant_id: tenantId, title, slug, order_index: count ?? 0, is_public: false,
    draft_title: title, draft_slug: slug, draft_seo: {}, draft_sections: [],
  });
  return { ok: !error, error: error?.message, pages: await listPagesAction(tenantId) };
}

export async function duplicatePageAction(tenantId: string, pageId: string): Promise<{ ok: boolean; error?: string; pages: SitePage[] }> {
  const sb = service();
  const { data: src } = await sb.from("website_pages")
    .select("title, slug, draft_seo, draft_sections, draft_title")
    .eq("tenant_id", tenantId).eq("id", pageId).single();
  if (!src) return { ok: false, error: "Page not found.", pages: await listPagesAction(tenantId) };

  // pull live sections too so the copy is faithful even if no draft exists
  const { data: liveSections } = await sb.from("website_page_sections")
    .select("content, order_index").eq("tenant_id", tenantId).eq("page_id", pageId).order("order_index");
  const sections = Array.isArray(src.draft_sections) && src.draft_sections.length
    ? src.draft_sections
    : (liveSections ?? []).map((r: any) => r.content);

  const title = `${src.title} copy`;
  const slug = await uniqueSlug(sb, tenantId, `${src.slug}-copy`);
  const { count } = await sb.from("website_pages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { error } = await sb.from("website_pages").insert({
    tenant_id: tenantId, title, slug, order_index: count ?? 0, is_public: false,
    draft_title: title, draft_slug: slug, draft_seo: src.draft_seo ?? {}, draft_sections: sections,
  });
  return { ok: !error, error: error?.message, pages: await listPagesAction(tenantId) };
}

export async function deletePageAction(tenantId: string, pageId: string): Promise<{ ok: boolean; pages: SitePage[] }> {
  const sb = service();
  await sb.from("website_page_sections").delete().eq("tenant_id", tenantId).eq("page_id", pageId);
  await sb.from("website_pages").delete().eq("tenant_id", tenantId).eq("id", pageId);
  return { ok: true, pages: await listPagesAction(tenantId) };
}
