# CREA DDF — the sample listings

Source: [`lib/server/idx/sample-listings.ts`](../lib/server/idx/sample-listings.ts). **18 GTA-luxury
listings** across 6 municipalities, seeded with `source="sample"` (D-372 / D-374). They ride the exact
same pipeline as live data, so search / area / detail / weblet all work unchanged. Mirrors
`public/luxury-preview.html`.

- **Branding:** brokerage "AI Biz Connect Realty", agent "Ali Bolourchi" — both are parameters of
  `seedSampleListings(tenantId, { brokerage, agent })`, so each tenant gets its own name.
- **Photos:** 3 Unsplash images each (deterministic gallery).
- **Deterministic:** stable `source_key`s (`sample-001…018`) so re-seeding upserts (never duplicates);
  descending modification timestamps from 2026-06-15.
- **Class split:** 17 Residential, 1 Condo & Other; 15 For Sale + 3 statuses Sold; 2 For Lease.

| # | MLS | City | Neighbourhood | Price | Bed/Bath | Sqft | Type | Status | Deal |
|---|---|---|---|---|---|---|---|---|---|
| 001 | N7012001 | Toronto | Forest Hill | $6,900,000 | 6/8 | 9,100 | Estate | Active | Sale |
| 002 | C7012002 | Toronto | Yorkville | $1,895,000 | 2/3 | 1,720 | Condo Apartment | Active | Sale |
| 003 | C7012003 | Toronto | Rosedale | $4,250,000 | 5/5 | 5,200 | Detached | Sold | Sale |
| 004 | N7012004 | Vaughan | Kleinburg | $4,250,000 | 5/6 | 6,400 | Estate | Active | Sale |
| 005 | N7012005 | Vaughan | Thornhill | $2,150,000 | 4/4 | 3,800 | Detached | Active | Sale |
| 006 | N7012006 | Vaughan | Woodbridge | $8,500/mo | 5/5 | 4,600 | Detached | Active | **Lease** |
| 007 | N7012007 | Richmond Hill | Bayview Hill | $2,980,000 | 5/5 | 4,400 | Detached | Active | Sale |
| 008 | N7012008 | Richmond Hill | Oak Ridges | $1,750,000 | 4/3 | 3,100 | Detached | Active | Sale |
| 009 | N7012009 | Richmond Hill | Mill Pond | $3,400,000 | 5/6 | 5,600 | Estate | Sold | Sale |
| 010 | N7012010 | Markham | Unionville | $2,490,000 | 4/4 | 3,900 | Detached | Active | Sale |
| 011 | N7012011 | Markham | Cachet | $3,250,000 | 5/6 | 5,100 | Estate | Active | Sale |
| 012 | N7012012 | Markham | Angus Glen | $1,990,000 | 4/4 | 3,500 | Detached | Active | Sale |
| 013 | N7012013 | Aurora | Aurora Estates | $3,800,000 | 5/6 | 6,000 | Estate | Active | Sale |
| 014 | N7012014 | Aurora | Bayview Wellington | $1,650,000 | 4/3 | 2,900 | Detached | Active | Sale |
| 015 | N7012015 | Aurora | Hills of St. Andrew | $12,000/mo | 5/5 | 5,200 | Detached | Active | **Lease** |
| 016 | N7012016 | King | King City | $5,400,000 | 6/7 | 8,200 | Estate | Active | Sale |
| 017 | N7012017 | King | Nobleton | $2,750,000 | 5/5 | 4,700 | Detached | Active | Sale |
| 018 | N7012018 | King | Schomberg | $1,450,000 | 4/3 | 2,600 | Detached | Sold | Sale |

All Ontario (`ON` / `CA`), CAD, with lat/lng for map pins.

## How they're seeded

- **Genesis onboarding** auto-seeds them for real-estate tenants: `lib/onboarding.ts` →
  `seedSampleListings(tenantId, { agent })`. The Genesis report shows a "Sample listings" tile.
- **Manually:** call `seedSampleListings(tenantId, { brokerage, agent })` (idempotent).
- **To edit the set:** change the `SEEDS[]` array in `lib/server/idx/sample-listings.ts` (add/adjust
  rows) — they re-seed on the next run by stable `source_key`.
