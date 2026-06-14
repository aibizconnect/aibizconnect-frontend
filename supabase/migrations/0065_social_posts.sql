-- 0065 — Social Planner (D-344). Schedule posts to connected social accounts
-- (tenant_social_accounts) and let the cron worker publish them at the slot.
-- DRAFTS-ONLY-friendly: a post only goes out when the user explicitly schedules it
-- (status 'scheduled') or hits Post-now; nothing publishes itself otherwise.
create table if not exists public.tenant_social_posts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  content       text not null default '',
  account_ids   jsonb not null default '[]'::jsonb,   -- tenant_social_accounts.id[] to post to
  media_urls    jsonb not null default '[]'::jsonb,   -- optional image url(s)
  variants      jsonb not null default '{}'::jsonb,   -- { "<accountId>": "per-network text override" }
  scheduled_at  timestamptz,                          -- null = unscheduled draft
  status        text not null default 'draft',        -- draft | scheduled | posting | posted | failed
  results       jsonb not null default '[]'::jsonb,   -- [{ accountId, ok, error?, externalId?, at }]
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tenant_social_posts_tenant_idx on public.tenant_social_posts (tenant_id, scheduled_at desc);
create index if not exists tenant_social_posts_due_idx    on public.tenant_social_posts (status, scheduled_at);

alter table public.tenant_social_posts enable row level security;
do $$ begin
  create policy tenant_social_posts_all on public.tenant_social_posts for all using (true) with check (true);
exception when duplicate_object then null; end $$;
