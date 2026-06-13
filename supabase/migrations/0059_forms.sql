-- 0059 (D-311..315): Forms module under Sites. A management surface on top of the existing
-- form_submissions store + /api/leads/submit capture. tenant_forms holds the form definition
-- (fields + settings); form_submissions gains form_id to link a submission to its form.
-- Surveys (kind='survey', settings.steps) are schema-reserved but deferred (Forms ship first).
-- Self-contained: also creates form_submissions if it was never applied (0022). Idempotent.

create table if not exists public.tenant_forms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  kind text not null default 'form',          -- 'form' | 'survey'
  fields jsonb not null default '[]'::jsonb,   -- [{ key,label,type,required,placeholder?,options?,order? }]
  settings jsonb not null default '{}'::jsonb, -- { submitButtonText, thankYouMessage, redirectUrl? }
  status text not null default 'draft',        -- 'draft' | 'published' | 'archived'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_forms_tenant_idx on public.tenant_forms (tenant_id, created_at desc);

-- form_submissions: the durable lead store used by /api/leads/submit. Created here if 0022 was
-- never applied (the cause of the 42P01 error). Includes form_id from the start.
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid,
  page_id uuid,
  form_name text,
  data jsonb not null default '{}'::jsonb,
  source_url text,
  form_id uuid references public.tenant_forms(id) on delete set null,
  created_at timestamptz not null default now()
);
-- and add form_id if the table already existed without it
alter table public.form_submissions
  add column if not exists form_id uuid references public.tenant_forms(id) on delete set null;

create index if not exists form_submissions_tenant_idx  on public.form_submissions (tenant_id, created_at desc);
create index if not exists form_submissions_website_idx on public.form_submissions (website_id);
create index if not exists form_submissions_form_idx    on public.form_submissions (form_id, created_at desc);
