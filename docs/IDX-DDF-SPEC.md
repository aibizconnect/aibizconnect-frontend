# G4: IDX/VOW on CREA DDF — implementation spec

**Goal:** display real-estate listings on tenant websites (IDX), capture inquiries into the CRM, and (phase 2) a registration-gated VOW. First data source = **CREA DDF®** (national REALTOR.ca feed); Ali authorizes our platform as his DDF technology provider (~2026-06-15). Everything is gated behind a feature flag until a feed is configured + terms accepted — no live data, no sync, no rendering before then.

## Architecture (pluggable, multi-tenant, reuse-heavy)
- **Adapter pattern**: one `FeedAdapter` interface; `ddf` is the first implementation. Future MLS/aggregators drop in without touching the store or UI.
- **Sync** runs on the existing Cloudflare cron; incremental replication by modification timestamp; idempotent upserts.
- **Lead capture** routes through the existing `/api/leads/submit` → contacts + pipeline + automation.
- **VOW** reuses the just-built **Client Portal** (magic-link accounts) for registration, saved searches, favorites, audit log.

## Data model (RESO-normalized) — migration `00xx_idx`
```
idx_feeds            -- per-tenant feed config + encrypted creds + terms-accepted
  id, tenant_id, source('ddf'), method('rets'|'rest'), endpoint, encrypted_credentials,
  status('active'|'paused'|'error'), terms_accepted bool, created_at, updated_at
idx_listings         -- one row per listing, normalized
  id, tenant_id, source, source_key (DDF ListingKey), mls_number, status,
  property_type, list_price numeric, currency, address(street,city,province,postal,country),
  latitude, longitude, beds, baths, sqft, lot_size, year_built,
  public_remarks, listing_brokerage, listing_agent, modification_ts, raw jsonb,
  created_at, updated_at;  unique(tenant_id, source, source_key)
idx_listing_media    -- photos
  id, tenant_id, listing_id, url, sort_order, kind('photo'), created_at
idx_sync_state       -- incremental cursor + health
  tenant_id, source, last_modification_ts, last_run_at, status, error, counts jsonb
-- VOW (phase 2, keyed by Client Portal contact)
idx_saved_searches   id, tenant_id, contact_id, name, criteria jsonb, notify bool, created_at
idx_favorites        id, tenant_id, contact_id, listing_id, created_at
```

## Components to build (gated)
1. `lib/server/idx/adapter.ts` — `FeedAdapter` interface: `verify()`, `pullModifiedSince(ts) → { listings, media }`, field-map to the normalized schema.
2. `lib/server/idx/ddf-adapter.ts` — CREA DDF impl (RETS and/or DDF REST; final wire-up when Ali's endpoint+creds land).
3. `lib/server/idx/sync.ts` — `runDueIdxSync()`: per active feed, pull modified-since, upsert listings+media, advance `idx_sync_state`. Idempotent; skips unchanged `modification_ts`; honors retention.
4. `app/api/cron/idx-sync/route.ts` + add to the CF scheduler worker.
5. **Display**: public search `/sites/<tenantId>/listings` (map + filters) + detail `/sites/<tenantId>/listings/<id>`, brand-themed; surfaced via the website builder **Listings element** (IDX mode).
6. **Lead capture**: inquiry/showing-request on listing detail → `/api/leads/submit` with listing context → contact tagged `idx lead` + opportunity in a Buyer pipeline.
7. **Compliance layer**: listing-brokerage attribution, DDF disclaimer, "last updated" from `modification_ts`, seller/listing opt-out handling.
8. **Admin**: a Settings/Sites panel to paste DDF endpoint+creds, accept DDF terms, run a test sync, see counts/health.

## Compliance (CREA DDF Terms — confirm exact rules from Ali's docs)
Attribution to the listing brokerage on every listing; required DDF disclaimer; respect refresh cadence + retention; no AVM/estimates; no altering data; honor opt-outs. VOW (phase 2): consumer registration + agreed terms, per-user audit log + disable-user, stricter data scope.

## Open questions for the architects
1. DDF delivery: target **RETS** first, the **DDF REST feed** first, or build the adapter to support both? Which does CREA hand a member today?
2. Field mapping: is DDF on the **RESO Data Dictionary** now? Confirm the canonical normalized field set + property-type enum.
3. **Media**: cache DDF photos to R2, or hotlink from CREA's CDN? (Compliance + cost.)
4. **Scoping**: a member's DDF feed = the national DDF-opted-in pool, or the member's own listings + board? How do we scope what a given tenant displays (their board/area filter)?
5. **Retention/refresh**: DDF's required cadence + max retention for cached listings.
6. Net-new vs reuse boundary: confirm lead capture rides the existing `/api/leads/submit` and VOW rides the Client Portal — no parallel auth.

## Phasing
- **G4.1 IDX**: feed config → sync → search/detail → lead capture → compliance. (Buildable scaffold now; live when DDF creds land.)
- **G4.2 VOW**: registration-gated saved searches/favorites/gated data on the Client Portal + audit log.
