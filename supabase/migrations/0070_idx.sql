-- 0070 — IDX/VOW foundation (G4, D-346..352). Real-estate listings via CREA DDF® (RESO-normalized,
-- multi-tenant, pluggable feed). FLAG-GATED: nothing syncs or renders until a feed is configured +
-- DDF terms accepted. Lead capture rides /api/leads/submit; VOW (saved searches/favorites) reuses
-- the Client Portal contact identity.

-- Per-tenant feed config + encrypted credentials.
create table if not exists public.idx_feeds (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null,
  source                text not null default 'ddf',          -- ddf | (future: bridge, trestle…)
  method                text not null default 'rest',         -- rest | rets
  endpoint              text,
  encrypted_credentials text,                                 -- AES-GCM blob, never returned to client
  config                jsonb not null default '{}'::jsonb,   -- scoping: { boardIds:[], cities:[], provinces:[] }
  status                text not null default 'pending',      -- pending | active | paused | error
  terms_accepted        boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, source)
);

-- One row per listing, normalized to the RESO Data Dictionary.
create table if not exists public.idx_listings (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null,
  source                  text not null default 'ddf',
  source_key              text not null,                      -- RESO ListingKey
  mls_number              text,
  status                  text,                               -- Active | Sold | Pending | Expired …
  property_type           text,                               -- Residential | Condominium | MultiFamily | Commercial | Land | Farm | Rental | Other
  list_price              numeric,
  currency                text default 'CAD',
  address_street          text,
  address_unit            text,
  address_city            text,
  address_province        text,
  address_postal_code     text,
  address_country         text not null default 'CA',
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  bedrooms                int,
  bathrooms               numeric,
  sqft_total              numeric(10,2),
  lot_size_sqft           numeric(12,2),
  year_built              int,
  public_remarks          text,
  listing_brokerage_name  text,                               -- RESO ListOfficeName (attribution)
  listing_agent_name      text,                               -- RESO ListAgentFullName
  community               text,                               -- parsed from City "City (Community)" — powers community search
  transaction_type        text,                               -- For Sale | For Lease
  photos_count            int,
  more_info_url           text,                               -- RESO MoreInformationLink (realtor.ca)
  modification_timestamp  timestamptz not null,               -- RESO ModificationTimestamp (replication cursor)
  inactive_at             timestamptz,                        -- set when it leaves the feed; purge after retention
  raw_data                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (tenant_id, source, source_key)
);
create index if not exists idx_listings_tenant_status_idx on public.idx_listings (tenant_id, status);
create index if not exists idx_listings_city_idx on public.idx_listings (tenant_id, address_city);
create index if not exists idx_listings_community_idx on public.idx_listings (tenant_id, community);
create index if not exists idx_listings_price_idx on public.idx_listings (tenant_id, list_price);
create index if not exists idx_listings_modts_idx on public.idx_listings (tenant_id, source, modification_timestamp);

create table if not exists public.idx_listing_media (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  listing_id  uuid not null,
  url         text not null,                                  -- R2-cached url (D-348)
  sort_order  int not null default 0,
  kind        text not null default 'photo',
  created_at  timestamptz not null default now()
);
create index if not exists idx_listing_media_listing_idx on public.idx_listing_media (tenant_id, listing_id, sort_order);

create table if not exists public.idx_sync_state (
  tenant_id              uuid not null,
  source                 text not null default 'ddf',
  last_modification_ts   timestamptz,
  last_run_at            timestamptz,
  status                 text,                                -- success | partial_success | failed
  error                  text,
  counts                 jsonb not null default '{}'::jsonb,
  primary key (tenant_id, source)
);

-- VOW (phase 2) — keyed by the Client Portal contact.
create table if not exists public.idx_saved_searches (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  contact_id  uuid not null,
  name        text not null default 'Saved search',
  criteria    jsonb not null default '{}'::jsonb,
  notify      boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists public.idx_favorites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  contact_id  uuid not null,
  listing_id  uuid not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, contact_id, listing_id)
);

alter table public.idx_feeds          enable row level security;
alter table public.idx_listings       enable row level security;
alter table public.idx_listing_media  enable row level security;
alter table public.idx_sync_state     enable row level security;
alter table public.idx_saved_searches enable row level security;
alter table public.idx_favorites      enable row level security;
do $$ begin
  create policy idx_feeds_all          on public.idx_feeds          for all using (true) with check (true);
  create policy idx_listings_all       on public.idx_listings       for all using (true) with check (true);
  create policy idx_listing_media_all  on public.idx_listing_media  for all using (true) with check (true);
  create policy idx_sync_state_all     on public.idx_sync_state     for all using (true) with check (true);
  create policy idx_saved_searches_all on public.idx_saved_searches for all using (true) with check (true);
  create policy idx_favorites_all      on public.idx_favorites      for all using (true) with check (true);
exception when duplicate_object then null; end $$;
