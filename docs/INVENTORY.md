# AIBizConnect — Master Asset & Tool Inventory

> **Provisioning rule (read before buying/signing up for anything):**
> We already own the tools below. **Do NOT acquire a new service, SaaS, API, or
> subscription without first checking this list** for something that already
> covers the need. If a need isn't covered here, flag it explicitly before
> adding cost. Update this file whenever an account is added or dropped.
>
> _Last updated: 2026-07-09. Maintained by the team; loaded into every session via `CLAUDE.md`._

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
- **Resend** — transactional email from the app (`RESEND_API_KEY`, `docs/email-templates/`).
- **Gmail / Google Workspace** — connected (Zapier + MCP); owner mailboxes.
- **Mailchimp** — marketing email/campaigns (Zapier connected, MCP available).
- **Phone number:** **+1 365-363-7111** (Ontario, 365 area code) — designated LeadLoop / GHL business line.
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
Bitly · Canva · Gmail · Google Calendar · Google Drive · Granola · Mailchimp · Malwarebytes · Semrush · Send · Zapier · Zoom · GitHub. (Auth-pending: HeyGen, HyperFrames.)

---

## Notes
- **No secret values** are stored here — only service names and the env-var *names* that configure them. Keep it that way.
- When adding/removing a tool, update **§0 quick reference** and the relevant section, and bump the date.
- Overlap to resolve over time: **HubSpot vs BoldTrail vs GHL** (three CRMs) — consolidate to avoid paying for redundant CRMs.
