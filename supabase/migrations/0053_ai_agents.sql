-- 0053 (D-274): tenant-facing AI Agents (the "AI Agents" product menu).
-- Definitions are a single jsonb config per agent (name, role, tone, instructions,
-- skills, knowledge) — schema-light on purpose; the shape lives in
-- lib/agent/agents-store.ts. Until applied, the store falls back to tenant_settings
-- rows keyed 'ai_agent:<id>' (same data, slower listing).
create table if not exists public.tenant_ai_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_ai_agents_tenant_idx on public.tenant_ai_agents (tenant_id);
