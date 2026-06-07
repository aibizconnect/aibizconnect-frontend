import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Reputation — collect, monitor, and showcase reviews. Customers leave reviews on a
 * public review page; the tenant moderates (publish/hide) and sees rating stats. No
 * send/charge here (review-request sending is a later gated step).
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface Review { id: string; author: string; rating: number; body: string; source: string; status: "published" | "hidden"; createdAt: string; }
export interface ReviewStats { count: number; avg: number; distribution: Record<1 | 2 | 3 | 4 | 5, number>; }

export async function listReviews(tenantId: string, opts?: { publishedOnly?: boolean }): Promise<Review[]> {
  let q = service().from("tenant_reviews").select("id,author,rating,body,source,status,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (opts?.publishedOnly) q = q.eq("status", "published");
  const { data } = await q;
  return (data ?? []).map((r: any) => ({ id: r.id, author: r.author ?? "Anonymous", rating: r.rating, body: r.body ?? "", source: r.source, status: r.status, createdAt: r.created_at }));
}

export function reviewStats(reviews: Review[]): ReviewStats {
  const pub = reviews.filter((r) => r.status === "published");
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of pub) dist[r.rating as 1 | 2 | 3 | 4 | 5]++;
  const avg = pub.length ? pub.reduce((a, r) => a + r.rating, 0) / pub.length : 0;
  return { count: pub.length, avg: Math.round(avg * 10) / 10, distribution: dist };
}

export async function addReview(tenantId: string, r: { author?: string; rating: number; body?: string; source?: string }): Promise<{ ok: boolean; error?: string }> {
  const rating = Math.max(1, Math.min(5, Math.round(r.rating)));
  const { error } = await service().from("tenant_reviews").insert({ tenant_id: tenantId, author: r.author ?? "Anonymous", rating, body: r.body ?? "", source: r.source ?? "website" });
  return { ok: !error, error: error?.message };
}

export async function setReviewStatus(tenantId: string, id: string, status: "published" | "hidden"): Promise<void> {
  await service().from("tenant_reviews").update({ status }).eq("tenant_id", tenantId).eq("id", id);
}
export async function deleteReview(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_reviews").delete().eq("tenant_id", tenantId).eq("id", id);
}
