import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { NormalizedListing } from "./adapter";

/** IDX listings store (G4). Upserts normalized listings + media, manages the sync cursor and the
 *  ≥90-day retention purge (D-350). Read helpers power the public search/detail surfaces. */

const svc = () => createSupabaseServiceClient();

export interface SyncCounts {
  lastRunAt: string; status: "success" | "partial_success" | "failed";
  totalProcessed: number; created: number; updated: number; deleted: number; mediaWritten: number;
  errors: { timestamp: string; code: string; message: string }[];
}

export async function getSyncState(tenantId: string, source = "ddf"): Promise<{ lastModificationTs: string | null }> {
  const { data } = await svc().from("idx_sync_state").select("last_modification_ts").eq("tenant_id", tenantId).eq("source", source).maybeSingle();
  return { lastModificationTs: data?.last_modification_ts ?? null };
}
export async function setSyncState(tenantId: string, source: string, patch: { lastModificationTs?: string | null; status: string; error?: string | null; counts: SyncCounts }): Promise<void> {
  const row: Record<string, unknown> = { tenant_id: tenantId, source, last_run_at: new Date().toISOString(), status: patch.status, error: patch.error ?? null, counts: patch.counts };
  if (patch.lastModificationTs !== undefined) row.last_modification_ts = patch.lastModificationTs;
  await svc().from("idx_sync_state").upsert(row, { onConflict: "tenant_id,source" });
}

/** Upsert a batch of listings (+ replace media). Returns created/updated/mediaWritten counts. */
export async function upsertListings(tenantId: string, source: string, listings: NormalizedListing[]): Promise<{ created: number; updated: number; mediaWritten: number }> {
  const sb = svc();
  let created = 0, updated = 0, mediaWritten = 0;
  for (const l of listings) {
    const row = {
      tenant_id: tenantId, source, source_key: l.sourceKey, mls_number: l.mlsNumber ?? null, status: l.status ?? null,
      property_type: l.propertyType ?? null, list_price: l.listPrice ?? null, currency: l.currency ?? "CAD",
      address_street: l.addressStreet ?? null, address_unit: l.addressUnit ?? null, address_city: l.addressCity ?? null,
      address_province: l.addressProvince ?? null, address_postal_code: l.addressPostalCode ?? null, address_country: l.addressCountry ?? "CA",
      latitude: l.latitude ?? null, longitude: l.longitude ?? null, bedrooms: l.bedrooms ?? null, bathrooms: l.bathrooms ?? null,
      sqft_total: l.sqftTotal ?? null, lot_size_sqft: l.lotSizeSqft ?? null, year_built: l.yearBuilt ?? null,
      public_remarks: l.publicRemarks ?? null, listing_brokerage_name: l.listingBrokerageName ?? null, listing_agent_name: l.listingAgentName ?? null,
      community: l.community ?? null, transaction_type: l.transactionType ?? null, photos_count: l.photosCount ?? null, more_info_url: l.moreInfoUrl ?? null,
      modification_timestamp: l.modificationTimestamp, inactive_at: null, raw_data: l.raw ?? {}, updated_at: new Date().toISOString(),
    };
    // Was it already present? (to count created vs updated)
    const { data: existing } = await sb.from("idx_listings").select("id").eq("tenant_id", tenantId).eq("source", source).eq("source_key", l.sourceKey).maybeSingle();
    const { data: up, error } = await sb.from("idx_listings").upsert(row, { onConflict: "tenant_id,source,source_key" }).select("id").single();
    if (error || !up) continue;
    if (existing) updated++; else created++;
    if (l.media && l.media.length) {
      await sb.from("idx_listing_media").delete().eq("tenant_id", tenantId).eq("listing_id", up.id);
      const rows = l.media.map((m, i) => ({ tenant_id: tenantId, listing_id: up.id, url: m.url, sort_order: m.sortOrder ?? i, kind: m.kind ?? "photo" }));
      const { error: me } = await sb.from("idx_listing_media").insert(rows);
      if (!me) mediaWritten += rows.length;
    }
  }
  return { created, updated, mediaWritten };
}

/** Mark listings no longer present in a FULL pull as inactive (set inactive_at). seenKeys = keys in this pull. */
export async function markInactiveExcept(tenantId: string, source: string, seenKeys: string[]): Promise<number> {
  if (!seenKeys.length) return 0;
  const sb = svc();
  const { data } = await sb.from("idx_listings").select("id, source_key").eq("tenant_id", tenantId).eq("source", source).is("inactive_at", null);
  const stale = (data ?? []).filter((r: any) => !seenKeys.includes(r.source_key)).map((r: any) => r.id);
  if (!stale.length) return 0;
  await sb.from("idx_listings").update({ inactive_at: new Date().toISOString() }).in("id", stale);
  return stale.length;
}

