# AIBizConnect — Security Audit (Phase 1 findings)

**Date:** June 2026 · **Scope:** `C:\server\aibizconnect-frontend` (Next.js + Supabase multi-tenant SaaS)
**Method:** Grounded read of the codebase — auth (`middleware.ts`, `lib/auth/*`), tenant scoping,
Supabase RLS migrations, secrets/git-tracking, webhooks, payments. Read-only; nothing modified.
**Companion:** the team's own `SECURITY-PLAN.md` (2026-06-06) — this audit confirms and extends it.

> **Honest overall verdict:** the app has a *thoughtful* security plan and the right primitives exist
> (route auth is live in prod, a per-tenant guard exists, webhook secrets exist, env files are ignored).
> The weakness is **defense-in-depth**: tenant isolation currently rests almost entirely on **app-layer
> discipline**, with **no database backstop** (RLS is rolled back to fully-open) and an authz guard that
> **fails open** when its backend is unreachable. For a multi-tenant system holding CRM/PII, that's the
> thing to close before pursuing ISO 27001 / enterprise deals.

---

## Findings

| ID | Sev | Area | Finding | Evidence |
|----|-----|------|---------|----------|
| **H1** | High | Tenant isolation (DB) | Postgres **RLS is not enforced** — Cycle-7 tenant policies were rolled back to `for all using (true) with check (true)` (fully open) because the app connects without a tenant claim. No data-layer backstop: one missing `.eq("tenant_id")` in app code = cross-tenant exposure. | `supabase/rollback-cycle7-rls.sql`; `SECURITY-PLAN.md:14` |
| **H2** | High | Authorization (root cause) | **User-facing data uses the Supabase service-role key, which bypasses RLS.** So isolation depends on app code being perfect, not the DB enforcing it. | `SECURITY-PLAN.md:14,55` (Step 3.2); `lib/supabase/service.ts` |
| **H3** | Med-High | Authorization guard | `requireTenantAccess()` is now wired broadly (website, crm, calendars, funnels, store, team, agent…), which is good — **but it FAILS OPEN**: it `return`s (allows) when `NEXT_PUBLIC_API_URL` is unset *or* the membership backend is unreachable, despite the file's "fails closed" docstring. Needs a coverage audit + fail-closed-in-prod. | `lib/auth/tenant-access.ts:38-66` (esp. 52, 57) |
| **M1** | Med | Secrets / repo hygiene | **`.architect/` + `.copilot/` AI logs (162 tracked files) are committed** and not git-ignored. Secret-pattern scan matched several (`history.json`, `CONVERSATION.md`, `DECISIONS.md`). May contain pasted secrets or sensitive internal detail now in git history. | `git ls-files .architect/* .copilot/*` |
| **M2** | Med | Secrets in client bundle | A JWT (`eyJ….eyJ…`) is embedded in a **committed** client bundle. Almost certainly the public Supabase **anon** key (safe, it's meant to be public) — but must be **confirmed not to be the service-role key**. | `.stitch-out/abc-mirror/assets/index.js` |
| **M3** | Med | Webhook auth | Signature/HMAC handling exists for Meta, Twilio, KYC, Shopify, Occasions-widget — good — but each endpoint must be **confirmed to reject** unsigned/invalid requests (not just reference the secret). Occasions-widget v1 intentionally skips site-ownership verification (noted by the team). | `app/api/webhooks/*`, `lib/server/{twilio,kyc,shopify,social}.ts` |
| **L1** | Low-Med | Dependencies | No evidence of automated dependency scanning (`npm audit` / Dependabot) in the workflow. | `package.json` (no audit step found) |
| **L2** | Low-Med | Audit logging | No dedicated security-event audit trail found (auth failures, tenant-access denials, admin actions). ISO 27001 expects this. | (absence) |

### What's already good (credit where due)
- **Route auth is live in production** (`AUTH_ENFORCE=true`) — unauthenticated `/tenants/**` redirects to `/login`. (`.architect/inbox.md:19`, `middleware.ts:119`)
- **`.env.local` + vault are git-ignored**, not committed. (`.gitignore:34` `.env*`)
- **No hardcoded payment secrets** — `stripeIsLiveKey()` is a prefix check, not a key. (`lib/server/payments.ts:22`)
- A **per-tenant guard exists and is broadly wired**, and it *does* fail closed on an explicit 401/403.
- **A written, honest security plan already exists** (`SECURITY-PLAN.md`) — most of this audit is executing it.

---

## Recommended remediation order

1. **Verify M2 now (5 min):** confirm the bundled JWT is the anon key, not service-role. If service-role → **rotate immediately** and remove. *(Only true "drop everything" item, and probably a false alarm.)*
2. **H3 — guard hardening:** make `requireTenantAccess` **fail closed in production** (allow the dev pass-through only when `AUTH_ENFORCE !== "true"`), and run a coverage audit so every tenant-scoped mutation calls it.
3. **H1 + H2 — the real project:** execute `SECURITY-PLAN.md` Step 3 — move user-facing data access to a **request-scoped anon + JWT client**, author **RLS policies** keyed on membership, roll out **behind a flag, table by table**, then retire the service-role key for user data. This is multi-week, not a patch.
4. **M1 — repo hygiene:** review `.architect/`/`.copilot/` for pasted secrets; **git-ignore them going forward**; if any real secret is found, rotate it and scrub history (BFG/filter-repo).
5. **M3 / L1 / L2:** confirm each webhook rejects bad signatures; add `npm audit`/Dependabot; add a minimal security-event audit log.

## Map to ISO 27001 (Annex A 2022) — so this doubles as compliance prep
- **A.8.3 / A.8.4 Access control & source code** → H2, H3 (least privilege; retire god-key)
- **A.8.24 Cryptography / A.5.14 Information transfer** → M2 (key handling)
- **A.8.28 Secure coding / A.8.29 Security testing** → H1 (RLS), L1 (dep scanning)
- **A.5.15 / A.8.2 Privileged access** → H3 (fail-closed authz), platform-admin gating
- **A.8.15 Logging** → L2 (audit trail)
- **A.8.12 Data leakage prevention** → M1 (secrets in repo)

> These aren't a full ISMS — they're the **technical controls** an auditor checks. The governance layer
> (policies, risk register, asset inventory, Statement of Applicability) comes in Phase 2, once the
> High items above are actually closed.

---

### Deeper checks still worth doing (Phase 1b)
- Confirm M2 key type; enumerate every webhook's verification path (M3).
- Full coverage audit: list every tenant-scoped Server Action and confirm `requireTenantAccess`.
- `npm audit` + review high/critical advisories.
- Grep the committed `.architect/.copilot` logs for real secrets (rotate any found).
- Supabase Storage bucket policies (media) — public vs signed URLs.
