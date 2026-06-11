Here are the rulings for Calendar Round 3, addressing Ali's directives for venues, invitees, and transactional reminders.

---
### 1. Venues

**RULING 239: Implement Venues for Calendar Appointments.**

*   **Decision:** The proposal for `tenant_calendars.venues` and its integration into the booking flow is **APPROVED**.
*   **Action:**
    1.  **DDL (Migration 0048):**
        ```sql
        -- Migration 0048_calendar_venues.sql
        ALTER TABLE public.tenant_calendars
          ADD COLUMN IF NOT EXISTS venues jsonb NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE public.tenant_appointments
          ADD COLUMN IF NOT EXISTS venue jsonb; -- Stores the chosen venue {kind, label, detail}
        ```
    2.  **`tenant_calendars.venues` Schema:** `jsonb [{kind: "zoom"|"teams"|"meet"|"phone"|"in_person"|"custom", label: string, detail: string}]`.
    3.  **Settings UI:** Implement UI in Calendar Settings to manage the list of available venues for a calendar.
    4.  **Booking Page:** Display "How would you like to meet?" chips or a dropdown when venues are configured.
    5.  **`tenant_appointments.venue`:** Store the chosen venue in this new column.
    6.  **External Event Mirroring:** When mirroring to Google/Outlook, map `tenant_appointments.venue` to the event's `location` and/or `description` fields.
    7.  **Confirmation Email:** Include venue details in the immediate confirmation email.
    8.  **Graceful Pre-DDL:** Handle `tenant_appointments.venue` as `null` if column not present.

---
### 2. Invitees & Native Invites

**RULING 240: Implement Invitee Collection and Native Event Invites.**

*   **Decision:** The proposal for collecting invitee emails and sending native invites via Google/Outlook is **APPROVED**.
*   **Action:**
    1.  **DDL (Migration 0048):**
        ```sql
        -- Migration 0048_calendar_invitees.sql (part of 0048)
        ALTER TABLE public.tenant_appointments
          ADD COLUMN IF NOT EXISTS invitees jsonb NOT NULL DEFAULT '[]'::jsonb; -- Array of {email: string, name?: string}
        ```
    2.  **Booking Form:** Add an "Add guests" (comma-separated emails) field to the booking form.
    3.  **`tenant_appointments.invitees`:** Store collected invitee emails in this new column.
    4.  **Google Event Mirroring:**
        *   When calling `createExternalEvents` for Google, ensure `?sendUpdates=all` is included in the API call.
        *   Map the booker's email and all `tenant_appointments.invitees` to the Google event's `attendees` array.
        *   When deleting an event, ensure `?sendUpdates=all` is also used for cancellation propagation.
    5.  **Outlook Event Mirroring:** Implement similar logic for Outlook to send invites natively to booker and invitees.
    6.  **Immediate Confirmation Email:** Send an immediate confirmation email to the booker and all `invitees` via `lib/server/email-send.ts` (gated by `emailReady()`).

---
### 3. Reminders Engine

**RULING 241: Implement Transactional Reminders Engine with Cloudflare Worker Scheduler.**

