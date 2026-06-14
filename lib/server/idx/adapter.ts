/**
 * IDX feed adapter contract (G4, D-346). One interface; `ddf` is implementation #1. Future
 * MLS/aggregators (Bridge, Trestle, MLS Grid…) implement the same interface without touching the
 * store or UI. All adapters emit listings normalized to the RESO Data Dictionary (D-347).
 */

export interface NormalizedMedia { url: string; sortOrder?: number; kind?: string }

export interface NormalizedListing {
  sourceKey: string;                 // RESO ListingKey
  mlsNumber?: string | null;
  status?: string | null;            // RESO StandardStatus (Active | Sold | Pending | …)
  propertyType?: string | null;      // Residential | Condominium | MultiFamily | Commercial | Land | Farm | Rental | Other
  listPrice?: number | null;
  currency?: string | null;
  addressStreet?: string | null;
  addressUnit?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;   // RESO StateOrProvince
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqftTotal?: number | null;         // RESO LivingArea
  lotSizeSqft?: number | null;
  yearBuilt?: number | null;
  publicRemarks?: string | null;
  listingBrokerageName?: string | null;  // RESO ListOfficeName (attribution)
  listingAgentName?: string | null;
  modificationTimestamp: string;     // RESO ModificationTimestamp (ISO) — replication cursor
  raw?: unknown;
  media?: NormalizedMedia[];
}

export interface PullResult {
  listings: NormalizedListing[];
  /** the max ModificationTimestamp seen — advances the replication cursor */
  nextSince?: string | null;
  /** true when this pull drained the feed (no more pages) */
  complete: boolean;
}

export interface FeedRuntime {
  source: string;
  method: string;                    // rest | rets
  endpoint?: string | null;
  credentials?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;  // scoping: boardIds/cities/provinces
}

export interface FeedAdapter {
  /** Cheap connectivity/auth check for the admin "Test sync" button. */
  verify(): Promise<{ ok: boolean; error?: string; sample?: number }>;
  /** Pull listings modified since `sinceIso` (null = full initial pull). */
  pullModifiedSince(sinceIso: string | null): Promise<PullResult>;
}

const num = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const str = (v: unknown): string | null => (v == null ? null : String(v));

/** Map a RESO Data Dictionary record → NormalizedListing (D-347). Field names are RESO-standard,
 *  so this is correct ahead of the live DDF wire-up; only the transport/auth differs per feed. */
export function mapResoRecord(r: Record<string, any>): NormalizedListing {
  const media: NormalizedMedia[] = Array.isArray(r.Media)
    ? r.Media.map((m: any, i: number) => ({ url: String(m?.MediaURL ?? m?.Uri ?? m), sortOrder: Number(m?.Order ?? i), kind: "photo" })).filter((m: NormalizedMedia) => m.url && m.url !== "undefined")
    : [];
  return {
    sourceKey: String(r.ListingKey ?? r.ListingId ?? r.ListingKeyNumeric),
    mlsNumber: str(r.ListingId ?? r.MlsNumber),
    status: str(r.StandardStatus ?? r.MlsStatus),
    propertyType: str(r.PropertyType ?? r.PropertySubType),
    listPrice: num(r.ListPrice),
    currency: str(r.Currency) ?? "CAD",
    addressStreet: str(r.UnparsedAddress ?? ([r.StreetNumber, r.StreetName, r.StreetSuffix].filter(Boolean).join(" ") || null)),
    addressUnit: str(r.UnitNumber),
    addressCity: str(r.City),
    addressProvince: str(r.StateOrProvince),
    addressPostalCode: str(r.PostalCode),
    addressCountry: str(r.Country) ?? "CA",
    latitude: num(r.Latitude),
    longitude: num(r.Longitude),
    bedrooms: num(r.BedroomsTotal),
    bathrooms: num(r.BathroomsTotalInteger ?? r.BathroomsTotal),
    sqftTotal: num(r.LivingArea ?? r.BuildingAreaTotal),
    lotSizeSqft: num(r.LotSizeSquareFeet ?? r.LotSizeArea),
    yearBuilt: num(r.YearBuilt),
    publicRemarks: str(r.PublicRemarks),
    listingBrokerageName: str(r.ListOfficeName),
    listingAgentName: str(r.ListAgentFullName),
    modificationTimestamp: String(r.ModificationTimestamp ?? new Date(0).toISOString()),
    raw: r,
    media,
  };
}
