# SEO / GEO Spec — Website Pipeline (D-374)

**Goal:** every site our pipeline generates clears — or beats — the **live `ali.realtor`** SEO/GEO bar *automatically*, with zero manual SEO work by the agent.

## The bar to beat (measured live, 2026-06-16, via curl — browser can't resolve the custom domain)

`ali.realtor` (live) ships:
- Templated keyword title + 155–160c meta description; **self-canonical**; viewport; **Open Graph ×11 + Twitter ×4**.
- **5 JSON-LD blocks:** `RealEstateAgent`, `Organization`, `AggregateRating`+`Review`+`Rating` (★ results), **`FAQPage`**, **`AdministrativeArea` ×5** (service-area cities), `WebSite`/`WebPage`.
- **Sitemap *index*** → `page-sitemap.xml` + `blog-sitemap.xml` + **`listings-sitemap.xml`** (every listing = indexable URL).
- **`/llms.txt`** — structured brand summary + key links for AI engines.
- **Advanced `robots.txt`:** `Content-Signal: ai-train=no, search=yes, ai-input=yes`; explicit `Allow` for GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, ClaudeBot/Claude-SearchBot/Claude-User; `Allow /properties/ /neighborhoods/ /blog/`; `Disallow` admin/api + `?sort=`/`?view=`/`?login=` param URLs; `Sitemap:` declared.
- (NOTE: the de-indexed staging mirror `*.myrealpagewebsite.com` is `Disallow: /` + `noindex` — they keep the preview OUT of the index to avoid cannibalizing the live domain. We must do the same.)

## The 6 pillars (each auto-generated, per site)

### 1. Per-page `<head>` metadata
- **Title:** `{PageKeyword} | {AgentName} | {Brokerage}` (home), `{Listing addr / Community} | {Brokerage}` (inner). ≤60c.
- **Description:** templated location × intent × agent, 150–160c.
- `link rel=canonical` → the **live custom domain** (never the preview host).
- `meta viewport`; full Open Graph (`og:title/description/type/url/image` from page hero or listing cover) + `twitter:card=summary_large_image`.
- **Where:** public render head — `app/sites/[tenantId]/[slug]/page.tsx` `generateMetadata()` + custom-domain root.

### 2. JSON-LD structured data  *(extend existing `lib/seo/structured-data.ts`)*
- **Home:** `RealEstateAgent` + `Organization` (name, logo, phones, `address`/`PostalAddress`, `areaServed` → `AdministrativeArea[]` from the tenant's cities), `WebSite` (+ `SearchAction`).
- **Listing detail:** `RealEstateListing` / `Residence` (price, address, geo, beds/baths, photos, availability).
- **Communities page:** `AdministrativeArea` + `BreadcrumbList`.
- **FAQ section:** `FAQPage` → `Question`/`Answer`.
- **Reviews:** `AggregateRating` + `Review` from the Reputation module when present.

### 3. `/llms.txt` (GEO)
- Per-site route generating the markdown spec: `# {Agent} — {Brokerage}` → one-line positioning → `## About / ## Listings / ## Communities / ## Contact` with links to the live pages. Source: tenant brand + published pages + listing summary.

### 4. Sitemaps
- `sitemap.xml` = **index** → `page-sitemap.xml` (published pages) + `blog-sitemap.xml` + **`listings-sitemap.xml`** (every active listing + every community/neighbourhood landing page). `lastmod` from record timestamps.

### 5. `robots.txt` (per site, AI-forward)
- `Content-Signal: ai-train=no, search=yes, ai-input=yes`.
- Explicit `Allow` block for GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended, ClaudeBot, Claude-SearchBot, Claude-User.
- `Allow` the money paths; `Disallow` admin/api + sort/view/login param URLs; `Sitemap:` line.
- **Preview/staging domains → `Disallow: /` + `noindex` + canonical to the live domain** (anti-cannibalization).

### 6. Indexable content pages (the traffic engine)
- **Listing detail** pages (stable URL per listing) with unique copy + schema.
- **Community / neighbourhood** landing pages (`/neighborhoods/{city}/{hood}`) — the 6-cities × neighbourhoods structure — each a real, indexable, keyword-targeted page (the myRealPage long-tail play).

## Where we BEAT them
- Per-listing `RealEstateListing` richness (they thin it out), faster Core Web Vitals (R2 + WebP already), deeper programmatic neighbourhood content, and **we score every site with our own SEO-GEO analyzer** (target: > ali.realtor) before publish.

## Acceptance
A freshly generated site scores ≥ the live myRealPage site in our `/tools/seo-geo-analyzer.html`, with: llms.txt 200, sitemap index + listings-sitemap present, ≥4 schema types on home, OG+Twitter present, AI-bot-friendly robots, preview de-indexed.

_Peer-review: log to Gemini → Copilot before the implementation pass (standing protocol)._
