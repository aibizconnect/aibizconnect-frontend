-- 0055 (D-281): stored AI-agent chat conversations (one row per widget session;
-- transcript + tool events + linked contact email in jsonb config — shape in
-- lib/agent/conversations-store.ts). Until applied, the store falls back to
-- tenant_settings rows keyed 'agent_convo:<sessionId>'.
create table if not exists public.tenant_agent_conversations (
  id uuid primary key,
  tenant_id uuid not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_agent_conversations_tenant_idx
  on public.tenant_agent_conversations (tenant_id, updated_at desc);
