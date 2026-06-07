-- 0028_platform_audit.sql
-- Platform-level audit trail (AI Biz Connect team actions, NOT tenant activity).
-- First use: superadmin impersonation start/stop (who acted as whom, when). Extensible to
-- other sensitive platform events (System deletes, role changes) via the `action` field.
create table if not exists platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,                       -- e.g. impersonation.start | impersonation.stop
  actor_email text,                           -- the REAL signed-in user who performed it
  target_email text,                          -- the affected user (e.g. who was impersonated)
  meta jsonb not null default '{}'::jsonb,     -- extra context (path, reason, ids, ...)
  created_at timestamptz not null default now()
);
create index if not exists platform_audit_created_idx on platform_audit_log(created_at desc);
create index if not exists platform_audit_actor_idx on platform_audit_log(actor_email, created_at desc);