/** Purge listings inactive longer than the retention window (D-350: 90 days). */
export async function purgeInactive(tenantId: string, source: string, retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const sb = svc();
  const { data } = await sb.from("idx_listings").select("id").eq("tenant_id", tenantId).eq("source", source).not("inactive_at", "is", null).lt("inactive_at", cutoff);
  const ids = (data ?? []).map((r: any) => r.id);
  if (!ids.length) return 0;
  await sb.from("idx_listing_media").delete().in("listing_id", ids);
  await sb.from("idx_listings").delete().in("id", ids);
  return ids.length;
}

// ── areas: Municipality -> Community hierarchy (for SEO area pages) ──────────────
export function areaSlug(s: string): string {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "area";
}
export interface AreaCount { name: string; slug: string; count: number }
export async function listMunicipalities(tenantId: string): Promise<AreaCount[]> {
  const { data, error } = await svc().rpc("idx_municipalities", { p_tenant: tenantId });
  if (error) return [];
  return (data ?? []).map((r: any) => ({ name: r.municipality, slug: areaSlug(r.municipality), count: Number(r.n) }));
}
export async function listCommunities(tenantId: string, municipality: string): Promise<AreaCount[]> {
  const { data, error } = await svc().rpc("idx_communities", { p_tenant: tenantId, p_municipality: municipality });
  if (error) return [];
  return (data ?? []).map((r: any) => ({ name: r.community, slug: areaSlug(r.community), count: Number(r.n) }));
}
/** Resolve a municipality slug back to its exact DB name. */
export async function municipalityFromSlug(tenantId: string, slug: string): Promise<AreaCount | null> {
  return (await listMunicipalities(tenantId)).find((m) => m.slug === slug) ?? null;
}
export async function communityFromSlug(tenantId: string, municipality: string, slug: string): Promise<AreaCount | null> {
  return (await listCommunities(tenantId, municipality)).find((c) => c.slug === slug) ?? null;
}

// ── read (display) ────────────────────────────────────────────────────────────
export interface ListingFilter { city?: string; municipality?: string; community?: string; minPrice?: number; maxPrice?: number; beds?: number; baths?: number; propertyType?: string; status?: string; q?: string; page?: number; pageSize?: number }
export interface ListingCard { id: string; mlsNumber: string | null; status: string | null; propertyType: string | null; listPrice: number | null; currency: string; city: string | null; province: string | null; beds: number | null; baths: number | null; sqft: number | null; brokerage: string | null; modifiedAt: string; cover: string | null }

export async function listListings(tenantId: string, f: ListingFilter = {}): Promise<{ rows: ListingCard[]; total: number }> {
  const sb = svc();
  const pageSize = Math.min(f.pageSize ?? 24, 100); const page = Math.max(0, f.page ?? 0);
  let q = sb.from("idx_listings").select("*", { count: "exact" }).eq("tenant_id", tenantId).is("inactive_at", null);
  q = q.eq("status", f.status ?? "Active");
  if (f.municipality) q = q.eq("address_city", f.municipality);
  else if (f.city) q = q.ilike("address_city", `%${f.city}%`);
  if (f.community) q = q.eq("community", f.community);
  if (f.minPrice != null) q = q.gte("list_price", f.minPrice);
  if (f.maxPrice != null) q = q.lte("list_price", f.maxPrice);
  if (f.beds != null) q = q.gte("bedrooms", f.beds);
  if (f.baths != null) q = q.gte("bathrooms", f.baths);
  if (f.propertyType) q = q.eq("property_type", f.propertyType);
  q = q.order("modification_timestamp", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, count, error } = await q;
  if (error) return { rows: [], total: 0 };
  const ids = (data ?? []).map((r: any) => r.id);
  const covers = new Map<string, string>();
  if (ids.length) {
    const { data: media } = await sb.from("idx_listing_media").select("listing_id, url, sort_order").eq("tenant_id", tenantId).in("listing_id", ids).order("sort_order", { ascending: true });
    for (const m of media ?? []) if (!covers.has(m.listing_id)) covers.set(m.listing_id, m.url);
  }
  const rows: ListingCard[] = (data ?? []).map((r: any) => ({
    id: r.id, mlsNumber: r.mls_number, status: r.status, propertyType: r.property_type, listPrice: r.list_price != null ? Number(r.list_price) : null,
    currency: r.currency ?? "CAD", city: r.address_city, province: r.address_province, beds: r.bedrooms, baths: r.bathrooms != null ? Number(r.bathrooms) : null,
    sqft: r.sqft_total != null ? Number(r.sqft_total) : null, brokerage: r.listing_brokerage_name, modifiedAt: r.modification_timestamp, cover: covers.get(r.id) ?? null,
  }));
  return { rows, total: count ?? 0 };
}

export async function getListing(tenantId: string, id: string): Promise<{ listing: any; media: { url: string }[] } | null> {
  const sb = svc();
  const { data } = await sb.from("idx_listings").select("*").eq("tenant_id", tenantId).eq("id", id).is("inactive_at", null).maybeSingle();
  if (!data) return null;
  const { data: media } = await sb.from("idx_listing_media").select("url").eq("tenant_id", tenantId).eq("listing_id", id).order("sort_order", { ascending: true });
  return { listing: data, media: (media ?? []).map((m: any) => ({ url: m.url })) };
}
