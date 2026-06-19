Claude (Copilot) — milestone for the record (architect of record + doc manager). Big session.

## Shipped (all pushed to main, build green, deployed)
1. **aibizconnect.app fully rebuilt from Claude Design** — 23 routes on a shared `.abc-ds` shell, via the
   autonomous loop (design-build.mjs commands Claude Design in the browser → claude-design-capture.mjs pulls
   the rendered DOM → built native, templated by family: IndustryPage ×6, FeaturePage ×7). Home · Platform
   (now /product) · Pricing (5 tiers: Starter $39/Pro $89/Premium $399/Agency $699/Enterprise "Call us") ·
   Solutions hub + 6 industries · 7 feature pages · About · Contact (functional lead form → /api/leads/submit
   → CRM) · Resources + Blog/Guides/Webinars. Mobile hamburger menu. Design's real logo + app icon.
2. **WENT LIVE on aibizconnect.app** — manual cutover (no API tokens): Cloudflare apex A→76.76.21.21 +
   Vercel-managed www CNAME; Vercel Domains apex-primary, www→apex 308. Old Lovable "ABC SalesMaster" replaced.
   Reusable in-product domain-switch capability built (lib/server/vercel.ts, claimPlatformApex,
   scripts/domain-switch.mjs) — kept for TENANT custom domains (D-396 registrar-default flow).
3. **Route-collision fix**: marketing "Platform" had clobbered the /platform ADMIN console; restored admin at
   /platform, moved marketing to /product, repointed nav.
4. **SEO/GEO — GEO 49 → 87** (Ali confirmed): our site got Organization/WebSite/SoftwareApplication
   (+AggregateOffer $39–699, real testimonials as Review nodes, NO fabricated ratings) + FAQ/FAQPage +
   robots(AI-bots)+sitemap+llms.txt + OG + dateModified. AND every tenant site by default: tenant robots
   welcomes AI crawlers, new per-tenant llms.txt, middleware serves /robots.txt + /sitemap.xml + /llms.txt
   on the tenant domain. (Pipeline already had metadata + Organization/WebPage/FAQPage JSON-LD + sitemap.)
5. **Perf**: favicon 382KB→1.9KB, logos ~140KB→~6KB (sharp), trimmed fonts — ~646KB/page removed.

## Decisions to log (Gemini, this session)
- **D-397** — RATIFIED: SEO/GEO-optimized-by-default is a STANDING STANDARD (every site we build, ours +
  tenant). Document in TENANT-GENESIS-PROTOCOL.md.
- **D-398** — next GEO levers (to push past ~90): Service/Product schema per feature page, Speakable on
  About/FAQ/Resources, HowTo on "how it works", richer LocalBusiness (hours, priceRange, areaServed). Queued,
  not yet built.
- External (Ali, not code): Cloudflare Bot-Fight-Mode off, Google Business Profile, NAP consistency.

Please fold into the docs when convenient.
