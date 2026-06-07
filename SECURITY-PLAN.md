# AIBizConnect — Security Hardening Plan

Status as of 2026-06-06. Owner: al@aibizconnect.app.

## Where we are

Authentication and tenant authorization were intentionally deferred behind a flag so
the editor wasn't locked out before logins existed. Two distinct layers:

| Layer | Question it answers | Today |
|-------|--------------------|-------|
| **Route auth** (`middleware.ts`) | "Is anyone signed in?" | Gated by `AUTH_ENFORCE`; **off** in dev → anyone can load `/tenants/**`. |
| **Per-tenant authz** (server actions) | "May *this* user touch *this* tenant?" | Was missing — actions trusted the `tenantId` in the URL. Now guarded by `requireTenantAccess()` (also gated by `AUTH_ENFORCE`). |
| **Database RLS** (Postgres) | Defense-in-depth at the data layer | Interim-open. Service-role client bypasses it. **Not yet enforced.** |

## Step 1 — Turn on route auth (you, now)

In `.env.local`:

```
AUTH_ENFORCE=true
```

Restart `npm run dev`. Effect: any unauthenticated request to `/tenants/**` or
`/dashboard/**` redirects to `/login`. This also activates `requireTenantAccess()`.

Prerequisite: be able to log in first. Use `/login` with `al@aibizconnect.app`. The
Media Storage status chip should read green `★ Admin · al@aibizconnect.app`.

## Step 2 — Per-tenant authorization (done, activates with the flag)

`lib/auth/tenant-access.ts` → `requireTenantAccess(tenantId)`:
- No-op while `AUTH_ENFORCE !== "true"` (so dev is unchanged).
- Requires a session token.
- Platform admin/staff bypass.
- Otherwise asks the backend (`GET {NEXT_PUBLIC_API_URL}/tenants/{tenantId}`) whether
  this token may access the tenant; fails closed on a non-OK / unreachable backend.

**Wired into** (tenant-scoped mutations): `uploadMedia`, `deleteMedia`,
`moveMediaToFolder`, `createFolder`, `deleteFolder`, `importStockMedia`,
`generateAiImages`. (`importAiMedia` / `importCanvaMedia` go through `uploadMedia`.)

### Remaining to wire (next pass)
Same one-line `await requireTenantAccess(tenantId)` guard on the rest of the
tenant-scoped mutating actions:
- Website/page actions: `createWebsiteFromWizard`, `generateWizardPages`, page/section
  save & delete, brand/theme writers, `useTemplate`.
- Contacts, pipelines, automations, calendars, memberships/courses actions.
System-library actions (`bulkUploadSystemMedia`, `promoteMediaToSystem`,
`deleteSystemMedia`, `declutterSystemMedia`) are already admin-gated via
`canManageSystemLibrary()` and need no per-tenant check.

## Step 3 — Database RLS (defense-in-depth, planned)

Even with Steps 1–2, the service-role client bypasses Postgres RLS, so a bug in an
unguarded action is still a data-exposure risk. Target end state:

1. **Establish the membership source of truth.** Today it lives in the external
   backend. Either (a) mirror tenant membership into a Supabase `tenant_members`
   table (`tenant_id`, `user_id`/`email`, `role`), or (b) keep the backend as the
   sole authority and never query tenant data from the Next app with the anon key.
2. **Stop using the service-role key for user-facing reads/writes.** Move per-tenant
   data access to a request-scoped client carrying the user's JWT, so RLS applies.
   Keep the service-role client only for genuinely system-level jobs (System library,
   nightly media steward) in clearly-marked server-only code.
3. **Author RLS policies** on `website_*`, `media_folders`, `websites`, `domains`,
   `form_submissions`, `ai_usage_events`: a row is visible/mutable only when its
   `tenant_id` is in the caller's membership set; System rows
   (`tenant_id = SYSTEM_TENANT_ID`) are world-readable, writable only by platform
   admin/staff.
4. **Roll out behind a flag**, table by table, verifying the app still works with RLS
   on before removing the service-role fallback.

## Quick checklist

- [ ] `.env.local`: `AUTH_ENFORCE=true`, `PLATFORM_ADMIN_EMAILS=al@aibizconnect.app,admin@aibizconnect.app`
- [ ] Confirm login works and the Media chip turns green
- [ ] Extend `requireTenantAccess()` to the remaining mutations (Step 2 list)
- [ ] Decide membership source of truth (Step 3.1)
- [ ] Migrate user-facing data access off the service-role key (Step 3.2)
- [ ] Author + roll out RLS policies (Step 3.3–3.4)
