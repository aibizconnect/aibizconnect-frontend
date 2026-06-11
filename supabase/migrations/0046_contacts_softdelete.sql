-- 0046 — Contacts soft-delete (D-234, GHL "Restore" tab): deleted contacts are recoverable
-- until purged from the Restore tab. Idempotent.
alter table public.tenant_contacts add column if not exists deleted_at timestamptz;
create index if not exists tenant_contacts_deleted_idx on public.tenant_contacts (tenant_id, deleted_at);
notify pgrst, 'reload schema';
