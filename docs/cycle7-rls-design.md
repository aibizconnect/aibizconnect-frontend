# Cycle 7 — Tenant-scoped RLS tightening (DESIGN ONLY)

> No DDL applied. Candidate DDL is parked in `supabase/DDL_QUEUE.md` (PENDING).
> Nothing here changes the database until Ali runs it and says "Done".

## Problem

Today every builder table uses interim-open policies (`USING (true) WITH CHECK
(true)`). With the anon/publishable key, **Postgres enforces no tenant isolation**
— all safety rests on the app-layer `eq("tenant_id", …)` filters. A single missed
filter = a cross-tenant leak with no DB backstop.

## Core obstacle (must be solved first)

This app does **not** use Supabase Auth. It authenticates with a **custom external
JWT** and talks to Supabase with the anon/publishable key. Therefore, inside
Postgres, `auth.uid()` is NULL and **no per-user claims are available** to a
policy. You cannot tighten RLS to `auth.uid() = tenant_id` (it would lock everyone
out — exactly the trap the original Phase A spec fell into).

**Prerequisite:** the app must make the caller's tenant claim visible to Postgres.
Two viable paths:

- **(A) Pass the JWT through PostgREST.** Configure the Supabase client to send the
  user's JWT as the `Authorization: Bearer` token so `auth.jwt()` is populated, and
  ensure the JWT carries a verifiable `tenant_id` (or `app_metadata.tenant_id`)
  claim signed by a key Supabase trusts. Policies then read
  `((auth.jwt() -> 'app_metadata') ->> 'tenant_id')::uuid`.
- **(B) Route mutations through a trusted server context.** Keep RLS strict
  (deny-by-default) and perform writes only via the service role on the server
  after the server has verified tenant ownership from the external JWT. The anon
  key then gets read-only public access.

Recommendation: **(B) for writes now** (smallest blast radius, no JWT-claim
plumbing), **(A) later** if direct client reads/writes are needed.

## Target policy model (once a tenant claim is available — path A)

For each tenant table (`website_pages`, `website_page_sections`,
`website_brand_settings`, `website_navigation`, `website_global_blocks`,
`website_page_block_refs`, `website_section_templates`, `website_media`):

- **tenant_rw**: `USING (claim_tenant() = tenant_id) WITH CHECK (claim_tenant() = tenant_id)`
- Keep the existing **public_read_*** policies for published content.
- Drop the `*_interim_open` permissive policies.

Where `claim_tenant()` is a helper:
`((auth.jwt() -> 'app_metadata') ->> 'tenant_id')::uuid`.

## Migration safety

- **Reversible:** keep the interim-open policies until path A/B is proven in
  staging; switch tables one at a time.
- **Verify before drop:** confirm the editor still reads/writes under the new
  policy with a real JWT in staging.
- **No data change** — policies only.

## Test harness (design)

A `scripts/rls-test.mjs` (report-only) that, given two tenant JWTs, asserts:
- tenant A can read/write its own rows,
- tenant A canNOT read/write tenant B's rows,
- anonymous can read only `is_public = true` pages and their sections,
- anonymous canNOT read drafts.
(Implemented later; requires real JWTs — symbolic for now.)

## Status

- Design: ✅ this doc.
- DDL: ⏳ PENDING in `supabase/DDL_QUEUE.md` — NOT applied.
- Prereq (JWT claim plumbing or service-role write path): ❌ not built; required
  before the DDL is meaningful.
