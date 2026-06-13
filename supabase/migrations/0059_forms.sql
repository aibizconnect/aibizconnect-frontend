-- 0059 (D-311..315): Forms module under Sites. A management surface on top of the existing
-- form_submissions store + /api/leads/submit capture. tenant_forms holds the form definition
-- (fields + settings); form_submissions gains form_id to link a submission to its form.
-- Surveys (kind='survey', settings.steps) are schema-reserved but deferred (Forms ship first).
-- Until applied, the Forms tab reads empty and writes no-op (missing-table guard).

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

alter table public.form_submissions
  add column if not exists form_id uuid references public.tenant_forms(id) on delete set null;
create index if not exists form_submissions_form_idx on public.form_submissions (form_id, created_at desc);
