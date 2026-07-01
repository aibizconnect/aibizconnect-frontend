# CREA DDF / IDX — everything we know

Real-estate listings for AIBizConnect tenant websites. Built G4 (decisions **D-346..352**),
RESO-normalized, multi-tenant, pluggable feed, **flag-gated** (nothing syncs or renders until a feed
is configured + DDF terms accepted). Ships on **sample data** so an agent can launch immediately,
then flips to the **live CREA DDF feed** on board approval.

- **Go-live steps** → [GO-LIVE.md](./GO-LIVE.md)
- **The 18 sample listings** → [SAMPLE-DATA.md](./SAMPLE-DATA.md)

---

## Vocabulary

| Term | Meaning |
|---|---|
| **IDX** | Internet Data Exchange — showing MLS listings on an agent's own site. |
| **VOW** | Virtual Office Website — logged-in buyer features (saved searches, favourites). Phase 2. |
| **DDF®** | CREA's **Data Distribution Facility** — the national feed of REALTOR.ca active listings. |
| **RESO** | Real Estate Standards Organization — the Data Dictionary all listings are normalized to. |

## What it does

- Pulls listings from a feed → normalizes to the RESO Data Dictionary → stores per-tenant.
- Powers the public site: **search**, **area pages** (Municipality → Community, for SEO), **listing
  detail** pages, and the **SiteListings** weblet — all identical whether the data is sample or live.
- **Sample-data-first:** new real-estate tenants are seeded with 18 GTA-luxury listings
  (`source="sample"`) during Genesis onboarding, so the site looks real day one. On go-live you sync
  `source="ddf"` and drop the sample rows.

---

## Architecture (the pipeline)

```
CREA DDF (RETS/HTTPS)  ──►  ddf.ts adapter  ──►  mapResoRecord (adapter.ts)  ──►  store.ts
   data.crea.ca            (login/search/          RESO record →                 upsert idx_listings
   Digest auth             object/logout)          NormalizedListing              + idx_listing_media
                                                                                   (by source_key)
                              ▲                                                        │
                     sync.ts (cron, 15-min, incremental cursor)                       ▼
                                                                        public search / area / detail / weblet
```

Everything lives in **`lib/server/idx/`**:

| File | Role |
|---|---|
| `adapter.ts` | The **contract** (`FeedAdapter` = `verify()` + `pullModifiedSince()`) + `NormalizedListing` shape + `mapResoRecord()` (RESO→normalized) + `derivePropertyClass()`. One interface; DDF is impl #1 — future Bridge / Trestle / MLS Grid plug in without touching the store or UI. |
| `ddf.ts` | The **CREA DDF adapter** — RETS 1.7.2 over HTTPS (Digest auth, DMQL2 query, COMPACT-Decoded parse). |
| `feeds.ts` | Per-tenant feed config + **AES-GCM-encrypted credentials** (`idx_feeds`). Credentials never leave the server. |
| `sync.ts` | The **sync engine** — `runTenantSync` (one tenant) + `runDueIdxSync` (cron, all active feeds). Incremental via the `last_modification_ts` cursor; idempotent. |
| `store.ts` | Upsert listings + media, mark-inactive, **90-day retention purge** (D-350), and all **read** helpers (search filters, detail, municipalities/communities/classes). |
| `sample-listings.ts` | The 18 sample listings + `seedSampleListings()`. |

### The CREA DDF protocol (from CREA's official docs, verified 2026-06-14)

**It's RETS 1.7.2 over HTTPS — NOT REST/OData.** Production base `https://data.crea.ca`.

| Step | Request |
|---|---|
| Login | `GET /Login.svc/Login` — HTTP **Digest** auth, realm `CREA.Distribution` → `X-SESSIONID` cookie |
| Search | `GET /Search.svc/Search?SearchType=Property&Class=Property&QueryType=DMQL2&Format=COMPACT-Decoded&Query=(LastUpdated=<RETSDateTime>)` |
| Photos | `GET /Object.svc/GetObject?Resource=Property&ID=<key>:*&Type=LargePhoto` (photos aren't in COMPACT) |
| Logout | `GET /Logout.svc/Logout` |

- **COMPACT-Decoded** = RESO Data Dictionary 1.0, tab-delimited `<COLUMNS>` + `<DATA>` blocks.
- DDF quirks the mapper handles: distributes **only active listings** (no status field → default
  "Active"); **City embeds the community** as `"City (Community)"`; `BuildingAreaTotal` is a range
  string (`"3000 - 3500"`); dates are RFC-2822; **leases** carry the price in `Lease` with
  `ListPrice=0`.
- **Photos** come via `GetObject` (not COMPACT), gated by `PhotosChangeTimestamp`, cached to **R2**
  (D-348). This photo pipeline + any live-response quirks finalize against real CREA credentials.

### Property classes (myRealPage-style)

CREA's `PropertyType` is coarse, so `derivePropertyClass()` groups into the search classes:
**Residential** · **Condo & Other** · **Commercial** (see `adapter.ts`). Migration `0072` adds the
commercial fields (zoning, units, lot frontage, business type) from DDF's 236-field payload.

---

## Data model (migrations 0070–0072)

| Table | What |
|---|---|
| `idx_feeds` | Per-tenant feed config + `encrypted_credentials` (AES-GCM) + `status` (pending/active/paused/error) + `terms_accepted`. Unique (tenant_id, source). |
| `idx_listings` | One normalized row per listing. Unique (tenant_id, source, source_key). `source` = `sample` \| `ddf`. `inactive_at` for retention. Indexes on status/city/community/price/mod-ts. |
| `idx_listing_media` | Photos (R2-cached URLs), ordered. |
| `idx_sync_state` | Replication cursor (`last_modification_ts`) + last run status/counts per (tenant, source). |
| `idx_saved_searches`, `idx_favorites` | **VOW** (phase 2) — keyed to the Client-Portal contact. |

RPCs: `idx_municipalities`, `idx_communities` (0070), `idx_property_classes` (0071) — power the SEO
area pages + class filters. **RLS:** enabled on all `idx_*` tables (0070) with interim-open policies
(the deferred hardening in `SECURITY-PLAN.md`); `idx_feeds` credentials are encrypted and never
returned to the client.

---

## Sample vs live — how the app knows

- `lib/server/tenant-blueprint.ts` reports **`sampleListings`** (count where `source="sample"`) and
  whether a **live CREA DDF feed** is active (`status="active"` + `terms_accepted`).
- `store.tenantHasListings()` (G1-A3) gates IDX sections so an empty tenant never renders a bare
  "Featured Listings" block.
- `lib/server/industry-profiles.ts`: the IDX module "Runs on sample data until the tenant's IDX/VOW
  board approval lands."
- Genesis report tile "Sample listings" → "Live on demo data" (`app/tenants/[tenantId]/genesis`).

## Status (2026-07-01)

- ✅ **Sample data works end-to-end** — search, area pages, detail, weblet all render.
- ✅ **Live DDF adapter built** (RETS/Digest/DMQL2/COMPACT) + sync engine + encrypted per-tenant creds.
- ⏳ **Needs to go live:** a real CREA DDF **username/password** + **DDF terms accepted** + the photo
  `GetObject`→R2 pipeline finalized against real credentials. See [GO-LIVE.md](./GO-LIVE.md).
- ⏳ **Open item (task F2):** fully wire live IDX listings into the Real Estate template.

## Related
- [[realestate-tenant-test]] — Ali's RE tenant launched on this sample data.
- `public/luxury-preview.html` — the static luxury preview the sample set mirrors.
- Cron: `runDueIdxSync()` (15-min cadence, D-350) — the sync entry point.
