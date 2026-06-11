-- 0048 — multiple external accounts per booking calendar (D-251, Blueprint v3.2).
--
-- The v1 unique(tenant_id, calendar_id, provider) allowed exactly ONE Google account per
-- calendar. Real agents keep busy time on several accounts (business + personal), so the
-- key now includes the account. coalesce() keeps iCal rows (no account email) unique per
-- feed URL stored in external_calendar_id.
alter table public.tenant_calendar_connections
  drop constraint if exists tenant_calendar_connections_tenant_id_calendar_id_provider_key;
create unique index if not exists tenant_calendar_connections_account_idx
  on public.tenant_calendar_connections (tenant_id, calendar_id, provider, coalesce(account_email, ''), coalesce(external_calendar_id, ''));
