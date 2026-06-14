-- 0071 — IDX property class (D-352). myRealPage-style filter grouping: Residential | Condo & Other
-- | Commercial. CREA PropertyType is coarse ("Single Family" = houses AND condos), so we capture
-- OwnershipType (Freehold vs Condominium/Strata) + condo fee/parking and derive a property_class to
-- drive the class-tabbed search (the right filters per class).
alter table public.idx_listings
  add column if not exists property_class   text,    -- Residential | Condo & Other | Commercial
  add column if not exists ownership_type   text,    -- RESO OwnershipType (Freehold | Condominium/Strata | …)
  add column if not exists property_sub_type text,
  add column if not exists association_fee  numeric, -- condo/maintenance fee
  add column if not exists parking_total    int;
create index if not exists idx_listings_class_idx on public.idx_listings (tenant_id, property_class);

-- Class-aware area aggregation: distinct classes available (for the search tabs).
create or replace function public.idx_property_classes(p_tenant uuid)
returns table(property_class text, n bigint) language sql stable as $$
  select property_class, count(*) from public.idx_listings
  where tenant_id = p_tenant and inactive_at is null and coalesce(property_class,'') <> ''
  group by property_class order by count(*) desc
$$;
