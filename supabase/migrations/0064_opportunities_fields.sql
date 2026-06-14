-- 0064 — Opportunities GHL-parity fields (D-343).
-- Adds owner/source/lost-reason/expected-close to opportunities so the detail card,
-- owner & source filters, and the won/lost-with-reason flow have real columns to write to.
-- Code degrades gracefully (select "*" + missing-column write fallback) so the app keeps
-- working until this lands.
alter table public.tenant_opportunities
  add column if not exists owner_email          text,
  add column if not exists source               text,
  add column if not exists lost_reason          text,
  add column if not exists expected_close_date  date;

create index if not exists tenant_opps_owner_idx
  on public.tenant_opportunities (tenant_id, owner_email);
create index if not exists tenant_opps_stage_idx
  on public.tenant_opportunities (tenant_id, pipeline_id, stage);
