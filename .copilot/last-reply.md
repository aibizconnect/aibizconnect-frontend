Short answer:  
Your domain + email foundation is correct, the flows are correct, the security model is correct, and you can proceed to Social next.
There are only three small adjustments I recommend before you move on — all around hardening verification and future‑proofing DNS/email.

Below is the full ruling, structured exactly the way your builder loop expects.

✅ What you shipped — VERIFIED & CORRECT
1. Foundations (0031)

tenant_integrations + tenant_secrets with AES‑256‑GCM

server‑only secret access

platform‑admin‑gated writes

audit log integration

brand/design tokens on website_brand_settings

default Roboto

soft‑gradient backgrounds + palette tokens

Verdict:  
This is the correct foundation for all future integrations.
No changes required.

2. Domain + Email (0032)

Extended tenant_domains (kept routing columns — correct)

tenant_email_settings

server‑only Cloudflare client

CNAME/TXT creation via platform token

DNS verify via DoH

draft‑only subdomain reservation

custom domain → CNAME+TXT proof → DoH verify → admin‑gated publish

email sender identity + encrypted ESP key

SPF/DMARC/DKIM records + verify

Verdict:  
This is the correct architecture.
No structural changes required.

🟦 The 3 adjustments I recommend before moving to Social

These are small, but they will save you pain later.

Adjustment 1 — Add a “domain provenance” field

Add:

provenance (enum: system_subdomain, tenant_custom, platform_reserved)

Why?

Prevents accidental deletion of system‑reserved domains

Allows Supervisor to enforce different rules for free vs custom

Helps future billing (custom domain = paid feature)

Supervisor rule:

system_subdomain → cannot be removed by tenant

tenant_custom → must pass DNS verification before publish

platform_reserved → only superadmin can modify

Adjustment 2 — Add DKIM key rotation metadata

Add to tenant_email_settings:

dkim_key_version

dkim_last_rotated_at

Why?

ESPs (Resend, Postmark, SendGrid) rotate DKIM keys

You need to track which version is active

Prevents mismatched DKIM records after rotation

Enables Supervisor to detect stale DNS

Supervisor rule:

If dkim_key_version mismatches DNS → dkim_status = failed

Adjustment 3 — Add “verification_attempts” + “last_verified_at”

Add to both tenant_domains and tenant_email_settings:

verification_attempts (int)

last_verified_at (timestamp)

Why?

Prevents infinite verification loops

Allows rate‑limiting

Enables Supervisor to detect “flapping” DNS

Helps debugging when tenants misconfigure DNS

Supervisor rule:

Max 5 attempts per hour

If >5 attempts → require admin override

If DNS flaps (verified → failed → verified) → flag for review

🟩 Everything else is correct — proceed to Social

Your next step per the plan is:

Social Settings + Social Integrations

Social URLs (FB/IG/LinkedIn/TikTok/YouTube/X)

Optional OAuth tokens (encrypted)

Draft‑only

No posting until Supervisor verifies connection

Tenant‑scoped

Audit‑logged

This is the correct next milestone.

📘 DECISION‑LOG

Decision 1 — Domain/email foundation:  
Approved. Architecture, flows, and security model are correct.

Decision 2 — Required adjustments:  
Add domain provenance, DKIM rotation metadata, and verification attempt tracking.

Decision 3 — Next step:  
Proceed to Social integrations exactly as planned.

If you want, I can now generate the Social Integrations data model or the Supervisor rules for Social OAuth.

Edit in a page