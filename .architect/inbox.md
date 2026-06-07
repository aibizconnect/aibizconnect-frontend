# Builder → Architect: VERIFY Follow-up Sender Worker (FW-V1..V15)

Built per D-062..D-065. typecheck clean. Files:

## migration 0036_followup_sender_worker.sql
ALTER tenant_onboarding_followups ADD send_attempts int default 0, last_attempt_at, error, recipient.
Idempotent. → FW-V1.

## lib/server/followup-worker.ts — runDueFollowups(tenantId?)
- REAPER first: 'sending' rows with last_attempt_at older than 10 min → back to 'draft'. → FW-V9.
- Due = status='draft' AND scheduled_for<=now (+ tenant filter), limit 200.
- Per-tenant settings cached: launchpad_followup_enabled + channels{email,sms,emailTo,smsTo} + tz.
- CLAIM idempotently: update status='sending', send_attempts+1, last_attempt_at=now, recipient
  WHERE id=? AND status='draft' RETURNING — only the claimer proceeds. → FW-V4.
- Gates (else finalize 'blocked'/'canceled', never 'sent'): channel opt-in on; recipient present;
  send_attempts>MAX(4) → 'failed' (permanent); stepsAllDone (tenant_onboarding statuses all
  complete/skipped) → 'canceled'; EMAIL → emailReady (tenant_email_settings verified + resend key);
  SMS → twilioReady; SMS quiet hours 21:00–08:00 (Intl tz from default_timezone) → DEFER (+3h, back to
  draft). → FW-V2/V3/V5/V6/V7.
- SEND: email via sendEmail (Resend), sms via existing sendSms. Success → 'sent' + sent_at; provider
  error → 'failed' + error. → FW-V8.
- audit('followup.send', {tenantId, followupId, channel, status, error}) every attempt. → FW-V10.

## lib/server/email-send.ts — sendEmail(tenantId,{to,subject,html})
Resend POST with tenant's encrypted key + VERIFIED sender identity (emailReady gate). Appends a
one-click UNSUBSCRIBE link (encrypted-tenant token). Called ONLY by the worker. → FW-V13, RULING 49.
No secret logged (only the key in the Authorization header at call time). → FW-V14.

## Triggers
- Manual: runDueFollowupsAction(tenantId) ("use server") requireTenantAccess + requireAdminWrite →
  Launchpad "Send due reminders now" button. → FW-V11.
- Scheduled: GET /api/cron/followups — 401 unless x-cron-secret == env CRON_SECRET → runDueFollowups().
  → FW-V12.
- Opportunistic: Launchpad page load best-effort runDueFollowups(tenantId).
- Unsubscribe: GET /api/followups/unsubscribe?token= → decrypts tenant id, sets
  launchpad_followup_enabled=false, cancels pending rows, audited.

## Opt-in / disable
setFollowupPrefs now captures emailTo/smsTo (channels), SMS consent text in UI. Disabling cancels
draft/scheduled rows. → FW-V15.

Compliance (RULING 49): unsubscribe link ✓; SMS quiet hours ✓; max attempts 4 → 'failed' ✓; explicit
opt-in + SMS consent text ✓.

Please VERIFY FW-V1..V15 and append DECISION-LOG. After this: KYC (last phase).
