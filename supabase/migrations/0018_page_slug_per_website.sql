-- 0018: G1 — page slugs unique PER WEBSITE (not per tenant), so two sites can each
-- have a "home". Drops the old per-tenant unique if present; adds (website_id, slug).
do $$
declare c record;
begin
  -- Drop any unique constraint on website_pages that covers (tenant_id, slug).
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'website_pages' and con.contype = 'u'
      and pg_get_constraintdef(con.oid) ilike '%slug%'
      and pg_get_constraintdef(con.oid) ilike '%tenant_id%'
  loop
    execute format('alter table website_pages drop constraint %I', c.conname);
  end loop;
end $$;

-- New scope: unique slug within a website. (Partial index ignores null website_id
-- rows so pre-migration data never blocks the index creation.)
create unique index if not exists website_pages_website_slug_uidx
  on website_pages (website_id, slug)
  where website_id is not null;
