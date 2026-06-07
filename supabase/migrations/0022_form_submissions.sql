-- 0022: Q3 (Forms) — capture submissions from the contact-form element. One row per
-- submission; `data` holds the field values. Scoped to tenant + website + page.
create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid,
  page_id uuid,
  form_name text,
  data jsonb not null default '{}'::jsonb,    -- { fieldName: value, ... }
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_tenant_idx  on form_submissions(tenant_id, created_at desc);
create index if not exists form_submissions_website_idx on form_submissions(website_id);
