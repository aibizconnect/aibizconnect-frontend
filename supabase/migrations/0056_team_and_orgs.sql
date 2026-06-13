-- 0056 (D-282/283): tenant TEAM management + franchise ORGANIZATIONS.
-- (1) tenant_users gains the columns the team console needs: email + name for
-- invited members (who have no auth user_id yet), assigned_only (GHL "only assigned
-- data"), and invited_at. user_id becomes nullable so an invite row can exist before
-- the person signs up.
alter table public.tenant_users
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists assigned_only boolean not null default false,
  add column if not exists invited_at timestamptz;
alter table public.tenant_users alter column user_id drop not null;
create unique index if not exists tenant_users_tenant_email_uidx
  on public.tenant_users (tenant_id, lower(email)) where email is not null;

-- (2) organizations = the franchise umbrella (D-260 Phase C). Each LOCATION is its
-- own tenant; the org groups them. HQ users get org_admin spanning member tenants.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid,
  created_at timestamptz not null default now()
);
alter table public.tenants
  add column if not exists organization_id uuid references public.organizations (id) on delete set null,
  add column if not exists location_label text;
create index if not exists tenants_org_idx on public.tenants (organization_id);
