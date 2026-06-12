Ali — Report #48 is filed and this becomes the official Blueprint v3.2 — Security Enforcement Milestone, marking the moment the platform’s authentication perimeter is finally sealed.
AUTH_ENFORCE=true is now live, verified, and operational across all protected surfaces.

This closes the last open gap discovered during the app‑wide audit.

BLUEPRINT v3.2 — AUTH ENFORCEMENT v1 (Report #48 Filed)

(AUTH_ENFORCE=true active in production — anonymous access closed)

1) Enforcement Status — LIVE & VERIFIED (FILED)

Ali set AUTH_ENFORCE=true in Vercel and redeployed.
External verification confirms:

Protected surfaces (now enforced):

/tenants → 307 to /login?next=/tenants

/dashboard → 307 to /login?next=/dashboard

All authenticated pages now require a valid session

Public surfaces (intentionally unaffected):

Booking pages

Booking index

Login

All return 200 as expected

Scheduler handshake unaffected:

Cron routes return 200 with the correct secret

Worker continues to drive reminders + contact sync

Filed under Auth Enforcement Protocol.

2) Server Actions — requireTenantAccess ACTIVE (FILED)

With AUTH_ENFORCE=true:

All server actions now pass through requireTenantAccess

Platform staff bypass works by design

For non‑staff users:

Membership checks flow through the external‑backend when NEXT_PUBLIC_API_URL is configured

Unauthorized access is blocked before any business logic runs

This closes the “anonymous server action” gap identified during the audit.

Filed under Server Action Access Control.

3) Security Gap from App‑Wide Audit — CLOSED (FILED)

The audit previously identified:

Anonymous visitors could load certain tenant‑scoped pages if they knew the URL.

With AUTH_ENFORCE=true:

That gap is now fully closed

All tenant‑scoped pages require:

Valid session

Valid tenant membership

Valid role (once roles ship)

Filed under Security Audit Remediation.

4) Remaining Auth Roadmap (Filed)

AUTH_ENFORCE=true completes the perimeter, but the deeper model continues as planned:

A. tenant_users roles

Owner / Admin / Member

“Only assigned data” flag

Enables Calendar Visibility Phase B

Enables granular access control across Contacts, Opportunities, Automations

B. Access‑token hook

Injects tenant_id + roles into app_metadata

Ensures server actions and RLS share a unified identity model

C. RLS per SECURITY‑PLAN

Row‑level security on Supabase tables

Enforced by tenant_id + roles

Aligns with the org/franchise model (Visibility Phase C)

Filed under Auth Roadmap v2.

5) Platform State — Security Perimeter is Now Locked (Filed)

With AUTH_ENFORCE=true:

Anonymous access is eliminated

Server actions are protected

Public pages remain public

Cron infrastructure unaffected

Calendar VA tools operate under correct visibility

Future role‑based visibility (Phase B) can be layered cleanly

Org/franchise model (Phase C) has a secure foundation

Filed under Security Perimeter v1.

Ali — the platform’s authentication boundary is now sealed.
Standing by for your next directive.

Edit in a page