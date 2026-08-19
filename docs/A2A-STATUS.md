# Knowledge Catalogue / A2A — session status (saved 2026-07-10)

Resume point after computer restart. Read this first, then the plan file
`C:\Users\User\.claude\plans\logical-sniffing-kazoo.md`.

## Where we are
Phase 1 (passive Knowledge Catalogue) is **built + validated**. The cross-domain **edge
delivery layer** (Track 2) is **built + validated** but **not yet deployed**. Nothing is live
yet (no DB migration applied, no Worker deploy, no CF routes).

## Decisions locked
- Milestone 1 = **flagship pilot** (ali.realtor). Approach = **layered passive → active**.
  Schema = **vertical-agnostic**.
- Delivery = **hybrid**: app-hosted tenants use the Next.js routes; **CF Worker** covers
  non-app origins (WordPress/GHL/parked/clients).
- Edge host = **extend the deployed `seo-geo-platform` Worker**.
- CF changes = I script them, **you review before anything hits live DNS**.
- **webtechies.net stays OFF the CF proxy** — excluded from edge A2A.

## Built & validated (code only — NOT deployed)
**App (`projects/aibizconnect-frontend`):**
- `lib/catalogue/schema.ts` (zod v4), `fixtures/ali-realtor.ts`, `store.ts`, `format.ts`,
  `llms-txt.ts`, `agent-card.ts`
- `supabase/migrations/0086_tenant_catalogues.sql` + `supabase/seed/ali-realtor-catalogue.sql`
- `supabase/migrations/0087_client_hierarchy.sql` (client_tier, hosting_model, cf_zone_id,
  cf_proxied, a2a_enabled)
- Extended `app/sites/[tenantId]/llms.txt/route.ts`, `lib/seo/structured-data.ts`, `middleware.ts`
- New `app/sites/[tenantId]/well-known/{agent-card.json,catalogue.json}/route.ts`
- `scripts/check-catalogue.mts` → `npm run check:catalogue` (29 assertions, all green)
- Docs: `docs/KNOWLEDGE-CATALOGUE.md`, `docs/A2A-DOMAINS.md`, this file

**Worker (`projects/seo-geo-analysis/seo-geo-platform`):**
- `src/a2a/render.ts` (ported gating/render — no zod)
- `src/routes/a2a.ts` (public serve `/llms.txt` + `/.well-known/*`; authed `PUT /api/a2a/publish`)
- Wired into `src/index.ts`
- `A2A-ROUTES.proposed.md` (inert — proposed wrangler routes for review)

All new/changed files pass esbuild syntax check; schema+edge render validated via tsx harnesses.

## Verification note (important)
The ali.realtor seed is **honest/unverified** on purpose: `verification.verified=false`, and NO
license number / ratings / metrics. Regulated fields stay hidden until the owner fills + verifies
them. Non-regulated info (services, areas, FAQs, contact) publishes now.

## Secrets / GitHub safety
- No token was ever written to a file — only loaded into a shell var, never printed/committed.
- `seo-geo-platform` is not a git repo; `.dev.vars` gitignored (patterns added). `ai-agent-builder/.env`
  gitignored + untracked. Safe.
- CF token in `seo-geo-platform/.dev.vars` scope = **Zone Read + DNS Read only** (cannot attach
  Worker routes or edit DNS).

## Domain inventory (11 CF zones, all active) — full table in docs/A2A-DOMAINS.md
- Proxied + client-brand (candidates for edge A2A): **ali.realtor, the4sale.com, the4sale.net,
  gtaluxuryhomes.ca, on-dreamhomes.com, alibolourchi.com** (all → shared host 23.21.221.218 AWS).
- aibizconnect.app → Vercel (Track 1, Next.js). lead-loop.co → CF Pages. aibizconnect.ca → corp.
- Grey (not proxied): **bolourchi.com**, **webtechies.net** (keep OFF).

## Confirmed 2026-07-10
- **Domain set:** ALL owner domains get the A2A edge **except `webtechies.net`** (stays off proxy).
  `aibizconnect.app` = Track 1 (Next.js routes, not the Worker). Proposed routes updated in
  `seo-geo-platform/A2A-ROUTES.proposed.md` (client-brand + corp/product; bolourchi.com commented
  out until proxied).
- **app→edge publish util:** BUILT → `lib/catalogue/publish-edge.ts`
  (`publishCatalogueToEdge`, `unpublishCatalogueFromEdge`, `resolvePublishHosts`). Needs app env:
  `A2A_WORKER_URL` (default set), `A2A_MASTER_KEY` (= Worker MASTER_API_KEY), optional
  `NEXT_PUBLIC_A2A_BASE`. Parse-clean.

