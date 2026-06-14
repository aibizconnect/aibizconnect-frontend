import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { llm, stripFences } from "@/lib/agent/llm";

/**
 * BLOG engine (D-345 — GHL Sites → Blogs parity). Admin authoring + a public, SEO-optimized
 * reader (Article JSON-LD for GEO). Plain-text body with blank-line paragraphs (same convention
 * as email campaigns). Drafts stay private; only published posts render publicly.
 *
 * Storage: tenant_blog_posts (0066). Missing-table → lists degrade to empty; saves report a hint.
 */

export type BlogStatus = "draft" | "published";
export interface BlogPost {
  id: string;
  websiteId: string | null;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  body: string;
  tags: string[];
  author: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface BlogPostSummary {
  id: string; title: string; slug: string; excerpt: string; coverImageUrl: string | null;
  tags: string[]; status: BlogStatus; publishedAt: string | null; updatedAt: string;
}

const svc = () => createSupabaseServiceClient();
const missingTable = (msg?: string) => /relation .* does not exist|Could not find the table/i.test(msg ?? "");
const HINT = "Blogs need their table — run supabase/migrations/0066_blogs.sql.";

export function slugify(s: string): string {
  return (s || "post").toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";
}

function rowToPost(r: any): BlogPost {
  return {
    id: r.id, websiteId: r.website_id ?? null, title: r.title ?? "Untitled post", slug: r.slug,
    excerpt: r.excerpt ?? "", coverImageUrl: r.cover_image_url ?? null, body: r.body ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [], author: r.author ?? null,
    seoTitle: r.seo_title ?? null, seoDescription: r.seo_description ?? null,
    status: r.status === "published" ? "published" : "draft",
    publishedAt: r.published_at ?? null, createdAt: r.created_at ?? new Date().toISOString(), updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}
const rowToSummary = (r: any): BlogPostSummary => ({
  id: r.id, title: r.title ?? "Untitled post", slug: r.slug, excerpt: r.excerpt ?? "",
  coverImageUrl: r.cover_image_url ?? null, tags: Array.isArray(r.tags) ? r.tags : [],
  status: r.status === "published" ? "published" : "draft", publishedAt: r.published_at ?? null, updatedAt: r.updated_at ?? new Date().toISOString(),
});

export async function listPosts(tenantId: string, opts: { publishedOnly?: boolean } = {}): Promise<BlogPostSummary[]> {
  let q = svc().from("tenant_blog_posts").select("id,title,slug,excerpt,cover_image_url,tags,status,published_at,updated_at").eq("tenant_id", tenantId);
  q = opts.publishedOnly ? q.eq("status", "published").order("published_at", { ascending: false }) : q.order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map(rowToSummary);
}

export async function getPost(tenantId: string, id: string): Promise<BlogPost | null> {
  const { data } = await svc().from("tenant_blog_posts").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  return data ? rowToPost(data) : null;
}
export async function getPostBySlug(tenantId: string, slug: string, opts: { publishedOnly?: boolean } = {}): Promise<BlogPost | null> {
  let q = svc().from("tenant_blog_posts").select("*").eq("tenant_id", tenantId).eq("slug", slug);
  if (opts.publishedOnly) q = q.eq("status", "published");
  const { data } = await q.maybeSingle();
  return data ? rowToPost(data) : null;
}

/** Ensure a slug is unique within the tenant (append -2, -3 … on collision). Ignores `exceptId`. */
async function uniqueSlug(tenantId: string, base: string, exceptId?: string): Promise<string> {
  const sb = svc();
  let slug = slugify(base); let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await sb.from("tenant_blog_posts").select("id").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle();
    if (!data || data.id === exceptId) return slug;
    n += 1; slug = `${slugify(base)}-${n}`;
  }
}

export async function createPost(tenantId: string, input: { title?: string; websiteId?: string | null } = {}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const title = (input.title || "Untitled post").trim();
  const slug = await uniqueSlug(tenantId, title).catch(() => slugify(title));
  const { data, error } = await svc().from("tenant_blog_posts")
    .insert({ tenant_id: tenantId, website_id: input.websiteId ?? null, title, slug })
    .select("id").single();
  if (error) return { ok: false, error: missingTable(error.message) ? HINT : error.message };
  return { ok: true, id: data.id };
}

export interface BlogPatch {
  title?: string; slug?: string; excerpt?: string; coverImageUrl?: string | null; body?: string;
  tags?: string[]; author?: string | null; seoTitle?: string | null; seoDescription?: string | null;
}
export async function updatePost(tenantId: string, id: string, patch: BlogPatch): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
  if (patch.coverImageUrl !== undefined) row.cover_image_url = patch.coverImageUrl;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.author !== undefined) row.author = patch.author;
  if (patch.seoTitle !== undefined) row.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) row.seo_description = patch.seoDescription;
  if (patch.slug !== undefined && patch.slug.trim()) row.slug = await uniqueSlug(tenantId, patch.slug, id);
  else if (patch.title !== undefined && patch.slug === undefined) { /* keep existing slug on title edits */ }
  const { error } = await svc().from("tenant_blog_posts").update(row).eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: missingTable(error.message) ? HINT : error.message } : { ok: true };
}

