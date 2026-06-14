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
  community?: string | null;          // parsed from City "City (Community)"
  transactionType?: string | null;    // For Sale | For Lease
  propertyClass?: string | null;      // Residential | Condo & Other | Commercial (derived)
  ownershipType?: string | null;      // RESO OwnershipType
  propertySubType?: string | null;
  associationFee?: number | null;     // condo/maintenance fee
  parkingTotal?: number | null;
  zoning?: string | null;             // commercial: RESO Zoning
  numberOfUnits?: number | null;      // commercial: RESO NumberOfUnitsTotal
  lotFrontage?: number | null;        // commercial/land: RESO FrontageLength
  businessType?: string | null;       // commercial: RESO BusinessType
  photosCount?: number | null;
  moreInfoUrl?: string | null;        // RESO MoreInformationLink (realtor.ca)
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
const str = (v: unknown): string | null => { const s = v == null ? null : String(v).trim(); return s && s !== "" && s.toLowerCase() !== "false" ? s : (s === "" ? null : (typeof v === "string" ? String(v).trim() || null : v == null ? null : String(v))); };
const text = (v: unknown): string | null => { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; };
/** First integer in a string (CREA's BuildingAreaTotal is a range like "3000 - 3500"). */
const firstNum = (v: unknown): number | null => { const m = String(v ?? "").match(/\d[\d,]*/); return m ? Number(m[0].replace(/,/g, "")) : null; };
/** Normalize CREA's RFC-2822 ("Tue, 09 Jun 2026 22:37:35 GMT") or other date → ISO. */
function toIso(v: unknown): string | null { if (!v) return null; const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d.toISOString(); }
/** "Vaughan (Vellore Village)" → { city: "Vaughan", community: "Vellore Village" }. */
function splitCity(raw: unknown): { city: string | null; community: string | null } {
  const s = text(raw); if (!s) return { city: null, community: null };
  const m = s.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { city: m[1].trim(), community: m[2].trim() } : { city: s, community: null };
}
/** Group CREA's coarse PropertyType + OwnershipType into the myRealPage-style search classes. */
const COMMERCIAL_TYPES = ["retail", "office", "industrial", "business", "multi-family", "multi family", "hospitality", "agriculture"];
function derivePropertyClass(propertyType: unknown, ownershipType: unknown): string {
  const pt = String(propertyType ?? "").trim().toLowerCase();
  if (COMMERCIAL_TYPES.includes(pt)) return "Commercial";
  const isCondo = /cond|strata/i.test(String(ownershipType ?? ""));
  if (pt === "single family" && !isCondo) return "Residential";
  return "Condo & Other"; // condos, vacant land, parking, and anything non-residential/non-commercial
}

/**
 * Map a CREA DDF / RESO Data Dictionary record → NormalizedListing. Verified against the live CREA
 * feed (2026-06-14): DDF carries only active listings (no status field), City embeds the community,
 * BuildingAreaTotal is a range string, dates are RFC-2822. Same mapper serves any RESO feed (TRREB).
 */
export function mapResoRecord(r: Record<string, any>): NormalizedListing {
  const media: NormalizedMedia[] = Array.isArray(r.Media)
    ? r.Media.map((m: any, i: number) => ({ url: String(m?.MediaURL ?? m?.Uri ?? m), sortOrder: Number(m?.Order ?? i), kind: "photo" })).filter((m: NormalizedMedia) => m.url && m.url !== "undefined")
    : [];
  const { city, community } = splitCity(r.City);
  const lease = text(r.Lease);
  return {
    sourceKey: String(r.ListingKey ?? r.ListingId ?? r.ListingKeyNumeric),
    mlsNumber: text(r.ListingId ?? r.MlsNumber),
    status: text(r.StandardStatus ?? r.MlsStatus) ?? "Active", // DDF only distributes active listings
    propertyType: text(r.PropertyType ?? r.PropertySubType),
    listPrice: (num(r.ListPrice) || null) ?? firstNum(r.Lease), // leases carry price in Lease, ListPrice="0"
    currency: text(r.Currency) ?? "CAD",
    addressStreet: text(r.UnparsedAddress) ?? ([r.StreetNumber, r.StreetName, r.StreetSuffix].map((x) => text(x)).filter(Boolean).join(" ") || null),
    addressUnit: text(r.UnitNumber),
    addressCity: city,
    addressProvince: text(r.StateOrProvince),
    addressPostalCode: text(r.PostalCode),
    addressCountry: text(r.Country) ?? "CA",
    latitude: num(r.Latitude),
    longitude: num(r.Longitude),
    bedrooms: num(r.BedroomsTotal),
    bathrooms: num(r.BathroomsTotal ?? r.BathroomsTotalInteger),
    sqftTotal: firstNum(r.BuildingAreaTotal ?? r.LivingArea),
    lotSizeSqft: num(r.LotSizeSquareFeet) ?? firstNum(r.LotSizeArea),
    yearBuilt: num(r.YearBuilt),
    publicRemarks: text(r.PublicRemarks),
    listingBrokerageName: text(r.ListOfficeName),
    listingAgentName: text(r.ListAgentFullName),
    community,
    transactionType: lease ? "For Lease" : "For Sale",
    propertyClass: derivePropertyClass(r.PropertyType, r.OwnershipType),
    ownershipType: text(r.OwnershipType),
    propertySubType: text(r.PropertySubType ?? r.ArchitecturalStyle),
    associationFee: num(r.AssociationFee),
    parkingTotal: num(r.ParkingTotal),
    zoning: text(r.Zoning),
    numberOfUnits: num(r.NumberOfUnitsTotal),
    lotFrontage: num(r.FrontageLength) ?? firstNum(r.LotFrontage),
    businessType: text(r.BusinessType),
    photosCount: num(r.PhotosCount),
    moreInfoUrl: text(r.MoreInformationLink),
    modificationTimestamp: toIso(r.ModificationTimestamp) ?? new Date(0).toISOString(),
    raw: r,
    media,
  };
}
