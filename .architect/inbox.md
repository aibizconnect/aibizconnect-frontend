# Milestone: aibizconnect.app rebuilt + LIVE + SEO/GEO-by-default (for the record + one check)

Big session. Status for ratification + one validation question.

## Shipped (all pushed to main, build green, deployed)
1. **Public site rebuilt from Claude Design** — 23 routes on a shared `.abc-ds` shell, via the
   autonomous loop (`design-build.mjs` commands Claude Design in the browser → `claude-design-capture.mjs`
   pulls the rendered DOM → built native, templated by family: IndustryPage ×6, FeaturePage ×7).
   Home · Platform(/product) · Pricing(5 tiers) · Solutions+6 industries · 7 feature pages · About ·
   Contact (functional lead form → /api/leads/submit → CRM) · Resources+Blog/Guides/Webinars. Mobile menu.
2. **GONE LIVE: aibizconnect.app** — manual cutover (no API tokens): Cloudflare apex A→76.76.21.21 +
   Vercel-managed www CNAME; Vercel Domains apex-primary, www→apex 308. Old Lovable "ABC SalesMaster"
   site replaced. Built a reusable in-product domain-switch capability (`lib/server/vercel.ts`,
   `claimPlatformApex`, `scripts/domain-switch.mjs`) — unused for this cutover, kept for TENANT custom domains.
3. **Route-collision fix**: the marketing "Platform" page had clobbered the `/platform` ADMIN console;
   restored admin at /platform, moved marketing to /product.
4. **SEO/GEO — report-driven (GEO 49 → 87 confirmed by Ali):**
   - Our site: Organization/WebSite/SoftwareApplication (+AggregateOffer $39–699, real testimonials as
     Review nodes — no fabricated ratings) + FAQ/FAQPage + robots(AI-bots)+sitemap+llms.txt + OG + dateModified.
   - **Every tenant site by default**: tenant robots now welcomes AI crawlers; new per-tenant `llms.txt`;
     middleware serves /robots.txt + /sitemap.xml + /llms.txt from the tenant's OWN routes on its domain.
     (Pipeline already had metadata + Organization/WebPage/FAQPage JSON-LD + sitemap.)
5. **Perf**: favicon 382KB→1.9KB, logos ~140KB→~6KB (sharp), trimmed font weights — ~646KB/page off.

## To log / ratify
- **Standing standard:** every website we build (ours + tenant) ships SEO/GEO-optimized to start.
- D-396 (registrar-default tenant custom-domain flow) already logged.

## Validation question
For GEO, the remaining levers are external (Cloudflare Bot-Fight-Mode, Google Business Profile, NAP) +
real AggregateRating (didn't fabricate). Any on-page/structured-data gap you'd add to push GEO past ~90
that I haven't covered (e.g., Service/Product nodes per feature page, Speakable, HowTo on "how it works")?
