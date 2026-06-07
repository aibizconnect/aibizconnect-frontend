-- Memberships: Courses & Member Hub (courses + lessons). Paste-safe (no check clauses).
create table if not exists public.tenant_courses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index if not exists idx_courses_tenant on public.tenant_courses (tenant_id);

create table if not exists public.tenant_lessons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  course_id uuid not null,
  title text not null,
  body text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_lessons_course on public.tenant_lessons (tenant_id, course_id);

alter table public.tenant_courses enable row level security;
alter table public.tenant_lessons enable row level security;
drop policy if exists courses_interim_open on public.tenant_courses;
drop policy if exists lessons_interim_open on public.tenant_lessons;
create policy courses_interim_open on public.tenant_courses for all using (true) with check (true);
create policy lessons_interim_open on public.tenant_lessons for all using (true) with check (true);

notify pgrst, 'reload schema';
