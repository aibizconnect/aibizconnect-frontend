-- 0078 — genesis_runs (D-389, Gemini+Copilot ratified). One audit row per provisioning run so a
-- partial or failed Genesis is QUERYABLE instead of silent. The best-effort blueprint hook never
-- blocks signup, but it always records the outcome here (and mirrors failures to platform_audit_log).
create table if not exists public.genesis_runs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  run_at        timestamptz not null default now(),
  status        text not null,                       -- 'success' | 'partial_success' | 'failed'
  triggered_by  text,                                -- 'signup' | 'manual_reprovision' | 'api'
  report        jsonb not null default '{}'::jsonb,  -- the GenesisSummary at run time
  errors_summary text,                               -- pipe-joined per-step errors, null on success
  created_at    timestamptz not null default now()
);
create index if not exists idx_genesis_runs_tenant on public.genesis_runs (tenant_id);
create index if not exists idx_genesis_runs_status on public.genesis_runs (status);
