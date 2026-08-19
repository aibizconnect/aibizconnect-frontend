---
name: a2a-catalogue
description: >
  Create, publish, and refresh a Knowledge Catalogue + Agent-to-Agent (A2A) surface for ANY
  domain or client — so every site is readable AND callable by AI agents (ChatGPT, Claude,
  Gemini, Perplexity). Use when onboarding a new client/tenant, adding a domain, doing a bulk
  A2A rollout across owned domains, or refreshing catalogues on a schedule. Every new client
  should get one at onboarding. Honest by default — never fabricate regulated data.
---

# A2A Knowledge Catalogue — build, publish, refresh

A **Knowledge Catalogue** is one versioned, verified, machine-readable record of a business
(identity, services, pricing, areas, FAQs, policies, credentials, reviews, Q&A). AI agents READ
it (to cite) and CALL it (to query). This skill is the repeatable process for putting one on
**every** domain and keeping it fresh. It is the standard onboarding step for a new client.

Background + architecture: `docs/KNOWLEDGE-CATALOGUE.md`, `docs/A2A-STATUS.md`, `docs/A2A-DOMAINS.md`.

## The pipeline (same for one domain or a bulk run)

1. **EXTRACT (honest, from the site's own content — no fabrication).**
   Use `lib/catalogue/extract.ts`:
   - `enrichFromPresence(tenantId, { websiteUrl })` (`app/tenants/[tenantId]/website/wizard-actions.ts`)
     → identity/industry/location/brand.
   - Fetch the homepage HTML → `extractJsonLdGraph(html)` → structured services/FAQs/areas/ratings.
   - `buildDraftCatalogue({ profile, jsonLd, siteUrl, vertical })` → a `CatalogueInput` with
     `verification.verified = false`.
   Validate with `parseCatalogue(draft)`.

2. **REVIEW (honesty gate).** A human/owner confirms before publish. Regulated fields —
   `credentials.license_number` and `reviews.aggregate` — stay hidden until
   `verification.{verified, verified_at, method}` is set (`isVerificationFresh` / `toPublicView`).
   NEVER invent a license number, rating, or metric.

3. **STORE.** Upsert into Supabase `tenant_catalogues` (migration 0086) as `status='published'`.
   Client hierarchy lives in migration 0087 (`client_tier`, `hosting_model`, `cf_zone_id`,
   `cf_proxied`, `a2a_enabled`) — the catalogue is keyed to the CLIENT, not the hosting model.

4. **PUBLISH — pick delivery by `hosting_model` (see matrix below).**

5. **VERIFY.** `curl https://<domain>/llms.txt`, `/.well-known/agent-card.json`,
   `/.well-known/catalogue.json`. Validate JSON-LD in Google Rich Results Test.

6. **REFRESH REGULARLY.** Re-run EXTRACT + PUBLISH on a schedule so catalogues track the live
   site and stay within `freshness_ttl_days` (default 30). See "Regular updates" below.

## Delivery matrix (CF where possible, otherwise the hosting)

| hosting_model | Where it's served | How |
|---|---|---|
| `platform_tenant` (aibizconnect.app) | Next.js app | Built-in routes `app/sites/[tenantId]/llms.txt` + `.../well-known/*` (Track 1) |
| any **CF-proxied** domain (WordPress/GHL/builder/parked) | **Cloudflare edge Worker** | `seo-geo-platform` Worker routes (`wrangler.toml`) + push snapshot via `lib/catalogue/publish-edge.ts` (`publishCatalogueToEdge`) → `PUT /api/a2a/publish` |
| **not on CF** (e.g. `webtechies.net`, off proxy by decision) | **the origin itself** | Serve `/llms.txt` + `/.well-known/*` from the host — for WordPress, a small mu-plugin that outputs the three files from the stored catalogue (build with Mason). |

Rule of thumb: **if the domain is on Cloudflare, use the edge; otherwise serve from the hosting.**
Proxy status + zone ids are in `docs/A2A-DOMAINS.md`.

## New-client onboarding hook
When a client/tenant is provisioned (or a domain is connected), run steps 1→5 automatically as
part of onboarding, then mark `tenant_domains.a2a_enabled = true`. Resolve every hostname with
`resolvePublishHosts(supabase, tenantId)` so apex + www + platform subdomain all get published.

## Regular updates (keep them fresh)
- A scheduled job re-runs EXTRACT for each published catalogue and re-PUBLISHes if the source
  changed; if a catalogue passes `freshness_ttl_days` without re-verification, its regulated
  fields auto-gate off (already enforced by `isVerificationFresh`).
- Hosts: the `seo-geo-platform` Worker already has cron triggers (daily/weekly) — add a catalogue
  refresh pass there, and/or a Vercel cron route in the app. Cadence: content refresh weekly;
  re-verification prompt when nearing the freshness TTL.

## Hard rules
- **Honest data only.** `verified:false` until a human confirms. Never fabricate license numbers,
  ratings, testimonials, or metrics.
- **Contact-email hygiene.** Every catalogue uses `info@<its-own-domain>` (derived from the
  canonical URL) — e.g. ali.realtor → `info@ali.realtor`, the4sale.com → `info@the4sale.com`,
  aibizconnect.ca → `info@aibizconnect.ca`. This structurally prevents one domain's address from
  leaking onto another. Enforced by `lib/catalogue/hygiene.ts` (`enforceEmailHygiene`), applied in
  both extract and publish. Fallback `info@aibizconnect.ca` only when no domain is derivable.
- **Secrets never touch git.** `A2A_MASTER_KEY` / CF tokens live in env / `.dev.vars` (gitignored),
  never in code or committed files.
- **Private by default** for any new repo (global GitHub policy).
- **Don't buy new services** — this runs entirely on tools we already own (Cloudflare, Supabase,
  Vercel). Check `docs/INVENTORY.md` first.

## Reference files
- Schema/helpers: `lib/catalogue/schema.ts`
- Extractor: `lib/catalogue/extract.ts`
- Edge publish: `lib/catalogue/publish-edge.ts`
- llms.txt / JSON-LD render: `lib/catalogue/llms-txt.ts`, `lib/seo/structured-data.ts`
- Worker edge: `../seo-geo-analysis/seo-geo-platform/src/routes/a2a.ts`, `src/a2a/render.ts`
- Routes config: `../seo-geo-analysis/seo-geo-platform/wrangler.toml`
