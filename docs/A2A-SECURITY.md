# Secured A2A / Knowledge Catalogue — design & security review (2026-07-11)

Triggered by a security flag: a live site (`aibizconnect.ca`) had a large "agentic web" block
injected into its head — fake OAuth endpoints, a placeholder `…SYSTEM_KEY`, fake x402/agentic-
commerce claims, and a `request_system_audit` WebMCP tool. This doc is the researched, secure way
to do the Knowledge Catalogue + Agent-to-Agent (A2A) service **for real**, and the fixes applied.

## 1. Standards: adopt / drop (for an SMB, honest implementation)

| Standard | Verdict | Secure rule |
|---|---|---|
| **A2A Agent Card** (`/.well-known/agent-card.json`) | **ADOPT** | Advertise only skills you actually serve; declare auth in `securitySchemes` and **enforce it at the endpoint** (the card guarantees nothing on its own). |
| **llms.txt** | adopt-with-care | Cheap curated index; Google ignores it; **never** put secrets or model-instructions in it (it's public, untrusted input to readers). |
| **WebMCP** (`navigator.modelContext` / `registerTool`) | adopt-with-care; **drop the audit tool** | Only read-only, origin-scoped (`exposedTo`), consent-gated tools; never a privileged "system audit" tool (prompt-injection + tool-overwrite hazard). Chrome 146, still moving. |
| **x402 / ACP / AP2** (agentic commerce) | **DROP** | No settlement backend → advertising `agent_discount_allowed`/`acp_verification` is a false capability **and a consumer-protection liability**. Only via Stripe if we ever run real agentic checkout. |
| **Web Bot Auth** (RFC 9421 signatures) | adopt-with-care | Agents sign requests with **Ed25519**; site publishes only the **public JWKS** at `/.well-known/http-message-signatures-directory`. **Never a static key in HTML.** Verify via Cloudflare Verified Bots. |

**Why the injected block is a liability:** every element is a claim with no backing mechanism —
fake OAuth endpoints that 404, a credential-looking placeholder key, a fake "audit" tool agents
could be social-engineered into calling, and commercial claims we don't honor. It invites
spoofing, prompt-injection, and deceptive-advertising exposure, and adds zero legit SEO/GEO value.
**Remove it entirely** and let the real surface below do the job.

## 2. Secure architecture — four auth tiers

| Tier | Endpoints | Requirement |
|---|---|---|
| **T0 public read** | `llms.txt`, `/.well-known/agent-card.json`, `/.well-known/catalogue.json`, tools `get_profile` / `search_services` / `get_pricing` | No auth. Edge-cached. CORS `*` OK (no credentials). Loose per-IP rate-limit + WAF. Optionally *verify* Web Bot Auth and record the operator. |
| **T1 costly** | LLM `ask` | Audience-bound **OAuth 2.1 bearer** OR verified **Web Bot Auth** from an allowlisted operator. Turnstile fallback for browsers. **Durable-Object** per-subject budget cap. Reflected-origin CORS only. |
| **T2 sensitive/side-effect** | `check_availability`, any booking/write | Full OAuth 2.1 with **user consent** + **scoped** short-lived tokens (`availability:read`, `booking:write`), audience = that tenant's MCP resource URI. Never `schemes:["none"]`. |
| **Control plane** | `PUT /api/a2a/publish`, `DELETE /api/a2a/:host` | **True master key only** (not `is_admin` tenant keys), host-ownership check, size cap, audit log, admin hostname only. |

**MCP auth (spec `2025-11-25`, OAuth 2.1 profile):** the MCP server is an OAuth **Resource
Server** — validate every `Authorization: Bearer` (never in query string), enforce **audience
binding** (RFC 8707), serve **Protected-Resource-Metadata** (RFC 9728) at
`/.well-known/oauth-protected-resource/mcp/<tenant>`, return `401 + WWW-Authenticate` on missing
tokens, PKCE `S256`. On Cloudflare: wrap the Worker in **`workers-oauth-provider`** + serve the
transport via **`McpAgent`** (Agents SDK); delegate identity to **Cloudflare Access** (we own it)
for human-driven agents and client-credentials for machine agents. Don't hand-roll token crypto.

**Secrets:** always `wrangler secret` / Workers Secret Store — **never in page markup** (the exact
mistake in the injected block).

## 3. Security gaps found in OUR build — status

| Sev | Gap | Status |
|---|---|---|
| **CRITICAL** | `/api/a2a/publish` gated by `isMaster`, which is true for any `is_admin` **tenant** key → a tenant could overwrite **any** domain's catalogue (authoritative fake data to AIs) | ✅ **FIXED** — now requires the true master key (`clientId==='master'`); added host-shape validation, 256 KB size cap, audit log (`src/routes/a2a.ts`) |
| HIGH | `ask` advertised with `authentication:{schemes:["none"]}` → open, cost-bearing LLM endpoint | ✅ **FIXED** in the card (ask/check_availability now OAuth-gated, only advertised when active) — endpoint enforcement lands with the T1/T2 build |
| MEDIUM | Stale/flat agent-card auth model | ✅ **FIXED** — per-skill `security` + `securitySchemes`(oauth2 + PRM) when active (`agent-card.ts`, `render.ts`) |
| MEDIUM | Worker trusted publish body blindly | ✅ partially — host + size validation added; full edge zod re-validation = TODO |
| HIGH | Single static `MASTER_API_KEY`, non-constant-time compare (shared `middleware/auth.ts`) | ⏳ **TODO** — rotate to per-caller/signed credential + constant-time compare; flagged (shared auth, change with care) |
| MEDIUM | CORS `*` helper could leak to token routes | ⏳ ensure T1/T2 use a reflected-origin helper, never `*`+credentials |
| LOW | No rate limiting; www/apex fallback trust boundary | ⏳ add native rate-limit binding + DO budgets; treat apex/www as one owned pair |

## 4. Action plan

1. **Strip the injected block** from live sites:
   - `aibizconnect.ca` — ✅ **DONE 2026-07-11** (via GHL → Site Settings → Head Tracking Code).
     Removed 8 `<script>` blocks (mcp-card, webbotauth, api-catalog, oauth-server, oauth-resource,
     agent-skills, agentic-commerce, webmcp-inline) **and** 5 injected `<link>` discovery tags
     (api-catalog / indieauth-metadata / service-desc / service / author → `#anchor`s). Kept
     occasions-widget, GTM, `LocalBusiness`, `FAQPage`, `rel="sitemap"`. Live-verified: 0 markers.
     Site was built in **GoHighLevel** (not ludicrous.cloud). The injection was self-referential
     (all endpoints at aibizconnect.ca, no external exfiltration), no attribution/comments — reads
     as an AI/tool-generated "agent-ready" template, not an external attacker.
   - ⏳ `webmcp` script on `ali.realtor` / `the4sale.com` / `gtaluxuryhomes.ca` (**MyRealPage** —
     separate admin; needs a login to that platform).
2. **Apply the code fixes above** (done: publish authz, card auth; TODO: master-key rotation,
   edge zod, rate limits) before deploying the active surface.
3. **Deploy the secure surface:** T0 passive (already built) via edge routes; then T1/T2 via
   `workers-oauth-provider` + `McpAgent` + Web Bot Auth verification + rate limiting.
4. **Drop** x402/ACP/commerce and the WebMCP audit tool entirely.
5. If the injection wasn't ours, **review edit access + rotate credentials** on affected sites.

## 5. Ongoing monitoring — daily domain scan

A daily scan sweeps all 11 owned domains for the injection signatures above (fake OAuth endpoints,
placeholder `…SYSTEM_KEY`, `request_system_audit`/WebMCP tools, `agentic-commerce`/`x402`, fake
api-catalog/mcp-card/agent-skills blocks) plus contact-email leaks (`info@ali.realtor` on non-realtor
domains). It flags FAKE/non-resolving markup only and must never remove our legitimate, resolving,
authenticated A2A surface (see INVENTORY §14).

- **PRIMARY — cloud (2026-07-14):** runs on the Cloudflare Worker daily cron (`0 6 * * *`),
  `seo-geo-platform/src/modules/security/domain-scan.ts` → `scanOwnedDomains(env)` (called from
  `src/workers/cron-handler.ts`). **No computer required.** On a real finding it emails an alert via
  Resend to `SECURITY_ALERT_TO` (wrangler var; default `admin@aibizconnect.ca`). Fetch errors alone
  do not alert. Activate/refresh by redeploying the Worker (`npx wrangler deploy`).
- **BACKUP — local:** `aibizconnect-frontend/scripts/security-scan.mjs` (standalone Node, exit 1 on
  findings) + local Claude scheduled task `domain-security-scan` (daily 7 AM). Machine-dependent;
  runs only while the Claude app is open — kept as a secondary check, not the system of record.

## Sources
MCP auth spec 2025-11-25; RFC 9728 / 8414 / 8707; OAuth 2.1 draft; Cloudflare Agents MCP
authorization + `workers-oauth-provider` + Web Bot Auth (RFC 9421) + Workers rate-limit binding;
A2A AgentCard spec; Chrome WebMCP security guidance; Coinbase/OpenAI/Google agentic-commerce docs.
(Full URLs in the session research notes.)
