-- 0075 — safe tenant cascade delete (D-375).
-- Deletes every row keyed to a tenant across ALL public base tables that carry a tenant_id,
-- then the tenant row itself. Generic (no hand-maintained table list) so it can't leave orphans.
-- Hard-refuses the protected platform tenant. Called via rpc('delete_tenant_cascade', {p_tenant}).

create or replace function public.delete_tenant_cascade(p_tenant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_tenant = 'd723a086-eac0-4b61-8742-25313370d0b7'::uuid then
    raise exception 'Refusing to delete the protected platform tenant (d723a086).';
  end if;

  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'tenant_id'
      and t.table_type = 'BASE TABLE'
      and c.table_name <> 'tenants'
  loop
    execute format('delete from public.%I where tenant_id = $1', r.table_name) using p_tenant;
  end loop;

  delete from public.tenants where id = p_tenant;
end;
$$;
