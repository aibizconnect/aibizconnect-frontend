"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getFeed, saveFeed, getFeedRuntime, type FeedView } from "@/lib/server/idx/feeds";
import { createDdfAdapter } from "@/lib/server/idx/ddf";
import { runTenantSync } from "@/lib/server/idx/sync";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listBlockDomains, upsertBlockDomain, deleteBlockDomain, type BlockDomain } from "@/lib/server/idx/block-domains";
import type { BlockFilter } from "@/lib/idx/block-config";

/** IDX feed admin actions (G4). Credentials are encrypted server-side and never returned. */

export async function getFeedAction(tenantId: string): Promise<FeedView | null> {
  await requireTenantAccess(tenantId);
  try { return await getFeed(tenantId); } catch { return null; }
}

export async function saveFeedAction(tenantId: string, input: { method?: string; endpoint?: string; credentials?: Record<string, unknown>; config?: Record<string, unknown>; termsAccepted?: boolean }): Promise<{ ok: boolean; error?: string; feed: FeedView | null }> {
  await requireTenantAccess(tenantId);
  const r = await saveFeed(tenantId, input);
  return { ok: r.ok, error: r.error, feed: await getFeed(tenantId) };
}

/** Verify connectivity (and, if the feed is active, run a one-shot sync). */
export async function testSyncAction(tenantId: string): Promise<{ ok: boolean; error?: string; sample?: number; counts?: unknown }> {
  await requireTenantAccess(tenantId);
  const rt = await getFeedRuntime(tenantId);
  if (!rt) return { ok: false, error: "Configure the feed first." };
  const v = await createDdfAdapter(rt).verify();
  if (!v.ok) return { ok: false, error: v.error };
  const feed = await getFeed(tenantId);
  if (feed?.status === "active") { const counts = await runTenantSync(tenantId); return { ok: true, sample: v.sample, counts }; }
  return { ok: true, sample: v.sample };
}

/** Listings-block domain layer (D-361): which hostnames may embed the block, and their scope. */
export async function listBlockDomainsAction(tenantId: string): Promise<BlockDomain[]> {
  await requireTenantAccess(tenantId);
  return listBlockDomains(tenantId).catch(() => []);
}

export async function saveBlockDomainAction(
  tenantId: string,
  input: { id?: string; domain: string; label?: string | null; filter?: BlockFilter; active?: boolean },
): Promise<{ ok: boolean; error?: string; domains: BlockDomain[] }> {
  await requireTenantAccess(tenantId);
  const r = await upsertBlockDomain(tenantId, input);
  return { ...r, domains: await listBlockDomains(tenantId).catch(() => []) };
}

export async function deleteBlockDomainAction(tenantId: string, id: string): Promise<{ ok: boolean; error?: string; domains: BlockDomain[] }> {
  await requireTenantAccess(tenantId);
  const r = await deleteBlockDomain(tenantId, id);
  return { ...r, domains: await listBlockDomains(tenantId).catch(() => []) };
}

/**
 * Testing mode: keep the block rendering on unregistered domains (as a labelled preview) while an
 * agent wires up their GHL test site. Stored on the feed config so it needs no extra DDL.
 */
export async function getBlockTestModeAction(tenantId: string): Promise<boolean> {
  await requireTenantAccess(tenantId);
  const feed = await getFeed(tenantId).catch(() => null);
  return !!(feed?.config as { blockTestMode?: boolean } | undefined)?.blockTestMode;
}

export async function setBlockTestModeAction(tenantId: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  const feed = await getFeed(tenantId).catch(() => null);
  if (!feed) return { ok: false, error: "Configure the feed first." };
  return saveFeed(tenantId, { config: { ...feed.config, blockTestMode: on } });
}

export async function getSyncHealthAction(tenantId: string): Promise<{ lastRunAt: string | null; status: string | null; counts: unknown; listingCount: number }> {
  await requireTenantAccess(tenantId);
  const sb = createSupabaseServiceClient();
  const [{ data: st }, { count }] = await Promise.all([
    sb.from("idx_sync_state").select("last_run_at, status, counts").eq("tenant_id", tenantId).eq("source", "ddf").maybeSingle(),
    sb.from("idx_listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("inactive_at", null),
  ]);
  return { lastRunAt: st?.last_run_at ?? null, status: st?.status ?? null, counts: st?.counts ?? null, listingCount: count ?? 0 };
}
