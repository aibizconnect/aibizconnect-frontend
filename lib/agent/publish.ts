import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { critiquePlan, type CriticVerdict } from "./critic";

/**
 * Supervised publish (closes O-3). Publishing a page is now a SUPERVISED action with
 * a HARD pre-publish quality gate: the Design/Quality critic must PASS or the publish
 * is HALTED (Quality Gate Failed breakpoint) and nothing is written. Only on pass does
 * the service-role writer promote the draft to live. This is what guarantees no
 * website output can ship without meeting the brand/IA/a11y/structure/UX bar.
 *
 * Writes mirror the proven publishPage server action, but run via service-role (Path B)
 * because the agent context carries no Postgres RLS claim.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Build a v1 website plan from a page's draft so the critic can score real content. */
function planFromDraft(tenantId: string, page: { slug: string; title: string; sections: any[] }): unknown {
  return {
    version: "1.0", domain: "website", tenantId, dryRun: true,
    actions: [
      { id: "page", type: "createPage", params: { title: page.title, slug: page.slug } },
      ...page.sections.map((content, i) => ({ id: `sec-${i}`, type: "createSection", params: content })),
    ],
  };
}

export interface PublishOutcome {
  ok: boolean;
  published: boolean;
  breakpoint?: "Quality Gate Failed";
  critic: CriticVerdict | null;
  reason?: string;
}

export async function supervisedPublish(args: { tenantId: string; pageId: string }): Promise<PublishOutcome> {
  const sb = service();
  const { data: page, error } = await sb
    .from("website_pages")
    .select("title, slug, draft_title, draft_slug, draft_seo, draft_sections")
    .eq("tenant_id", args.tenantId).eq("id", args.pageId).single();
  if (error || !page) return { ok: false, published: false, critic: null, reason: "Page not found." };

  const newTitle = page.draft_title ?? page.title;
  const newSlug = page.draft_slug ?? page.slug;
  if (!SLUG_RE.test(newSlug)) return { ok: false, published: false, critic: null, reason: "Invalid slug." };

  const hasDraft = Array.isArray(page.draft_sections) && page.draft_sections.length > 0;
  let sections: any[];
  if (hasDraft) {
    sections = page.draft_sections as any[];
  } else {
    const { data: live } = await sb.from("website_page_sections").select("content, order_index").eq("tenant_id", args.tenantId).eq("page_id", args.pageId).order("order_index");
    sections = (live ?? []).map((r: any) => r.content);
  }

  // HARD GATE — critique the real content. Fail -> halt, write nothing.
  const critic = await critiquePlan(planFromDraft(args.tenantId, { slug: newSlug, title: newTitle, sections }));
  if (!critic.pass) {
    return { ok: false, published: false, breakpoint: "Quality Gate Failed", critic, reason: critic.summary };
  }

  // PASS -> promote draft to live (service-role).
  const draftSeo: Record<string, any> = page.draft_seo && typeof page.draft_seo === "object" ? (page.draft_seo as Record<string, any>) : {};
  const seoCols = ["seo_title", "seo_description", "seo_image_url", "canonical_url", "noindex", "nofollow"];
  const seoUpdate: Record<string, any> = {};
  for (const k of seoCols) if (k in draftSeo) seoUpdate[k] = draftSeo[k];

  const { error: upErr } = await sb.from("website_pages").update({
    title: newTitle, slug: newSlug, ...seoUpdate,
    is_public: true, published_at: new Date().toISOString(),
    draft_title: null, draft_slug: null, draft_seo: {}, draft_sections: [],
  }).eq("tenant_id", args.tenantId).eq("id", args.pageId);
  if (upErr) return { ok: false, published: false, critic, reason: upErr.message };

  if (hasDraft) {
    await sb.from("website_page_sections").delete().eq("tenant_id", args.tenantId).eq("page_id", args.pageId);
    if (sections.length) {
      await sb.from("website_page_sections").insert(sections.map((content, index) => ({
        tenant_id: args.tenantId, page_id: args.pageId, type: (content as any).type, content, order_index: index,
      })));
    }
  }
  return { ok: true, published: true, critic };
}