export async function setPostStatus(tenantId: string, id: string, status: BlogStatus): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "published") {
    const cur = await getPost(tenantId, id);
    if (!cur?.publishedAt) row.published_at = new Date().toISOString();
  }
  const { error } = await svc().from("tenant_blog_posts").update(row).eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deletePost(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_blog_posts").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** AI draft a full post grounded in the Business Profile: title + excerpt + body + SEO + tags. */
export async function draftPost(tenantId: string, brief: string): Promise<{ title: string; excerpt: string; body: string; seoTitle: string; seoDescription: string; tags: string[] } | null> {
  const sb = svc();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId)
    .in("setting_key", ["business_name", "business_niche", "business_website", "address_city"]);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, String(r.setting_value ?? "")]));
  const facts = [m.business_name && `Business: ${m.business_name}`, m.business_niche && `Industry: ${m.business_niche}`, m.address_city && `City: ${m.address_city}`, m.business_website && `Website: ${m.business_website}`].filter(Boolean).join("\n");
  const raw = await llm.complete({
    system: `You write SEO blog posts for small businesses. ${facts ? `BUSINESS FACTS:\n${facts}\n` : ""}Write a genuinely useful, specific, well-structured article. Plain text with blank lines between paragraphs; use short sub-headings on their own line. Respond as ONE JSON object: {"title":"...","excerpt":"...","body":"...","seoTitle":"...","seoDescription":"...","tags":["...","..."]}. excerpt ≤ 200 chars, seoDescription ≤ 160 chars, 2-5 tags.`,
    user: `Write the blog post. Brief: ${brief}`,
    jsonObject: true,
    temperature: 0.7,
  }, tenantId);
  if (!raw) return null;
  try {
    const j = JSON.parse(stripFences(raw));
    if (typeof j.title === "string" && typeof j.body === "string") {
      return {
        title: j.title.slice(0, 160), excerpt: String(j.excerpt ?? "").slice(0, 200), body: String(j.body).slice(0, 20000),
        seoTitle: String(j.seoTitle ?? j.title).slice(0, 70), seoDescription: String(j.seoDescription ?? j.excerpt ?? "").slice(0, 160),
        tags: Array.isArray(j.tags) ? j.tags.map((t: any) => String(t)).slice(0, 6) : [],
      };
    }
  } catch { /* fall through */ }
  return null;
}

/** Light brand for the public blog chrome — business name + accent (best-effort). */
export async function getBlogBrand(tenantId: string): Promise<{ businessName: string; accent: string }> {
  const sb = svc();
  let businessName = "Our Blog"; let accent = "#1e3a8a";
  try {
    const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", ["business_name"]);
    const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, String(r.setting_value ?? "")]));
    if (m.business_name) businessName = m.business_name;
  } catch { /* defaults */ }
  try {
    const { data } = await sb.from("website_brands").select("primary_color").eq("tenant_id", tenantId).limit(1).maybeSingle();
    if (data?.primary_color) accent = String(data.primary_color);
  } catch { /* no brand row / column */ }
  return { businessName, accent };
}
