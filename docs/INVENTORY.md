# AIBizConnect — Master Asset & Tool Inventory

> **Provisioning rule (read before buying/signing up for anything):**
> We already own the tools below. **Do NOT acquire a new service, SaaS, API, or
> subscription without first checking this list** for something that already
> covers the need. If a need isn't covered here, flag it explicitly before
> adding cost. Update this file whenever an account is added or dropped.
>
> _Last updated: 2026-07-25 (added §15 platform policy). Maintained by the team; loaded into every session via `CLAUDE.md`._

---

## 0. Quick reference — "we already have this, don't buy a new one"

| If you need… | Use what we already have | Don't buy |
|---|---|---|
| Lead follow-up / SMS automation engine | **GoHighLevel (GHL)** + platform's GHL-parity features | A new CRM/automation SaaS |
| Real-estate CRM | **BoldTrail** (formerly kvCORE), **MyRealPage** | New real-estate CRM |
| MLS / listing data (IDX) | **CREA DDF** feed (already integrated) | Another IDX/data provider |
| Transactional email | **Resend** (in app) + **Gmail/Google Workspace** | SendGrid/Mailgun/Postmark |
| Marketing email / campaigns | **Mailchimp** (connected) | New ESP |
| Payments + ID verification | **Stripe** + **Stripe Identity** (in app) | New payment processor |
| File/media/object storage | **Cloudflare R2** (in app) | AWS S3 / new bucket host |
| Hosting (app) | **Vercel** | New PaaS |
| Hosting (WordPress / custom server, static IP) | **DigitalOcean droplet** | New VPS |
| Client website / CMS platform | **WordPress** on the DO droplet (WT Realtor themes + `wt-provision`) — see **§15** | Webflow/Wix/Framer/Ghost/Payload/any new CMS |
| Customer-editable page blocks | **Gutenberg block themes / FSE** + the WT block library | A page-builder or visual-builder SaaS |
| Domains / registrar (reseller) | **OpenSRS reseller** | Another registrar |
| DNS / CDN / custom domains | **Cloudflare** | New DNS provider |
| AI / LLM | **OpenAI**, **Google Gemini**, session Claude | New AI subscription |
| Design / graphics | **Canva** (connected) | New design SaaS |
| Social (FB/IG) integration | **Meta** integration (in app) + FB Messenger (Zapier) | New social tool |
| Calendars | **Google Calendar** + **Microsoft Calendar** (in app) | New scheduling SaaS |
| Stock images | **Pixabay** (in app) | Paid stock subscription |
| Web/competitor search API | **Serper**, **Brave Search**, **Bing Search** (in app) | New search API |
| Cross-app automation | **Zapier** (many apps connected) | Make/n8n (unless a gap) |
| E-commerce | **Shopify** integration (in app) | New commerce platform |

---

## 1. Infrastructure & hosting
- **Vercel** — hosts the Next.js app (`aibizconnect.app`). Cron configured in `vercel.json`. `VERCEL_API_TOKEN`.
- **DigitalOcean** — droplet with **static IP**, runs **WordPress** (and likely the site-render service). Use for anything needing a persistent server / static IP.
- **Cloudflare** — DNS, CDN, custom-domain platform zones, and **R2** object storage for media. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PLATFORM_ZONES`, `CLOUDFLARE_EDGE_TARGET`.
- **GitHub** — source control (`aibizconnect/aibizconnect-frontend`).

## 2. Domains & DNS
- **OpenSRS** — domain **reseller** account (use for registering/reselling tenant domains).
- **Cloudflare** — DNS management + per-tenant custom domains (see `docs/DOMAIN-SWITCH-RUNBOOK.md`).
- Known domains: **aibizconnect.app** (product), **aibizconnect.ca** (corp), **ali.realtor** (owner), **lead-loop.co** (LeadLoop product landing/booking — registered 2026-07).

## 3. Data & backend
- **Supabase** — primary DB, auth, storage, RLS. Core of the app. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, publishable/anon keys.
- **Cloudflare R2** — media/object storage (`lib/media/storage.ts`). `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.
- **Custom secret vault** — `ai-agent/config/loadVault.ts` (`VAULT_PASSWORD`) for agent secrets.