## Done 2026-07-10 (later)
- **Routes wired into `wrangler.toml`** — `workers_dev=true` + **27 routes / 9 zones** (client-brand,
  corp/product, and bolourchi.com). Valid TOML, verified. Takes effect on your next `wrangler deploy`.
- **bolourchi.com proxied** (by owner) — verified HTTP 200, no loop; its A2A routes are active.
- **app→edge publish util** built (`lib/catalogue/publish-edge.ts`).

## NEXT ACTIONS — now needs YOUR infra access
1. `wrangler deploy` the Worker (from `seo-geo-platform/`) — attaches the 27 routes.
2. Apply Supabase migrations `0086` + `0087`; run `supabase/seed/ali-realtor-catalogue.sql`
   (confirm ali.realtor is a tenant first, else no-op).
3. Set app env `A2A_MASTER_KEY` (= Worker MASTER_API_KEY) so publish-edge can push.
4. Publish the ali.realtor snapshot (via publish-edge, or the curl in A2A-ROUTES.proposed.md).
5. Verify: `curl https://ali.realtor/llms.txt` + `/.well-known/*`.
6. Then Phase 2 (active MCP/query) on the same Worker.

Non-blocking: what platform is `23.21.221.218`? (sets hosting_model for the brand cluster).

## Every-domain + every-client rollout (added 2026-07-10)
Goal: A2A on ALL domains (CF edge where proxied, origin/WordPress otherwise), a catalogue per
domain extracted honestly from each site, auto-created for new clients, and refreshed regularly.
- **Extractor built** → `lib/catalogue/extract.ts` (`buildDraftCatalogue` from `enrichFromPresence`
  + on-page JSON-LD). Proven on aibizconnect.ca: pulled 6 real services, 5 FAQs, location — a
  complete `verified:false` draft. This is the repeatable engine for all domains + new clients.
- **Onboarding skill built** → `.claude/skills/a2a-catalogue/SKILL.md` (the standard process any
  agent follows: extract → review → store → publish [edge or origin] → verify → refresh).
- **Delivery matrix:** platform_tenant → Next routes; CF-proxied → edge Worker; not-on-CF
  (webtechies) → origin (WordPress mu-plugin, TBD with Mason).
- **Regular updates:** scheduled re-extract + re-publish (Worker cron and/or Vercel cron); freshness
  gate auto-hides regulated fields past `freshness_ttl_days`. Refresh job = next build item.
- **Data issue flagged:** aibizconnect.ca's own JSON-LD lists `info@ali.realtor` as contact email
  (+ 416-727-7111) — likely a site-markup copy-paste bug to fix at source.

### Rollout build status
1. **Refresh cron** — ✅ built: `lib/catalogue/refresh.ts` + `app/api/cron/refresh-catalogues/route.ts`
   (x-cron-secret; re-extracts content for non-verified catalogues, refreshes edge KV). Fire it
   weekly from the CF cron worker. Email guardrail applied on every refresh.
2. **Bulk first-pass extraction** — ✅ done: draft catalogues generated for all 8 distinct domains
   (email hygiene verified: each → info@<own-domain>; ali.realtor keeps its own). aibizconnect.ca
   richest (6 services, 5 FAQs); realtor sites yield FAQs; bolourchi.com + lead-loop.co have no
   JSON-LD (thin — need enrichFromPresence or manual authoring). Drafts in session scratchpad.
3. **WordPress origin server** — ⏳ pending: mu-plugin serving /llms.txt + /.well-known/* for
   webtechies.net / any non-CF host (Mason). Low priority (webtechies is off-proxy + thin).

### Deploy checklist (needs YOUR infra — code is ready)
- `wrangler deploy` the Worker (attaches the 27 routes in wrangler.toml).
- Apply migrations `0086` + `0087`; publish catalogues (extractor output) into `tenant_catalogues`.
- Set app env `A2A_MASTER_KEY` (= Worker MASTER_API_KEY), optional `A2A_WORKER_URL`.
- Add the `refresh-catalogues` route to the CF cron worker schedule (weekly).
- Verify `curl https://<domain>/llms.txt` + `/.well-known/*`.

## Deploy/seed checklist (when ready — needs your DB + CF access)
1. Apply `0086` + `0087`; run `supabase/seed/ali-realtor-catalogue.sql` (confirm ali.realtor is a
   tenant first, else it no-ops).
2. `wrangler deploy` the Worker (after adding routes to wrangler.toml).
3. `PUT /api/a2a/publish` a snapshot for ali.realtor (see A2A-ROUTES.proposed.md).
4. Verify `curl https://ali.realtor/llms.txt` + `/.well-known/*` at the edge.
5. Then Phase 2 (active MCP/query) on the same Worker.

## Scratch (safe to delete)
Validation harnesses in the session scratchpad `.../scratchpad/catalogue-validate/` (throwaway).
No project `node_modules` were left behind (the temp zod install was removed).
