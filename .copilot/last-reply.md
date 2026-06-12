Ali — Report #45 is filed and this becomes the official Blueprint v3.2 — Multi‑Channel Activation + Settings Convergence Finalization Milestone.
This batch closes three major fronts at once: SMS channel activation, Settings‑crash epilogue, and Ali’s ruling on External Tracking.

Below is the canonical blueprint entry.

BLUEPRINT v3.2 — MULTI‑CHANNEL ACTIVATION + SETTINGS CLEANUP (Report #45 Filed)

(Commit dfbec7c — D‑259B shipped)

1) SMS Channel — FULLY LIVE (FILED)

Ali’s Twilio credentials were verified end‑to‑end:

from_number +18502045136 stored

Real test SMS delivered to Ali’s phone

SID: SM0733…

Reminder engine + booking confirmations now have a live SMS channel

Channel gating rules remain enforced (per‑calendar toggles + Twilio presence)

Drift Fix Along the Way — Migration 0051

The final piece of 0031‑era drift was discovered:

tenant_integrations (non‑secret config side) never existed live

Integration saves were half‑succeeding:

tenant_secrets OK

config silently lost

Ali applied 0051, verified live, and the DDL ledger is now through 0051.

Filed under Send Channel Provisioning Protocol.

2) Settings Crash — EPILOGUE (FILED)

Ali confirmed in production:

“worked”

The use‑server runtime‑export bug is now closed end‑to‑end.

Bounce‑Email Noise Explained

Reminder‑engine tests had mirrored bookings with fabricated guests onto Ali’s connected Google account:

Google legitimately sent invites (pipeline proof)

Two orphaned mirrored events were deleted via API with sendUpdates=none

No further noise expected

Practice Rule Adopted

Live booking tests must use calendars WITHOUT external connections,
or cleanup must be done via deleteEntry so deletion propagates.

Filed under Testing Protocol v2.

3) Ali’s Ruling — External Tracking REMOVED (SHIPPED & FILED)

Ali ruled:

External Tracking does NOT belong in tenant Settings.

Executed:

External Tracking tab removed from Settings

Tenant fallback removed from public renderer

tracking-actions.ts deleted

Website Editor’s “Tracking & Scripts” (beside Domain & Email) is now the single source of truth per site

This restores the one‑place‑only rule for tracking scripts.

Filed under Tracking & Scripts Protocol.

4) Build Status (FILED)

Commit: dfbec7c

Build green

All Settings, Calendar, Contacts, and Website Editor flows verified clean

Filed under Deployment Ledger.

5) NEXT — App‑Wide Time Zone Field Sweep (ACTION REQUIRED)

Ali’s directive:

Replace every free‑text Time Zone field with the standard‑zones dropdown.

Plan (Filed):

Extract the D‑253 curated TIMEZONES list into a shared module

Sweep all apps:

Settings

Calendar

Contacts

Automations

Website Editor

Any legacy fields

Replace free‑text inputs with the curated dropdown

Ensure live GMT offsets everywhere

Enforce Toronto‑first ordering

Guarantee no server‑TZ drift across the platform

Filed under Timezone Standardization Protocol.

Blueprint v3.2 Status — Multi‑Channel Activation Batch is SHIPPED & LIVE

The platform now has:

SMS channel fully operational

Settings layer fully stable

Integration schema fully converged

External Tracking unified under Website Editor

Reminder engine + contact sync ready to send (awaiting Resend identity)

Calendar v1.3, Contacts v1, Scheduler v1.3 all stable

Ali — you’re now clear to wire Resend next.
Once the key lands, I’ll automatically configure domain + DNS + DKIM via Cloudflare and bring the email channel fully online.

Edit in a page