# Knowledge Catalogue (Agent-to-Agent) — Phase 1: passive surface

The Knowledge Catalogue is a structured, verified, machine-readable record of a business
that AI agents can **read (cite)** and — after Phase 2 — **call (query)**. This is the
"Agent-to-Agent (A2A)" service. Phase 1 (this doc) ships the **passive surface** on the
existing Next.js/Vercel app with **zero new infra**. Flagship pilot tenant: **ali.realtor**.

Full plan: `C:\Users\User\.claude\plans\logical-sniffing-kazoo.md`.

## What shipped (Phase 1)

| Area | File |
|---|---|
| Schema + zod validator + helpers | `lib/catalogue/schema.ts` |
| Pilot seed data (typed, honest) | `lib/catalogue/fixtures/ali-realtor.ts` |
| Shared loader (latest published) | `lib/catalogue/store.ts` |
| Price/area formatters | `lib/catalogue/format.ts` |
| llms.txt section renderer | `lib/catalogue/llms-txt.ts` |
| A2A Agent Card builder | `lib/catalogue/agent-card.ts` |
| DB table + RLS | `supabase/migrations/0086_tenant_catalogues.sql` |
| Pilot seed (idempotent) | `supabase/seed/ali-realtor-catalogue.sql` |
| llms.txt route (extended) | `app/sites/[tenantId]/llms.txt/route.ts` |
| JSON-LD (extended) | `lib/seo/structured-data.ts` (`buildJsonLd({ …, catalogue })`) |
| `/.well-known/agent-card.json` | `app/sites/[tenantId]/well-known/agent-card.json/route.ts` |
| `/.well-known/catalogue.json` | `app/sites/[tenantId]/well-known/catalogue.json/route.ts` |
| Tenant-domain rewrites | `middleware.ts` (`TENANT_FILE_REWRITES`) |
| Validation script | `scripts/check-catalogue.mts` (`npm run check:catalogue`) |

## Data model

One versioned JSON doc per tenant in `tenant_catalogues.doc` (jsonb), validated by
`lib/catalogue/schema.ts` — schema-light, mirroring `tenant_ai_agents` (0053). Sections:
`identity`, `credentials`, `performance_metrics`, `services`, `service_areas`, `faqs`,
`policies`, `reviews`, `qa`, `citations`, `verification`. `vertical` is denormalized from
`tenants.industry_key` (0077). Vertical-agnostic: the same schema validated a realtor and a
plumber in tests.

## The verification gate (important)

Non-regulated info (services, areas, FAQs, contact, expertise) publishes as soon as the row
is `status='published'`. **Regulated fields — `credentials.license_number` and
`reviews.aggregate` — are only ever emitted when `verification.verified` is true AND within
`freshness_ttl_days`** (`isVerificationFresh`). The public JSON surface also runs
`toPublicView` to redact those fields when stale/unverified. This keeps us from having an AI
cite an unconfirmed license number or rating — the core liability flagged in the plan.

The ali.realtor seed ships with `verified: false` and **no** license number / ratings /
metrics on purpose. To light those up: fill `credentials.license_number`,
`reviews.aggregate`, `performance_metrics` in the fixture/DB, then set
`verification.{verified:true, verified_at, method}`.

## Deploy / seed steps (not yet run — needs DB + deploy access)

1. Apply the migration: `supabase/migrations/0086_tenant_catalogues.sql`.
2. Seed the pilot: run `supabase/seed/ali-realtor-catalogue.sql` (idempotent; resolves the
   tenant from `tenant_domains` by `custom_domain='ali.realtor'` or `subdomain='ali'` — it
   no-ops if the tenant isn't provisioned, so confirm ali.realtor exists as a tenant first).
3. Deploy the app (Vercel). Point ali.realtor DNS at the platform if not already (middleware
   tenant routing is DNS-gated).
4. Verify live (see below).

## Verify

- **Offline (now):** `npm install` then `npm run check:catalogue` → runs 29 assertions
  (schema, gating, seed/fixture parity, llms.txt, JSON-LD, agent card, redaction). All green.
- **Live (after deploy):**
  - `curl https://ali.realtor/llms.txt` → catalogue sections render, license shows "pending".
  - `curl https://ali.realtor/.well-known/catalogue.json` → full doc, regulated fields redacted.
  - `curl https://ali.realtor/.well-known/agent-card.json` → skills + catalogue link (no active
    endpoints until `NEXT_PUBLIC_A2A_BASE` is set in Phase 2).
  - Paste the page's JSON-LD into Google Rich Results Test.
  - Ask ChatGPT/Claude/Gemini/Perplexity "Who is the realtor at ali.realtor and what areas do
    they serve?" — confirm live fetch/citation.

## Phase 2 (active surface — not started)

Stand up the MCP server + `/a2a/:tid/*` HTTP query endpoint on the deployed Cloudflare Worker
(`projects/seo-geo-analysis/seo-geo-platform`), publish the catalogue snapshot to KV, then set
`NEXT_PUBLIC_A2A_BASE` so the Agent Card advertises the live `url` + `mcp.endpoint`. Tools:
`get_profile`, `search_services`, `get_pricing`, `check_availability`, `ask` (RAG via Workers
AI). See the plan file for the full Phase 2 design.