*   **Decision:** The proposal for the transactional reminders engine, including the reconciliation of "no-auto-send" and the Cloudflare Worker scheduler, is **APPROVED**.
*   **Action:**
    1.  **DDL (Migration 0049):**
        ```sql
        -- Migration 0049_calendar_reminders.sql
        ALTER TABLE public.tenant_calendars
          ADD COLUMN IF NOT EXISTS reminders jsonb NOT NULL DEFAULT '{
            "enabled": false,
            "dayBefore": {"enabled": false, "template": "appointment_reminder_day_before"},
            "morningOf": {"enabled": false, "template": "appointment_reminder_morning_of"},
            "hourBeforeSms": {"enabled": false, "template": "appointment_reminder_hour_before_sms"}
          }'::jsonb;
        ALTER TABLE public.tenant_appointments
          ADD COLUMN IF NOT EXISTS reminders_sent jsonb NOT NULL DEFAULT '{}'::jsonb; -- Stores {dayBefore: true, morningOf: true, hourBeforeSms: true} markers

        -- Partial index for efficient lookup of active appointments for reminders
        CREATE INDEX IF NOT EXISTS tenant_appts_active_start_idx ON public.tenant_appointments (tenant_id, calendar_id, start_at)
          WHERE status IN ('booked', 'confirmed') AND deleted_at IS NULL;
        ```
    2.  **`lib/server/appointment-reminders.ts` (`runDue()`):**
        *   **Logic:**
            *   Load active appointments (`status IN ('booked', 'confirmed')`, not deleted) within a look-ahead window (e.g., next 26 hours).
            *   For each appointment, check its `calendar.reminders` settings and `appointment.reminders_sent` markers.
            *   **Day-Before:** If `calendar.reminders.dayBefore.enabled` and `start_at` is 22-26 hours out (calendar timezone), and `dayBefore` not sent: send email to booker+invitees, mark `dayBefore: true` in `reminders_sent`.
            *   **Morning-Of:** If `calendar.reminders.morningOf.enabled` and `start_at` is on the same calendar timezone day, after 7 AM calendar timezone, and >90 minutes out, and `morningOf` not sent: send email to booker+invitees, mark `morningOf: true` in `reminders_sent`.
            *   **Hour-Before SMS:** If `calendar.reminders.hourBeforeSms.enabled` and `start_at` is 30-75 minutes out (calendar timezone), and `hourBeforeSms` not sent: send SMS to booker's phone (if `tenant_appointments.phone` exists), mark `hourBeforeSms: true` in `reminders_sent`.
        *   **Gates:** Each send is gated by `calendar.reminders.enabled`, `emailReady()` (for email), `twilioReady()` (for SMS), and the specific reminder's `enabled` flag.
        *   **Idempotency:** `reminders_sent` markers ensure idempotent sending.
        *   **Audit:** `platform_audit_log` for `appointment.reminder_sent` (email/sms, type, status).
    3.  **No-Auto-Send Reconciliation:**
        *   These are **transactional appointment communications**, explicitly ordered by Ali. They are distinct from marketing sends.
        *   **Gates:** Sending is strictly gated by per-calendar `reminders.enabled` toggle AND the tenant having a `VERIFIED` email identity (`emailReady()`) / connected Twilio (`twilioReady()`).
        *   **Marketing Sends:** Marketing sends remain forbidden without explicit, separate tenant opt-in.
    4.  **Scheduler (Cloudflare Worker):**
        *   **Location:** `deploy/cron-worker-cf/` (new Cloudflare Worker project).
        *   **`wrangler.toml`:** Configure a `scheduled` trigger (`cron = "*/15 * * * *"`) and `RENDER_BRIDGE_TOKEN` (if co-located) + `CRON_SECRET` as worker secrets.
        *   **Worker Logic:** The worker will make a `GET` request to `https://<your-vercel-app>/api/cron/appointment-reminders` with `Authorization: Bearer <CRON_SECRET>`.
        *   **Vercel Endpoint:** `app/api/cron/appointment-reminders/route.ts` will be a protected route (checks `CRON_SECRET`) that calls `lib/server/appointment-reminders.ts runDue()`.
        *   **Existing Follow-ups:** This same Cloudflare Worker can also call `GET /api/cron/followups` for `tenant_onboarding_followups`.
    5.  **Admin 'Run now' Button:** Implement an `isPlatformAdmin()`-gated server action in Calendar Settings to trigger `lib/server/appointment-reminders.ts runDue(tenantId)` for testing.

---
**Documentation Filing:** The `docs/GHL-PARITY.md` matrix will be updated to reflect these new features.

---
DECISION-LOG
[D-239] rule_implement_venues_calendar_appointments — Ruled implementation of venues for calendar appointments (status: ruled)
[D-240] rule_implement_invitee_collection_native_invites — Ruled implementation of invitee collection and native event invites (status: ruled)
[D-241] rule_implement_transactional_reminders_engine — Ruled implementation of transactional reminders engine with Cloudflare Worker scheduler (status: ruled)