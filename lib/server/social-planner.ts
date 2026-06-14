import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { publishToSocialAccount } from "@/lib/server/social";
import { llm, stripFences } from "@/lib/agent/llm";

/**
 * SOCIAL PLANNER engine (D-344 — the Marketing → Social Planner tab). Compose once, choose
 * connected accounts, optionally per-network variants + an image, then either keep a draft,
 * schedule it (the cron worker publishes at the slot), or Post-now. Publishing runs on the
 * tenant's stored OAuth token via lib/server/social. Honors the spirit of the drafts-only law:
 * nothing publishes unless the user scheduled it or pressed Post-now.
 *
 * Storage: tenant_social_posts (0065). Missing-table → the tab degrades to empty, save reports
 * the migration hint.
 */

export type SocialPostStatus = "draft" | "scheduled" | "posting" | "posted" | "failed";
export interface SocialPostResult { accountId: string; ok: boolean; error?: string; externalId?: string; at: string }
export interface SocialPost {
  id: string;
  content: string;
  accountIds: string[];
  mediaUrls: string[];
  /** per-account text overrides, keyed by tenant_social_accounts.id */
  variants: Record<string, string>;
  scheduledAt: string | null;
  status: SocialPostStatus;
  results: SocialPostResult[];
  createdAt: string;
  updatedAt: string;
}

const svc = () => createSupabaseServiceClient();
const missingTable = (msg?: string) => /relation .* does not exist|Could not find the table/i.test(msg ?? "");
const HINT = "Social Planner needs its table — run supabase/migrations/0065_social_posts.sql.";

function rowToPost(r: any): SocialPost {
  return {
    id: r.id,
    content: String(r.content ?? ""),
    accountIds: Array.isArray(r.account_ids) ? r.account_ids : [],
    mediaUrls: Array.isArray(r.media_urls) ? r.media_urls : [],
    variants: r.variants && typeof r.variants === "object" ? r.variants : {},
    scheduledAt: r.scheduled_at ?? null,
    status: (["scheduled", "posting", "posted", "failed"].includes(r.status) ? r.status : "draft") as SocialPostStatus,
    results: Array.isArray(r.results) ? r.results : [],
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}

export async function listSocialPosts(tenantId: string): Promise<SocialPost[]> {
  const { data, error } = await svc().from("tenant_social_posts").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowToPost);
}

export async function saveSocialPost(tenantId: string, p: SocialPost, createdBy?: string): Promise<{ ok: boolean; error?: string }> {
  const row = {
    id: p.id, tenant_id: tenantId, content: p.content, account_ids: p.accountIds, media_urls: p.mediaUrls,
    variants: p.variants, scheduled_at: p.scheduledAt, status: p.status, results: p.results,
    created_by: createdBy ?? null, updated_at: new Date().toISOString(),
  };
  const { error } = await svc().from("tenant_social_posts").upsert(row, { onConflict: "id" });
  if (error) return { ok: false, error: missingTable(error.message) ? HINT : error.message };
  return { ok: true };
}

export async function deleteSocialPost(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_social_posts").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** Publish one post to all its accounts now. Used by Post-now AND the scheduler. Per-account results. */
export async function publishSocialPost(tenantId: string, id: string): Promise<{ ok: boolean; results: SocialPostResult[]; error?: string }> {
  const sb = svc();
  const { data } = await sb.from("tenant_social_posts").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (!data) return { ok: false, results: [], error: "Post not found." };
  const post = rowToPost(data);
  if (post.status === "posted") return { ok: true, results: post.results };
  if (!post.accountIds.length) return { ok: false, results: [], error: "Pick at least one account to post to." };

  await sb.from("tenant_social_posts").update({ status: "posting", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);

  const results: SocialPostResult[] = [];
  for (const accountId of post.accountIds) {
    const text = (post.variants[accountId]?.trim() || post.content || "").trim();
    const r = await publishToSocialAccount(tenantId, accountId, text, post.mediaUrls);
    results.push({ accountId, ok: r.ok, error: r.error, externalId: r.externalId, at: new Date().toISOString() });
  }
  const anyOk = results.some((r) => r.ok);
  const status: SocialPostStatus = anyOk ? "posted" : "failed";
  await sb.from("tenant_social_posts").update({ status, results, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);

  try {
    const okCount = results.filter((r) => r.ok).length;
    await sb.from("ai_usage_events").insert({ tenant_id: tenantId, kind: "social_post_publish", units: okCount, meta: { postId: id, accounts: post.accountIds.length, failed: results.length - okCount } });
  } catch { /* metering best-effort */ }
  return { ok: anyOk, results };
}

/** CRON: publish every scheduled post whose slot has arrived. Cross-tenant; idempotent via the
 *  status claim (scheduled → posting). Driven by /api/cron/social-planner. */
export async function runDueSocialPosts(nowIso?: string): Promise<{ processed: number; posted: number; failed: number }> {
  const sb = svc();
  const now = nowIso ?? new Date().toISOString();
  const { data, error } = await sb.from("tenant_social_posts")
    .select("id, tenant_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(100);
  if (error || !data?.length) return { processed: 0, posted: 0, failed: 0 };

  let posted = 0, failed = 0, processed = 0;
  for (const row of data) {
    // Claim it (scheduled → posting) so a concurrent run can't double-post.
    const claim = await sb.from("tenant_social_posts").update({ status: "posting", updated_at: new Date().toISOString() })
      .eq("id", row.id).eq("status", "scheduled").select("id");
    if (!claim.data?.length) continue; // someone else claimed it
    processed++;
    const r = await publishSocialPost(row.tenant_id, row.id);
    if (r.ok) posted++; else failed++;
  }
  return { processed, posted, failed };
}

/** AI draft a social post grounded in the Business Profile. Optionally tuned for a network. */
export async function draftSocialPost(tenantId: string, brief: string, network?: string): Promise<{ text: string } | null> {
  const sb = svc();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId)
    .in("setting_key", ["business_name", "business_niche", "business_phone", "business_website", "address_city"]);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, String(r.setting_value ?? "")]));
  const facts = [m.business_name && `Business: ${m.business_name}`, m.business_niche && `Industry: ${m.business_niche}`, m.address_city && `City: ${m.address_city}`, m.business_website && `Website: ${m.business_website}`].filter(Boolean).join("\n");
  const net = network ? ` Optimize tone/length for ${network}.` : "";
  const raw = await llm.complete({
    system: `You write social media posts for small businesses. ${facts ? `BUSINESS FACTS:\n${facts}\n` : ""}Write one engaging, specific post. A few relevant hashtags are fine. No markdown, no preamble.${net} Respond as ONE JSON object: {"text":"..."}.`,
    user: `Write the post. Brief: ${brief}`,
    jsonObject: true,
    temperature: 0.8,
  }, tenantId);
  if (!raw) return null;
  try { const j = JSON.parse(stripFences(raw)); if (typeof j.text === "string") return { text: j.text.slice(0, 3000) }; } catch { /* */ }
  return null;
}
