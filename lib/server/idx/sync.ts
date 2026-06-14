import { listActiveFeeds, getFeedRuntime } from "./feeds";
import { createDdfAdapter } from "./ddf";
import { getSyncState, setSyncState, upsertListings, purgeInactive, type SyncCounts } from "./store";
import type { FeedAdapter, FeedRuntime } from "./adapter";

/** IDX sync engine (G4, D-350: 15-min cadence + 90-day retention). Cross-tenant, idempotent
 *  (upsert by source_key; skips when ModificationTimestamp unchanged). Flag-gated. */

function adapterFor(rt: FeedRuntime): FeedAdapter | null {
  if (rt.source === "ddf") return createDdfAdapter(rt);
  return null; // future: bridge, trestle, mlsgrid…
}

export async function runTenantSync(tenantId: string, source = "ddf"): Promise<SyncCounts> {
  const now = new Date().toISOString();
  const base: SyncCounts = { lastRunAt: now, status: "success", totalProcessed: 0, created: 0, updated: 0, deleted: 0, mediaWritten: 0, errors: [] };
  try {
    const rt = await getFeedRuntime(tenantId, source);
    if (!rt) { base.status = "failed"; base.errors.push({ timestamp: now, code: "no_feed", message: "Feed not configured." }); return base; }
    const adapter = adapterFor(rt);
    if (!adapter) { base.status = "failed"; base.errors.push({ timestamp: now, code: "no_adapter", message: `No adapter for ${source}.` }); return base; }

    const { lastModificationTs } = await getSyncState(tenantId, source);
    const pull = await adapter.pullModifiedSince(lastModificationTs);
    base.totalProcessed = pull.listings.length;
    if (pull.listings.length) {
      const r = await upsertListings(tenantId, source, pull.listings);
      base.created = r.created; base.updated = r.updated; base.mediaWritten = r.mediaWritten;
    }
    base.deleted = await purgeInactive(tenantId, source, 90).catch(() => 0);
    await setSyncState(tenantId, source, { lastModificationTs: pull.nextSince ?? lastModificationTs, status: base.status, counts: base });
    return base;
  } catch (e: any) {
    base.status = "failed"; base.errors.push({ timestamp: now, code: "exception", message: e?.message ?? "sync failed" });
    await setSyncState(tenantId, source, { status: "failed", error: e?.message ?? null, counts: base }).catch(() => {});
    return base;
  }
}

/** CRON entry — run every active, terms-accepted feed (the feed-active flag is the gate). */
export async function runDueIdxSync(): Promise<{ feeds: number; created: number; updated: number; deleted: number; failed: number }> {
  const feeds = await listActiveFeeds();
  let created = 0, updated = 0, deleted = 0, failed = 0;
  for (const f of feeds) {
    const c = await runTenantSync(f.tenantId, f.source);
    created += c.created; updated += c.updated; deleted += c.deleted;
    if (c.status === "failed") failed += 1;
  }
  return { feeds: feeds.length, created, updated, deleted, failed };
}
