# CREA DDF — going live for a tenant

How to switch a real-estate tenant from **sample** listings to the **live CREA DDF feed**.

## 0. Prerequisites (the tenant / agent gets these from CREA)

1. **DDF access.** The agent must be a **CREA REALTOR®** and enable DDF. DDF is CREA's national feed
   of REALTOR.ca **active** listings.
2. **DDF credentials** — a **username + password** for `https://data.crea.ca` (RETS).
3. **Accept the DDF terms of use** (attribution: listings must show the listing office name and link
   back to REALTOR.ca via `MoreInformationLink`).

> DDF gives national **active** listings with attribution requirements. For fuller board data (e.g.
> sold history, richer fields) an agent needs their **local board's IDX/VOW** feed (TRREB, etc.).
> Our adapter is RESO-generic, so a board feed (Bridge / Trestle / MLS Grid) plugs into the same
> pipeline — only a new adapter in `lib/server/idx/` is needed.

## 1. Server prerequisite

`SETTINGS_ENCRYPTION_KEY` must be set (Vercel env) — feed credentials are stored **AES-GCM encrypted**
and are never returned to the client. Without it, `saveFeed` refuses to store credentials.

## 2. Configure the feed (writes `idx_feeds`)

Save the feed for the tenant (via the tenant's IDX/VOW settings UI, or `saveFeed()` in
`lib/server/idx/feeds.ts`):

```
source:        "ddf"
method:        "rets"
endpoint:      "https://data.crea.ca"
credentials:   { username: "<CREA DDF user>", password: "<CREA DDF pass>" }
termsAccepted: true
config:        { }   // optional scoping: { cities:[], provinces:[], boardIds:[] }
```

The row's `status` flips to **`active`** automatically once **endpoint is set AND terms are accepted**.
(Credentials are encrypted on write; I don't handle the values — the agent/admin enters them.)

## 3. Test the connection

Run the adapter's `verify()` (the "Test sync" action) — it does a real **Login → Search probe →
Logout** and returns ok/error. A bad user/pass returns the RETS reply code so you can tell auth apart
from connectivity.

## 4. First sync

- One tenant now: `runTenantSync(tenantId, "ddf")` (in `lib/server/idx/sync.ts`).
- Or let the **cron** pick it up: `runDueIdxSync()` runs every active, terms-accepted feed on a
  **15-minute** cadence (D-350). Sync is **incremental** (the `last_modification_ts` cursor) and
  **idempotent** (upsert by `source_key`).

Photos: COMPACT carries none — they're fetched via `GetObject` and cached to **R2**. That photo step
+ any live-response quirks are finalized against the tenant's real credentials on first live run.

## 5. Retire the sample data

Once `source="ddf"` listings are populating, drop the demo rows so they don't mix in:

```sql
delete from public.idx_listing_media
 where listing_id in (select id from public.idx_listings where tenant_id = '<TENANT_ID>' and source = 'sample');
delete from public.idx_listings
 where tenant_id = '<TENANT_ID>' and source = 'sample';
```

(Read paths already filter by `source`, so the switch is seamless — this is just cleanup.)

## 6. Verify on the site

Search, area pages (Municipality → Community), and listing detail pages now render live MLS data.
`tenant-blueprint.ts` will report the feed as **live** instead of "sample data," and the Genesis
report tile stops saying "Live on demo data."

---

## Operational notes

- **Cadence / retention:** 15-min sync; listings that leave the feed are marked `inactive_at` and
  **purged after 90 days** (D-350).
- **Pause a feed:** set `idx_feeds.status = 'paused'` — the cron skips it.
- **Attribution is mandatory** under DDF terms — keep the listing brokerage name + the REALTOR.ca
  link visible on cards/detail.
- **Multi-board future:** add `createXAdapter()` in `lib/server/idx/` implementing the `FeedAdapter`
  interface and register it in `sync.ts` `adapterFor()`. Nothing else changes.
