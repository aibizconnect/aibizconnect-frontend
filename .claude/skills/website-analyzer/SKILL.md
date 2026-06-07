---
name: website-analyzer
description: >
  Analyze any existing website (or a tenant's current site) and produce a structured profile:
  business identity, services, audience, brand (colors/fonts/logo), social links, location, page
  structure/sitemap, content sections in order, and SEO signals. Use when the user says "analyze
  this site", "what does this website have", "audit my site's structure", or before importing/cloning
  a site into AIBizConnect. Read-only — never modifies anything.
---

# Website Analyzer

Turn a URL into a faithful, structured understanding of a website. This is the reusable analysis
pass that powers the AIBizConnect onboarding wizard (Step 0 "Analyze") and the Smart-rebuild importer.

## When to use
- "Analyze https://example.com" / "what's on this site" / "audit my structure".
- Before cloning/importing a site, to report what will be captured.
- To pre-fill a business profile (industry, services, audience, brand, location).

## How to run it

Prefer the app's own server modules — they are battle-tested and consistent with what the builder uses:

1. **Business profile + brand + socials + location** — `enrichFromPresence(tenantId, { websiteUrl })`
   in `app/tenants/[tenantId]/website/wizard-actions.ts`. Returns: businessName, description, industry,
   services, audience, socialLinks (from the site's own HTML), logoUrl, primaryColor, tone, country,
   city. (Uses a real browser User-Agent so WAF-protected sites still read.)
2. **Sitemap / all pages** — `discoverSitemapUrls(baseUrl)` + `pickUrlForType(...)` in
   `lib/sites/site-clone.ts` (reads sitemap.xml / sitemap_index, falls back to homepage links).
3. **Ordered content (elements in document order)** — `htmlToSections(html, baseUrl)` in
   `lib/sites/html-importer.ts`: every heading/paragraph/image/button/list/quote/divider/video/form,
   in order, mapped to our editable block types.
4. **Page-level content + intent** — `extractPageContent(html, baseUrl)` in `lib/sites/page-generate.ts`
   (headline, sections, CTAs, images, OG metadata, inferred page_intent).

If you are NOT inside the app runtime (e.g. a plain conversation), fetch with WebFetch using a real
browser User-Agent and apply the same extraction logic conceptually.

## Hard rules
- **Read-only.** No writes, no AI spend on images, no posting.
- **Owner's own site only** for socials — never a web search.
- **No fabricated facts.** Report only what the page actually contains; mark unknowns as unknown.
- Strip site chrome (header/nav/footer) when reporting body content — those are global, not page content.

## Output format

```
## Website Analysis: <url>

### Identity
- Business: <name> · Industry: <industry> · Location: <city, country>
- One-liner: <what they do>

### Brand
- Primary color: <hex> · Logo: <found/none> · Tone: <tone> · Fonts: <if detectable>

### Social profiles (from their site)
- <list, or "none found on site">

### Sitemap (<n> pages)
- <ordered list of discovered pages>

### Home page structure (in order)
1. <block type> — <short summary>
2. ...

### SEO signals
- Title, meta description, OG image, headings outline, structured data present?

### Recommendation
- Import mode: Smart rebuild (editable) vs Exact copy (snapshot) — and why.
- Gaps / opportunities (missing pages, weak CTAs, no contact form, etc.).
```

Keep it tight and factual. End with the single most useful next action.
