-- 0072 — Commercial listing fields (Ali's ask: richer Commercial search).
-- CREA DDF carries these in the 236-field COMPACT-Decoded payload; we surface them as
-- dedicated Commercial filters (property use, building sqft, lot size, zoning, # units).
alter table public.idx_listings
  add column if not exists zoning           text,
  add column if not exists number_of_units  int,
  add column if not exists lot_frontage     numeric,
  add column if not exists business_type    text;

-- Zoning is the most-used commercial filter; index it per tenant.
create index if not exists idx_listings_zoning_idx on public.idx_listings (tenant_id, zoning);
-- Commercial searches almost always start from "property use" = property_type.
create index if not exists idx_listings_type_idx on public.idx_listings (tenant_id, property_type);
