-- 0061 (D-322): Review Requests — log of review-link asks sent to contacts (email/SMS).
-- 1:1 human-initiated sends (bypass marketing gate, require verified sender / connected Twilio);
-- DND + Unsubscribed contacts are skipped. Until applied, the Requests tab reads empty and the
-- request log no-ops (the send itself still works). The Review Widget needs no schema.

create table if not exists public.tenant_review_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid references public.tenant_contacts(id) on delete set null,
  channel text not null,                 -- 'email' | 'sms'
  status text not null default 'sent',   -- 'sent' | 'failed'
  review_page_url text not null,
  error text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists tenant_review_requests_tenant_idx on public.tenant_review_requests (tenant_id, created_at desc);
create index if not exists tenant_review_requests_contact_idx on public.tenant_review_requests (tenant_id, contact_id);
