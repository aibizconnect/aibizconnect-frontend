-- 0057 (D-297..301): Unified Conversations (the GHL "Conversations" inbox).
-- Two tables: tenant_conversations (the thread, one per contact+channel) and
-- tenant_messages (each inbound/outbound message). Until applied, the inbox reads
-- empty and inbound SMS is accepted-but-not-stored (the webhook still 200s Twilio);
-- lib/server/conversations.ts degrades gracefully (missing-table guard).
-- Webchat (tenant_agent_conversations) folds in later as a separate data migration.

create table if not exists public.tenant_conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid,                       -- tenant_contacts.id (nullable: unknown sender)
  channel text not null,                 -- 'sms' | 'email' | 'webchat'
  external_id text,                      -- channel-specific thread key (e.g. inbound number pair)
  title text,                            -- derived display title
  status text not null default 'open',   -- 'open' | 'closed' | 'spam'
  unread_count int not null default 0,
  last_message_at timestamptz not null default now(),
  last_preview text,                     -- denormalized last message snippet for the list
  assigned_to_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_conversations_list_idx
  on public.tenant_conversations (tenant_id, status, last_message_at desc);
create index if not exists tenant_conversations_contact_idx
  on public.tenant_conversations (tenant_id, contact_id, channel);
-- one open thread per (tenant, contact, channel) when we know the contact
create unique index if not exists tenant_conversations_contact_channel_uniq
  on public.tenant_conversations (tenant_id, contact_id, channel)
  where contact_id is not null;

create table if not exists public.tenant_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  conversation_id uuid not null references public.tenant_conversations(id) on delete cascade,
  channel text not null,                 -- denormalized: 'sms' | 'email' | 'webchat'
  direction text not null,               -- 'inbound' | 'outbound'
  sender_type text not null,             -- 'contact' | 'platform_user' | 'agent' | 'system'
  sender_name text,
  body text not null,
  subject text,                          -- email only
  external_message_id text,              -- Twilio MessageSid / Resend id
  status text not null default 'sent',   -- 'sent' | 'delivered' | 'failed' | 'read'
  error text,
  created_at timestamptz not null default now()
);
create index if not exists tenant_messages_thread_idx
  on public.tenant_messages (conversation_id, created_at);
create index if not exists tenant_messages_tenant_idx
  on public.tenant_messages (tenant_id, created_at desc);
