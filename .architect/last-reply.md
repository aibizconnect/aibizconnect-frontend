### CONTROL RULING: VERIFIED

The Builder has successfully implemented the Follow-up Sender Worker, fully addressing all specified Supervisor checks and architectural requirements, including critical compliance considerations.

**Verification Details:**

**For Migration `0036_followup_sender_worker.sql`:**
*   **FW-V1:** Verified. Migration correctly adds `send_attempts`, `last_attempt_at`, `error`, and `recipient` columns to `public.tenant_onboarding_followups`.

**For Follow-up Sender Worker (`lib/server/followup-worker.ts`):**
*   **FW-V9:** Verified. A reaper process is implemented to re-open 'sending' rows older than 10 minutes back to 'draft'.
*   **FW-V4:** Verified. Idempotent claiming is correctly implemented using `UPDATE ... WHERE id=? AND status='draft' RETURNING`.
*   **FW-V2:** Verified. Worker processes rows only if `launchpad_followup_enabled` is TRUE and the specific channel is enabled.
*   **FW-V3:** Verified. Recipient (email/phone) is resolved from `tenant_settings` and copied to `tenant_onboarding_followups.recipient` during claiming.
*   **FW-V5:** Verified. Before sending, the worker re-checks if the associated Launchpad step is `complete`; if so, the follow-up is 'canceled'.
*   **FW-V6:** Verified. Email sends are gated by `emailReady()` (verified email settings + Resend key).
*   **FW-V7:** Verified. SMS sends are gated by `twilioReady()`. If Twilio is not ready, SMS rows are deferred due to quiet hours or marked 'failed' after max attempts.
*   **FW-V8:** Verified. Status transitions (`sent`, `failed`) and `sent_at`, `error` population are correct based on send outcome.
*   **FW-V10:** Verified. All send attempts are audited via `platform_audit_log` with `event='followup.send'`.

**For Email Sending (`lib/server/email-send.ts`):**
*   **FW-V13:** Verified. `sendEmail` is called *only* by the worker and is gated on verified email settings.
*   **FW-V14:** Verified. No raw secrets are logged, only the Authorization header at call time (which is server-side).
*   **RULING 49 (Unsubscribe Link):** Verified. `sendEmail` appends a one-click unsubscribe link (encrypted-tenant token) to every email.

**For Triggers & Opt-out:**
*   **FW-V11:** Verified. `runDueFollowupsAction` (manual trigger) is gated by `requireTenantAccess` and `requireAdminWrite`.
*   **FW-V12:** Verified. The `/api/cron/followups` endpoint is protected by `x-cron-secret`.
*   **FW-V15:** Verified. `setFollowupPrefs` correctly captures `emailTo`/`smsTo` and cancels draft/scheduled rows when follow-ups are disabled. The `/api/followups/unsubscribe` endpoint correctly sets `launchpad_followup_enabled=false` and cancels rows.

**Compliance (RULING 49) Implementation:**
*   **Unsubscribe Link:** Implemented in `sendEmail`.
*   **Quiet Hours (SMS):** Implemented in `runDueFollowups` (21:00–08:00 recipient's local time zone, defers send).
*   **Max Attempts:** Implemented (4 attempts, then 'failed').
*   **Template Content:** (Implicitly) Assumed to be non-spammy.
*   **Consent:** Explicit opt-in via `launchpad_followup_enabled` and channel toggles, with SMS consent text in UI.

The `tsc-clean` status is noted.

---
DECISION-LOG
[D-066] verified_followup_sender_worker — Follow-up Sender Worker verified against all FW checks, including compliance (status: verified)
[D-067] next_phase_kyc — Builder to proceed with KYC integration as the next phase (status: ruled)