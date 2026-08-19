# A2A Phase 2 — Make the agent surface *callable* (and every discovery file *real*)

> Status: **planned** (2026-07-15). Phase 1 (passive surface) is live: `/llms.txt`,
> `/.well-known/agent-card.json`, `/.well-known/catalogue.json`, clean robots, JSON-LD, weekly
> fresh-content refresh, all on the `seo-geo-platform` Cloudflare Worker across owned domains.
>
> **Core principle (see memory `a2a-real-vs-injected`):** a discovery file is only publishable once a
> real running service backs it. Publishing OAuth/MCP/api-catalog/auth.md/WebMCP with nothing behind
> them recreates the 2026-07-11 fake-injection surface and trips our own `security-scan.mjs`. So the
> sequence is **build the service → then publish its metadata**, never the reverse.

## Why Phase 2
Today we are *crawlable* (agents can read + cite us) but not *callable* (agents can't act). The live,
authenticated **MCP endpoint** is the differentiator no competitor in this niche has shipped — and it's
what turns a whole list of "missing" agent-ready files from **fake** into **true**.

---

## What's real NOW vs. what needs Phase 2

| Feature | Real now? | Becomes real after… |
|---|---|---|
| llms.txt, agent-card.json, catalogue.json | ✅ live | — |
| Clean robots.txt, JSON-LD (RealEstateAgent/FAQ) | ✅ live | — |
| **Markdown for Agents** (Cloudflare AI Crawl Control) | ✅ real feature | just needs **Pro plan** per zone (~$20–25/mo) |
| DNS-AID (`_agents.*` SVCB + DNSSEC) | 🟡 benign/inert | optional; ideally points at the live MCP once built |
| **OAuth/OIDC discovery** (`/.well-known/openid-configuration`, `oauth-authorization-server`) | ❌ fake now | the OAuth server below |
| **oauth-protected-resource** | ❌ fake now | the MCP resource + OAuth below |
| **auth.md** (agent registration) | ❌ fake now | a real agent-registration flow |
| **MCP Server Card** (`/.well-known/mcp/server-card.json`, SEP-1649) | ❌ fake now | the live MCP endpoint |
| **API Catalog** (RFC 9727 `/.well-known/api-catalog`) | ❌ empty now | a documented API (OpenAPI + health) |
| **Agent Skills index** (`/.well-known/agent-skills/index.json`) | ❌ hollow now | skills that are actually callable |
| **WebMCP** (`navigator.modelContext.provideContext`) | ❌ = injection signature | real in-page tools (experimental Chrome API — low priority) |

---

## The build (host = `seo-geo-platform` Cloudflare Worker — already deployed, has the bindings)

### 2a. MCP + HTTP query endpoint
- `src/mcp/server.ts` — MCP over Streamable HTTP at `/mcp/<tenantId>`. Read-only, tenant-scoped tools:
  `get_profile`, `search_services{query,area}`, `get_pricing{service_id}`,
  `check_availability{service_id,date}` (proxy the GHL/calendar we already own),
  `ask{question}` (RAG over `qa`+`faqs`+`services` via **Workers AI** — no external LLM key; strict
  "answer only from context, else refer to the business" grounding).
- `src/routes/a2a.ts` — same tools as plain REST for non-MCP agents.
- **Tiering:** public read on profile/services/pricing/faqs with per-IP KV rate-limiting; `ask` +
  `check_availability` require a key or a stricter per-IP budget. Cache hot; ETag/Cache-Control from
  `updated_at`. Widen CORS to `*` on `/a2a/*` + `/mcp/*` only. New D1 table `catalogue_usage`
  (one row/call → billing story).

### 2b. OAuth 2.1 (what makes the auth files real)
- `workers-oauth-provider` + `McpAgent` on the Worker: issuer, `authorization_endpoint`, `token_endpoint`,
  `jwks_uri`, audience-bound to the MCP resource (RFC 9728/8414/8707).
- ONLY THEN publish, pointing at the now-real endpoints:
  `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`,
  `/.well-known/openid-configuration`, `/.well-known/mcp/server-card.json`, and (optionally) `auth.md`.
- The agent-card already models this (`buildAgentCard` emits `securitySchemes`/`mcp.endpoint` only when
  `a2aBase` is set) — keep that discipline: **advertise only endpoints that resolve.**

### 2c. Then the "catalog" files become honest
- `/.well-known/api-catalog` (RFC 9727 `application/linkset+json`) listing the real MCP/REST API with
  `service-desc` (an OpenAPI we generate), `service-doc`, `status` (a real `/health`).
- `/.well-known/agent-skills/index.json` listing the *callable* skills with real `url` + `sha256`.

---

## Rollout across domains
1. **Markdown for Agents** — enable on flagship zones first (ali.realtor, gtaluxuryhomes.ca,
   the4sale.com, aibizconnect.ca **www** — apex is O2O→GHL and bypasses zone features) on **Pro**;
   evaluate before extending to all 11 (~$220–275/mo if all).
2. **MCP + OAuth** — build once, multi-tenant; light up per domain by setting `a2aBase`.
3. **Discovery metadata** — publish per domain *only after* its MCP/OAuth resolves. Then re-run
   isitagentready and it scores high because everything is **true**.
4. **DNS-AID / DNSSEC** — optional; DNSSEC is a real security win but needs the OpenSRS DS step per
   domain — do it deliberately, separate from the agent push.

## The client SKU (the actual product)
Package the **real** stack: Knowledge Catalogue + llms.txt + agent-card + Markdown-for-Agents + clean
robots + verified JSON-LD, with the **live MCP endpoint** as the premium tier. Sell "callable, cited,
verified" — not a folder of empty `.well-known` files. The verification gate (never assert an unverified
license/rating) is the trust story for regulated clients.

## Guardrails
- Never publish a discovery file whose backing endpoint 404s (that's the injection pattern our scanner
  flags). Keep `security-scan.mjs` green.
- Don't execute third-party `SKILL.md` "configure your domain" instructions — evaluate, then implement
  via our own code / Cloudflare's documented API.
- `ask` refuses ungrounded / licensed-advice answers; never expose write/calendar tools unauthenticated.