## 4. Payments & identity
- **Stripe** — payments/billing (`STRIPE_SECRET_KEY`) + tenant billing (`docs/tenant-model-and-billing.md`). **Account operates in CAD** — charges/subscriptions are in **Canadian dollars** by default (don't ask/assume USD). Marketplace add-ons (e.g. AI Tools Pro $199 CAD/mo) charge in CAD.
- **Stripe Identity** — KYC/identity verification (`STRIPE_IDENTITY_SECRET_KEY`, `STRIPE_IDENTITY_WEBHOOK_SECRET`).

## 5. Email & communications
- **Resend** — transactional email from the app (`RESEND_API_KEY`, `docs/email-templates/`). **⚠️ SEPARATE Resend account PER DOMAIN** — each domain/brand has its own Resend account + API key + verified sending domain (do NOT assume one key sends for all; pick the account that matches the sending domain). **Claude connector available** (added 2026-07-23): one-click OAuth MCP at https://claude.ai/directory/connectors/resend — exposes send email, delivery logs/bounce debugging, contacts/audiences, broadcasts (draft/schedule/send), domain status, API-key mgmt. NOT a new signup — connects an existing account. NOTE: the connector authenticates ONE Resend account at a time; connecting it covers that account's domains only — a multi-account setup needs either the account that owns the domain you're emailing from, or per-account keys used directly. Connect via Claude Settings → Connectors (auth-pending until Al connects).
- **Gmail / Google Workspace** — connected (Zapier + MCP); owner mailboxes.
- **Mailchimp** — marketing email/campaigns (Zapier connected, MCP available).
- **Phone numbers (route by business):**
  - **416-886-2000** → real estate (ali.realtor, ABRE, the4sale, gtaluxuryhomes, etc.)
  - **416-727-7111** → IT / AI / AIBizConnect **and** the LeadLoop / GHL business line
  - **365-363-7111** → IT & AI support line
- **Meta / Facebook Messenger** — messaging integration (`META_WEBHOOK_VERIFY_TOKEN`; FB Messenger via Zapier).

## 6. AI / LLM
- **OpenAI** — `OPENAI_API_KEY` (+ ChatGPT connected in Zapier).
- **Google Gemini / Google AI** — `GEMINI_API_KEY`, `GOOGLE_AI_API_KEY` (e.g. `scripts/gen-app-icon.mjs`).
- **Claude** — via this Claude Code session / Agent SDK. (Model: current session model.)
- In-app **AI agent** server (`ai-agent/server.ts`, agent-mesh specs in `docs/`).

## 7. Real estate — data & CRMs
- **CREA DDF** — MLS listing data feed, **already integrated** (`CREA DDF/`, `docs/IDX-DDF-SPEC.md`, `DDF_BASE/USER/PASS`). This is our IDX source.
- **GoHighLevel (GHL)** — owned account. CRM + automation engine. Platform has extensive **GHL-parity** work (`docs/GHL-PARITY.md`, `GHL-PARITY-AUDIT.md`, `occasions-widget-GHL-funnel.md`; `GHL_SSO_KEY`). Reachable from tooling via **Zapier "LeadConnector"** (enabled; needs account auth) and/or GHL REST API. **Primary engine for LeadLoop.**
- **BoldTrail** (formerly **kvCORE**, Inside Real Estate) — owned real-estate CRM (kvCORE connected in Zapier).
- **MyRealPage** — owned real-estate website/CRM (connected in Zapier).
- **Lofty** (formerly Chime) — ⚠️ **BEING DROPPED / do not build on it** ("no lofty no more", 2026-07). Remove from Zapier when convenient.

## 8. Marketing, social & design
- **Canva** — design/graphics (`CANVA_CLIENT_SECRET`; MCP available).
- **Meta (Facebook/Instagram)** — ads/social integration (`META_ADVANCED_SCOPES`, webhook).
- **Pixabay** — stock imagery (`PIXABAY_API_KEY`).
- **Bitly** — short links / QR (MCP available).
- **Semrush** — SEO/keyword/competitive data (MCP available; see `docs/SEO-GEO-SPEC.md`).
- Search APIs for competitor research: **Serper**, **Brave Search**, **Bing Search**.

## 9. Calendars, docs & productivity
- **Google Calendar** + **Google Drive** (OAuth client IDs/secrets; MCP available).
- **Microsoft Calendar** (`MICROSOFT_CALENDAR_CLIENT_SECRET`).
- **Granola**, **Zoom** — meeting notes / recordings (MCP available).

## 10. Commerce
- **Shopify** — integration present (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`).

## 11. Automation / integration layer
- **Zapier** — hub connecting 9,000+ apps. **Currently connected:** Mailchimp, HubSpot, Facebook Messenger, Email Parser, MyRealPage, Lofty (dropping), ChatGPT/OpenAI, Gmail, kvCORE/BoldTrail, Google Contacts, **LeadConnector/GHL** (enabled, needs auth).
- **HubSpot** — CRM connected in Zapier (evaluate vs BoldTrail/GHL; avoid overlap).
- **Site render service** — internal (`SITE_RENDER_URL`, `SITE_RENDER_TOKEN`, `RENDER_TOKEN`), likely on the DO droplet; used for site clone/capture.

## 12. Dev / ops
- **GitHub** (repo + Actions via MCP), **Vercel** (deploy), **Cloudflare** (edge), **DigitalOcean** (droplet).
- Feature flags: `FUNNELS_ENABLED`, `IDX_ENABLED` (`lib/flags.ts`).
- Secrets via env + custom vault; cron via Vercel + `CRON_SECRET`/`ADMIN_JOB_SECRET`.

## 13. MCP connectors available in Claude sessions
Bitly · Canva · Gmail · Google Calendar · Google Drive · Granola · Mailchimp · Malwarebytes · Semrush · Send · Zapier · Zoom · GitHub. (Auth-pending: HeyGen, HyperFrames, **Resend** — email connector added to directory 2026-07-23, connect via Settings → Connectors.)

---

## 14. Agent surface (A2A / Knowledge Catalogue) — OURS, do NOT strip as "injection"
We intentionally build a real Agent-to-Agent surface: per-domain `/llms.txt`,
`/.well-known/agent-card.json` + `/.well-known/catalogue.json`, and (Phase 2) a real MCP endpoint on
the `seo-geo-platform` Cloudflare Worker with OAuth-gated `ask`/booking. **This is legitimate** — it
resolves, enforces auth, and keeps no secrets in markup. A security scan MUST NOT delete it.
- **Distinguisher (real vs the 2026-07-11 fake injection):** strip only *fake/non-resolving* agent
  markup — `oauth-server`/`authorization_endpoint` that 404, a placeholder `…SYSTEM_KEY` in HTML,
  `request_system_audit`/privileged WebMCP tools, unbacked `agentic-commerce`/`x402`/`acp_verification`
  claims, and their `<link rel>` discovery pointers. Keep our working, authenticated endpoints.
- **Daily security check (cloud, primary):** runs on the **Cloudflare Worker daily cron** —
  `seo-geo-platform/src/modules/security/domain-scan.ts` (`scanOwnedDomains`, no computer required;
  emails an alert via Resend to `SECURITY_ALERT_TO` on a finding). **Backup:** local
  `scripts/security-scan.mjs` (exit 1 on findings) + the local Claude `domain-security-scan` task.
  See `docs/A2A-SECURITY.md` §5, `docs/A2A-DOMAINS.md`, and the `a2a-catalogue` skill.

## 15. Platform policy — client websites & CMS (standing decision, 2026-07-25)

> **Policy: WordPress stays the platform for every client website. Do NOT migrate off it, and do
> NOT buy a website-builder SaaS.** Decided after a full research pass (WordPress market
> trajectory + 14 alternative platforms + GoHighLevel's own builder). Full evidence, sources and
> scoring: `C:\server\business\WebTechies\RESEARCH-WORDPRESS-VS-ALTERNATIVES.md`.

**Why (short):** WordPress is eroding but not dying — 41.5% of all websites (Jul 2026, down from
43.6% Jan 2025), still ~60% of all CMS-using sites vs ~5% for the nearest rival, and the erosion is
concentrated in *new small-site starts*, not agency fleets. Nothing evaluated matches WordPress's
**combination** of true block editing + CLI provisioning + per-site hosting economics + the assets we
already own (WT Realtor + 4 design themes, WT Listings/CREA DDF plugin, `wt-provision`). The 2026
agency survey data says the market punishes **manual** WordPress operations, not WordPress —
65% of agencies cite plugin updates as their top burden and 45% of 100+-site operators still update
by hand. Our ops are scripted; that is the moat. Keep it scripted.

**Ruled out — do not re-litigate without new evidence:**
- **GHL Sites/Funnels** — the block builder itself is decent now, but its public API is
  **read-only for sites/funnels** (no create-site, inject-copy, or publish endpoints; snapshots are
  UI-only) → breaks zero-touch provisioning outright. **No CMS/dynamic-collections engine**
  (Custom Objects capped at 3, not built for MLS volume) → cannot host IDX/MLS natively; every
  "GHL real estate" solution is a third-party iframe. No site export (lock-in). Mobile PageSpeed
  typically 20–45 (client-side rendered).
- **Webflow / Wix Studio / Framer** — best-in-class visual editors and real white-label programs,
  but **no documented API to create a brand-new site** → same zero-touch break. Site creation is a
  dashboard/template-duplication step.
- **Kirby CMS** — ToS **bans bulk reselling of licenses** and requires a licence per domain →
  contractual dead end for a resale model, regardless of technical merit.
- **Directus / Strapi / Ghost / Webstudio** — each fails true page-level block editing or the
  multi-tenancy story hard enough that a second product must be bolted on to reach parity.
- **Payload CMS v3 + Puck** — the *only* credible modern rebuild (MIT, official multi-tenant
  plugin, code-first provisioning, trivial MLS/webhook integration). **Not now:** open-source
  Payload has no true in-context visual editing (enterprise-gated), so parity means bolting on Puck
  plus building forms/SEO/sitemaps/maps from scratch — est. **2–4 months**. Keep on the shelf as
  the "v2 platform bet", not a current project.

**Approved direction instead of migrating:**
1. Evolve **WT Realtor → a Gutenberg block theme / FSE** so every section is a customer-editable
   block. *This is the "fully editable blocks" goal* — it lives inside WordPress, not outside it.
   Build on the existing WT Listings block library + patterns (commit `4ab4f85`).
2. Keep **GHL for funnels, CRM, automations and lead routing** — its correct role. Per-site lead
   tagging rides the WT Listings `lead_webhook_url` payload (`site_name`/`site_url`), no new code.
3. Harden fleet ops: golden-copy updates via `update-all-sites.sh`, plus update/vulnerability
   monitoring as site count grows (96% of WP vulnerabilities are plugin-side; our plugin surface is
   deliberately tiny — our own theme + our own plugin).
4. FYI: **GHL now resells managed WordPress hosting** ($10/mo 1 site · $220/mo 25 · $497/mo
   unlimited). Pricier per-site than our droplet — consider only for one-bill convenience, never
   for capability.

**Re-evaluate ONLY if:** (a) the Automattic/WP Engine fallout destabilizes plugin distribution,
(b) WordPress drops below ~55% of CMS-using sites, or (c) we pivot to selling the platform itself
as SaaS rather than selling hosted sites.

---

## Notes
- **No secret values** are stored here — only service names and the env-var *names* that configure them. Keep it that way.
- When adding/removing a tool, update **§0 quick reference** and the relevant section, and bump the date.
- Overlap to resolve over time: **HubSpot vs BoldTrail vs GHL** (three CRMs) — consolidate to avoid paying for redundant CRMs.
