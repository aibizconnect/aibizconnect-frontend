-- 0068 — Memberships: sellable courses (D-349). Promotes the queued courses/lessons base to a
-- numbered migration, adds an offer price + cover, and an enrollments table so courses can be
-- gated, sold (Stripe Checkout, verified on return), and granted manually.
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

-- Offer fields
alter table public.tenant_courses
  add column if not exists price_cents     integer not null default 0,   -- 0 = free
  add column if not exists currency        text not null default 'USD',
  add column if not exists cover_image_url text;

-- Enrollments (who has access)
create table if not exists public.tenant_course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  course_id   uuid not null,
  contact_id  uuid,
  email       text not null,                       -- lowercased
  status      text not null default 'active',      -- active | revoked
  source      text,                                -- free | purchase | manual
  created_at  timestamptz not null default now()
);
create unique index if not exists tenant_course_enroll_uidx on public.tenant_course_enrollments (tenant_id, course_id, email);
create index if not exists tenant_course_enroll_email_idx on public.tenant_course_enrollments (tenant_id, email);

alter table public.tenant_courses enable row level security;
alter table public.tenant_lessons enable row level security;
alter table public.tenant_course_enrollments enable row level security;
drop policy if exists courses_interim_open on public.tenant_courses;
drop policy if exists lessons_interim_open on public.tenant_lessons;
create policy courses_interim_open on public.tenant_courses for all using (true) with check (true);
create policy lessons_interim_open on public.tenant_lessons for all using (true) with check (true);
do $$ begin
  create policy enroll_interim_open on public.tenant_course_enrollments for all using (true) with check (true);
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
