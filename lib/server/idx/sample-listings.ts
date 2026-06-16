import { upsertListings } from "./store";
import type { NormalizedListing } from "./adapter";

/**
 * SAMPLE MLS data (D-372 / D-374 — sample-data-first). Every provider lets agents build & launch
 * their site on demo listings while IDX/VOW board approval is in flight, then flips to the live
 * CREA/DDF feed on approval. These ride the EXACT same pipeline as real listings: seeded into
 * `idx_listings` with `source="sample"`, so the SiteListings weblet, area pages, search, and
 * detail pages all work UNCHANGED. On go-live: sync `source="ddf"` then drop the sample rows.
 *
 * 18 GTA-luxury listings across 6 cities × neighbourhoods (mirrors public/luxury-preview.html).
 */

const PHOTOS = [
  "1564013799919-ab600027ffc6", "1600596542815-ffad4c1539a9", "1600585154340-be6161a56a0c",
  "1568605114967-8130f3a36994", "1570129477492-45c003edd2be", "1580587771525-78b9dba3b914",
  "1512917774080-9991f1c4c750", "1600607687939-ce8a6c25118c",
];
const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1280&q=80`;
const gallery = (seed: number) => [0, 1, 2].map((k, i) => ({ url: img(PHOTOS[(seed + k) % PHOTOS.length]), sortOrder: i, kind: "photo" }));

interface Seed {
  key: string; mls: string; price: number; street: string; city: string; hood: string;
  beds: number; baths: number; sqft: number; cls: "Residential" | "Condo & Other"; sub: string;
  status: "Active" | "Sold"; tx: "For Sale" | "For Lease"; lat: number; lng: number; img: number;
}

const SEEDS: Seed[] = [
  { key: "sample-001", mls: "N7012001", price: 6900000, street: "144 Old Forest Hill Rd", city: "Toronto", hood: "Forest Hill", beds: 6, baths: 8, sqft: 9100, cls: "Residential", sub: "Estate", status: "Active", tx: "For Sale", lat: 43.6960, lng: -79.4170, img: 0 },
  { key: "sample-002", mls: "C7012002", price: 1895000, street: "88 Yorkville Ave, PH04", city: "Toronto", hood: "Yorkville", beds: 2, baths: 3, sqft: 1720, cls: "Condo & Other", sub: "Condo Apartment", status: "Active", tx: "For Sale", lat: 43.6710, lng: -79.3900, img: 2 },
  { key: "sample-003", mls: "C7012003", price: 4250000, street: "21 Rosedale Heights Dr", city: "Toronto", hood: "Rosedale", beds: 5, baths: 5, sqft: 5200, cls: "Residential", sub: "Detached", status: "Sold", tx: "For Sale", lat: 43.6840, lng: -79.3800, img: 5 },
  { key: "sample-004", mls: "N7012004", price: 4250000, street: "21 Castle Rock Dr", city: "Vaughan", hood: "Kleinburg", beds: 5, baths: 6, sqft: 6400, cls: "Residential", sub: "Estate", status: "Active", tx: "For Sale", lat: 43.8460, lng: -79.6300, img: 1 },
  { key: "sample-005", mls: "N7012005", price: 2150000, street: "52 Thornhill Woods Dr", city: "Vaughan", hood: "Thornhill", beds: 4, baths: 4, sqft: 3800, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.8200, lng: -79.4600, img: 3 },
  { key: "sample-006", mls: "N7012006", price: 8500, street: "9 Islington Woods Ct", city: "Vaughan", hood: "Woodbridge", beds: 5, baths: 5, sqft: 4600, cls: "Residential", sub: "Detached", status: "Active", tx: "For Lease", lat: 43.7900, lng: -79.6000, img: 6 },
  { key: "sample-007", mls: "N7012007", price: 2980000, street: "30 Bayview Hill Cres", city: "Richmond Hill", hood: "Bayview Hill", beds: 5, baths: 5, sqft: 4400, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.8700, lng: -79.4000, img: 4 },
  { key: "sample-008", mls: "N7012008", price: 1750000, street: "12 Oak Ridges Lake Rd", city: "Richmond Hill", hood: "Oak Ridges", beds: 4, baths: 3, sqft: 3100, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.9450, lng: -79.4550, img: 7 },
  { key: "sample-009", mls: "N7012009", price: 3400000, street: "8 Mill Pond Close", city: "Richmond Hill", hood: "Mill Pond", beds: 5, baths: 6, sqft: 5600, cls: "Residential", sub: "Estate", status: "Sold", tx: "For Sale", lat: 43.8780, lng: -79.4420, img: 0 },
  { key: "sample-010", mls: "N7012010", price: 2490000, street: "45 Old Stone Rd", city: "Markham", hood: "Unionville", beds: 4, baths: 4, sqft: 3900, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.8650, lng: -79.3100, img: 1 },
  { key: "sample-011", mls: "N7012011", price: 3250000, street: "19 Cachet Pkwy", city: "Markham", hood: "Cachet", beds: 5, baths: 6, sqft: 5100, cls: "Residential", sub: "Estate", status: "Active", tx: "For Sale", lat: 43.8880, lng: -79.3600, img: 5 },
  { key: "sample-012", mls: "N7012012", price: 1990000, street: "77 Angus Glen Blvd", city: "Markham", hood: "Angus Glen", beds: 4, baths: 4, sqft: 3500, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.8980, lng: -79.2900, img: 3 },
  { key: "sample-013", mls: "N7012013", price: 3800000, street: "5 Aurora Estates Dr", city: "Aurora", hood: "Aurora Estates", beds: 5, baths: 6, sqft: 6000, cls: "Residential", sub: "Estate", status: "Active", tx: "For Sale", lat: 43.9990, lng: -79.4500, img: 6 },
  { key: "sample-014", mls: "N7012014", price: 1650000, street: "40 Bayview Wellington Ave", city: "Aurora", hood: "Bayview Wellington", beds: 4, baths: 3, sqft: 2900, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 44.0050, lng: -79.4400, img: 4 },
  { key: "sample-015", mls: "N7012015", price: 12000, street: "14 St Andrews Hill Ct", city: "Aurora", hood: "Hills of St. Andrew", beds: 5, baths: 5, sqft: 5200, cls: "Residential", sub: "Detached", status: "Active", tx: "For Lease", lat: 44.0100, lng: -79.4700, img: 7 },
  { key: "sample-016", mls: "N7012016", price: 5400000, street: "2 King Summit Rd", city: "King", hood: "King City", beds: 6, baths: 7, sqft: 8200, cls: "Residential", sub: "Estate", status: "Active", tx: "For Sale", lat: 43.9230, lng: -79.5280, img: 0 },
  { key: "sample-017", mls: "N7012017", price: 2750000, street: "33 Nobleton Lakes Dr", city: "King", hood: "Nobleton", beds: 5, baths: 5, sqft: 4700, cls: "Residential", sub: "Detached", status: "Active", tx: "For Sale", lat: 43.9080, lng: -79.6500, img: 1 },
  { key: "sample-018", mls: "N7012018", price: 1450000, street: "7 Schomberg Main St", city: "King", hood: "Schomberg", beds: 4, baths: 3, sqft: 2600, cls: "Residential", sub: "Detached", status: "Sold", tx: "For Sale", lat: 44.0050, lng: -79.6850, img: 2 },
];

const BASE_TS = Date.parse("2026-06-15T12:00:00Z");

/** Build the normalized sample listings (deterministic — stable keys + descending timestamps). */
export function sampleListings(brokerage = "AI Biz Connect Realty", agent = "Ali Bolourchi"): NormalizedListing[] {
  return SEEDS.map((s, i) => ({
    sourceKey: s.key,
    mlsNumber: s.mls,
    status: s.status,
    propertyType: s.cls === "Condo & Other" ? "Condominium" : "Residential",
    listPrice: s.price,
    currency: "CAD",
    addressStreet: s.street,
    addressCity: s.city,
    addressProvince: "ON",
    addressCountry: "CA",
    latitude: s.lat,
    longitude: s.lng,
    bedrooms: s.beds,
    bathrooms: s.baths,
    sqftTotal: s.sqft,
    publicRemarks: `${s.sub} in ${s.hood}, ${s.city}. Presented by ${agent}. Sample listing for site preview — replaced by live MLS data on IDX/VOW approval.`,
    listingBrokerageName: brokerage,
    listingAgentName: agent,
    community: s.hood,
    transactionType: s.tx,
    propertyClass: s.cls,
    propertySubType: s.sub,
    photosCount: 3,
    modificationTimestamp: new Date(BASE_TS - i * 36e5).toISOString(),
    media: gallery(s.img),
  }));
}

/** Seed the sample listings for a tenant (idempotent — stable source keys upsert). Returns counts. */
export async function seedSampleListings(
  tenantId: string,
  opts: { brokerage?: string; agent?: string } = {},
): Promise<{ created: number; updated: number; mediaWritten: number }> {
  return upsertListings(tenantId, "sample", sampleListings(opts.brokerage, opts.agent));
}
