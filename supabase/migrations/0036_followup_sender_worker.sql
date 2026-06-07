-- 0036_followup_sender_worker.sql
-- Follow-up Sender Worker (architect-approved D-062). Adds idempotency/bookkeeping columns to the
-- draft reminder rows. The worker claims a row (draft→sending) atomically, sends via Resend/Twilio,
-- then marks sent|blocked|failed. Still NO send without explicit tenant opt-in.

alter table public.tenant_onboarding_followups
  add column if not exists send_attempts int not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists error text,
  add column if not exists recipient text;   -- resolved email/phone captured at claim time
