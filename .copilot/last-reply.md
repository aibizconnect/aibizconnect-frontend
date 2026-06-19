Ali — Claude — logged, ratified, and filed.  
This is the canonical architectural record for the Public‑Site Rebuild milestone and Gemini’s rulings.
Everything below is structured, durable, and ready to drop into the repo.

No decisions are pending — this is pure record‑keeping for the architect‑of‑record.

1. MILESTONE — Full Public‑Site Rebuild (Filed)

(All pushed to main, build green, deployed to aibizconnect.app)

The public site is now fully rebuilt from Claude Design, using the autonomous design→build pipeline and the .abc-ds design system.

1.1 Site Rebuild (23 routes)

Rebuilt via the autonomous loop:

design-build.mjs → commands Claude Design in browser

claude-design-capture.mjs → pulls rendered DOM (OOPIF CDP)

Native build → templated by family (IndustryPage ×6, FeaturePage ×7)

Pages delivered

Home

Platform → now /product

Pricing (5 tiers: Starter $39 / Pro $89 / Premium $399 / Agency $699 / Enterprise “Call us”)

Solutions hub

6 industries

7 feature pages

About

Contact (functional lead form → /api/leads/submit → CRM)

Resources hub

Blog / Guides / Webinars

Mobile hamburger menu

Real logo + app icon

This is the complete Claude‑Design parity rebuild.

1.2 Live Cutover

Performed manually (no API tokens):

Cloudflare apex → A 76.76.21.21

Vercel‑managed www CNAME

Vercel Domains: apex primary, www→apex 308

Old Lovable “ABC SalesMaster” removed

In‑product domain‑switch capability (lib/server/vercel.ts, claimPlatformApex, scripts/domain-switch.mjs) retained for tenant custom domains (D‑396 registrar‑default flow)

1.3 Route Collision Fix

Marketing “Platform” had overwritten /platform admin console

Restored admin at /platform

Marketing moved to /product

Nav repointed

1.4 SEO/GEO Upgrade — GEO 49 → 87

Ali confirmed the jump.

Structured data added

Organization

WebSite

SoftwareApplication

AggregateOffer ($39–699)

Real testimonials as Review nodes (no fabricated ratings)

FAQ / FAQPage

Robots (AI‑bots allowed)

Sitemap

llms.txt

OG

dateModified

Tenant sites

Every tenant site now gets:

robots.txt welcoming AI crawlers

per‑tenant llms.txt

middleware‑served robots/sitemap/llms

JSON‑LD pipeline already included Organization/WebPage/FAQPage + sitemap

1.5 Performance

Favicon: 382 KB → 1.9 KB

Logos: ~140 KB → ~6 KB (sharp)

Trimmed fonts

~646 KB/page removed

2. DECISIONS — Gemini Rulings (Filed)
D‑397 — SEO/GEO‑Optimized‑By‑Default = Standing Standard

Ratified.

Rule:

Every site we build — our own and every tenant site — must ship with:

robots.txt

sitemap.xml

llms.txt

JSON‑LD (Organization/WebSite/WebPage/FAQPage/SoftwareApplication/etc.)

OG tags

dateModified

AI‑crawler‑friendly posture

This is now part of the Tenant Genesis Protocol.

D‑398 — Next GEO Levers (Queued, not yet built)

Ratified.

Next structured‑data expansions:

Service/Product schema per feature page

Speakable on About / FAQ / Resources

HowTo on “How it works”

Richer LocalBusiness (hours, priceRange, areaServed)

External (Ali‑side):

Cloudflare Bot‑Fight‑Mode off

Google Business Profile

NAP consistency

These are queued for the next SEO/GEO pass.

3. DOC INSERTS (file‑ready)

Below are the exact inserts for each doc.

📄 Insert → docs/TENANT-GENESIS-PROTOCOL.md
Code
Copy
### D‑397 — SEO/GEO‑Optimized‑By‑Default (Standing Standard)
Every site we build — platform and tenant — must ship with:
- robots.txt (AI‑friendly)
- sitemap.xml
- llms.txt
- JSON‑LD (Organization, WebSite, WebPage, FAQPage, SoftwareApplication, AggregateOffer)
- OG tags
- dateModified

Tenant middleware must serve robots/sitemap/llms on the tenant domain.

📄 Insert → docs/AI-WEBSITE-BUILDER-NORTH-STAR.md
Code
Copy
### Public‑Site Rebuild (Claude Design Parity)
The entire aibizconnect.app public site is rebuilt from Claude Design via the autonomous design→build loop.
23 routes delivered on the `.abc-ds` shell. This establishes the public-facing showcase for the AI Business OS.

📄 Insert → docs/DESIGN-INTEGRATION.md
Code
Copy
### Full Public‑Site Rebuild (Claude Design → Native)
All public pages (23 routes) rebuilt from Claude Design using:
- design-build.mjs (commands Claude Design)
- claude-design-capture.mjs (captures rendered DOM via OOPIF CDP)
- Native build using IndustryPage/FeaturePage families

Guardrail:
- Visual diff vs Claude Design
- Ali confirmation
- Inspector QA

4. Everything is now logged, ratified, and filed.

If you want, I can also generate:

The SEO/GEO Playbook

The Claude‑Design → Native mapping guide

The public‑site rebuild manifest

The structured‑data expansion plan

Just say the word.

Edit in a page