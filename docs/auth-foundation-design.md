# Auth Foundation — Design (no code applied)

> The system has NO real authentication today. This designs it. Nothing here is
> implemented yet; it's the plan that unblocks real accounts + claim-based RLS.

## Current state (verified)

- Frontend sends `Authorization: Bearer <token>` (cookie `token`) to the external
  backend at `NEXT_PUBLIC_API_URL`.
- Backend (`ai-agent-builder`) `extractUserIdFromAuthHeader`: in dev (no
  `JWT_PUBLIC_KEY`) it **decodes without verifying** → any JWT with a `sub` is
  accepted. Some routes (e.g. `POST /tenants`) don't even check a JWT — they read
  `x-user-id` from a header. **This is a dev stub and is insecure for production.**
- No `users`/credentials table; `tenant_users(user_id, role, status)` is the only
  identity record. No signup, no password, no email login.

## Target

Pick ONE identity provider that issues a **verifiable JWT** carrying:
`sub` (user id), `email`, and (ideally) `app_metadata.tenant_id` + roles.

- **Option A — Supabase Auth** (lowest friction; you already run Supabase).
  - Use `supabase.auth` for signup/login/password-reset/email-verify.
  - `sub` = Supabase user id; attach `app_metadata.tenant_id` + role via an admin
    hook / on first tenant membership.
  - Bonus: JWT flows naturally into PostgREST so `auth.jwt()` populates →
    **unblocks Cycle-7 claim-based RLS** (`claim_tenant()`).
- **Option B — External IdP** (Auth0/Clerk/etc.) if you want hosted UIs/SSO.
  - Backend verifies the IdP JWT with `JWT_PUBLIC_KEY` (JWKS).

Recommendation: **Option A (Supabase Auth)** — it directly enables the RLS we
already designed and avoids a second vendor.

## Required changes (later cycles, gated)

1. **Backend:** set `JWT_PUBLIC_KEY` (or Supabase JWT secret) so
   `extractUserIdFromAuthHeader` VERIFIES, not just decodes. Remove the
   `x-user-id` fallback on mutating routes.
2. **Signup/login UI:** add `/login` + `/signup` (Supabase Auth) that set the
   `token` cookie the frontend already reads.
3. **Membership linkage:** on signup/first login, ensure a `tenant_users` row
   (role) exists; superadmin is a role/claim, not a magic email.
4. **Claim plumbing:** put `tenant_id` into the JWT (app_metadata) so
   `claim_tenant()` works → then (and only then) re-apply Cycle-7 RLS in staging.
5. **Roles:** map `tenant_users.role` (owner/admin/editor/viewer + superadmin) into
   the JWT or a verified lookup for authorization.

## Superadmin / "god" account

- Implement as a **verified role claim** (e.g. `app_metadata.superadmin = true` or a
  `tenant_users` row with role `superadmin` on a special "platform" scope), NOT a
  hardcoded email string.
- Enforced only AFTER steps 1–5 exist. Until then, `sysadmin@…` are just labels.
- Keep `sysadmin@aibizconnect.ca` + `sysadmin@aibizconnect.app` as break-glass
  owner logins, MFA required, not the daily driver.

## Migration path (safe order)

1. (Done) Bootstrap owner tenants with placeholder admin `user_id`.
2. Build Supabase Auth signup/login → real users get real `sub`s.
3. **Reconcile:** update the bootstrap `tenant_users` rows' `user_id` to the real
   Supabase `sub` for `admin@aibizconnect.app` (one-time fix).
4. Add `tenant_id` claim plumbing → re-apply Cycle-7 RLS in staging → verify with
   the rls-test harness → promote.
5. Remove all dev stubs (`x-user-id`, decode-without-verify).

## Status / Progress

**Slice 1 — BUILT (2026-05-31):**
- `app/login/page.tsx` — Supabase Auth sign-in + sign-up + password reset. On
  session, mirrors the access_token into a non-httpOnly `token` cookie + localStorage
  (so the existing backend `Authorization: Bearer` calls keep working). Renders 200.
- `app/auth/signout/route.ts` — ends the session, clears the `token` cookie.
- `scripts/link-admin-supabase-user.mjs` — reconciles the placeholder admin
  user_id (0fb27063…) to the real Supabase `sub` for admin@aibizconnect.app on both
  owner tenants.

**Still TODO (next slices):**
1. **Backend JWT verification:** set `JWT_PUBLIC_KEY` on `ai-agent-builder` to the
   Supabase **JWT secret** (Supabase dashboard → Settings → API → JWT Secret) so
   `extractUserIdFromAuthHeader` VERIFIES instead of decoding. Then remove the
   `x-user-id` fallback on mutating routes (`POST /tenants`, etc.).
2. **Route protection:** add middleware to require a session for `/tenants/**`
   editor routes (public `/sites/**` stays open).
3. **tenant_id claim** in `app_metadata` → unblocks Cycle-7 RLS (staging).
4. **Reconcile run:** after Ali signs up admin@aibizconnect.app, run the link script.

Human steps (Ali): sign up at /login; add the JWT secret env; (later) decide MFA.
