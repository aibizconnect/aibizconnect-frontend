-- 0045 — Contacts GHL-parity (Blueprint v3.2 follow-on): custom-field values on the
-- contact (jsonb by field_key), owner + DND, notes, contact tasks, and smart lists
-- (saved filter views). Interim-open RLS, consistent with sibling tables. Idempotent.

alter table public.tenant_contacts
  add column if not exists custom jsonb not null default '{}'::jsonb,
  add column if not exists company text,
  add column if not exists owner_email text,
  add column if not exists dnd boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists tenant_contacts_email_idx
  on public.tenant_contacts (tenant_id, lower(email));

create table if not exists public.tenant_contact_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null,
  body text not null,
  author_email text,
  created_at timestamptz not null default now()
);
create index if not exists tenant_contact_notes_idx
  on public.tenant_contact_notes (tenant_id, contact_id, created_at desc);

create table if not exists public.tenant_contact_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid,
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done')),
  assignee_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_contact_tasks_idx
  on public.tenant_contact_tasks (tenant_id, status, due_at);
create index if not exists tenant_contact_tasks_contact_idx
  on public.tenant_contact_tasks (tenant_id, contact_id);

create table if not exists public.tenant_smart_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tenant_smart_lists_idx
  on public.tenant_smart_lists (tenant_id, position);

alter table public.tenant_contact_notes enable row level security;
alter table public.tenant_contact_tasks enable row level security;
alter table public.tenant_smart_lists enable row level security;
drop policy if exists contact_notes_interim_open on public.tenant_contact_notes;
drop policy if exists contact_tasks_interim_open on public.tenant_contact_tasks;
drop policy if exists smart_lists_interim_open on public.tenant_smart_lists;
create policy contact_notes_interim_open on public.tenant_contact_notes for all using (true) with check (true);
create policy contact_tasks_interim_open on public.tenant_contact_tasks for all using (true) with check (true);
create policy smart_lists_interim_open on public.tenant_smart_lists for all using (true) with check (true);

notify pgrst, 'reload schema';
