# GEO / AI-visibility growth plan — how the sites actually attract AI users (2026-07-13)

Reviewed + agreed by the architecture and SEO/GEO specialists. The robots.txt / JSON-LD / llms.txt /
A2A layer is the **necessary gate, not the growth driver**. AI assistants cite pages that (a) answer a
question in extractable prose and (b) come from an entity they already trust because they see
consistent corroboration across the open web. So effort must go where the leverage is.

## Priority order (highest leverage first)

### 0. Finish removing the deceptive surface  *(in progress — caps everything else)*
Retire `robots-txt-manager`; deploy the clean always-200 robots.txt (done, pending `wrangler deploy`).
Deceptive/cloaked signals (fake OAuth, unbacked commerce, fabricated ratings) invite manual actions
and destroy the entity trust GEO depends on. Never re-introduce any of it.

### 1. Entity / NAP consistency + Google Business Profile + directories  *(the trust substrate)*
- One **canonical NAP string** (name, address, phone) used *identically* everywhere — site footers,
  JSON-LD, GBP, directories, social. Inconsistency splits the entity.
- Claim + fully optimize **Google Business Profile** for the realtor entity (categories, services,
  hours, photos, posts, Q&A, reviews). GBP is a primary source these models lean on for local.
- Get listed in reputable directories (RECO/CREA, brokerage profile, LinkedIn, realtor directories).
- Add `sameAs` links (GBP, LinkedIn, brokerage, RECO/CREA) to the `RealEstateAgent`/`Organization`
  JSON-LD, and add a `Person` node (Ali) linked to the Organization — `sameAs` is the single most
  useful field for entity consolidation.

### 2. Multi-domain strategy — pick ONE canonical hub  *(avoid entity dilution)*
Three realtor sites with overlapping listings dilute authority and risk duplicate-content suppression.
- Give each a **distinct focus** and distinct canonicals: `ali.realtor` = first-time/affordable buyers,
  `the4sale.com` = commercial/investment, `gtaluxuryhomes.ca` = luxury.
- Designate one **authoritative brand hub** with strong internal linking + consistent `Organization`;
  the others cross-reference it rather than duplicating listing inventory.

### 3. Answer-shaped, dated local content  *(the actual thing that gets cited)*
Ship 5–10 pages per brand that no aggregator (Zillow/Realtor.com/HouseSigma) bothers to write:
- Transparent **pricing / cost** ("closing costs for a first-time buyer in <city>", commission Q&A).
- Thorough **FAQs** (one question per section, the answer in the first sentence).
- **Neighbourhood guides** with dated price trends, schools, commute specifics.
- **Comparison / decision content** — "<City A> vs <City B> for families", "realtor vs selling
  privately", "the4sale.com vs <portal>". Comparison/listicle formats are disproportionately quoted.
- Format for **extractability**: short question-headed sections, direct first-sentence answers, tables
  for pricing/stats, visible "last updated" date. Real-estate answers are time-sensitive — freshness
  matters.
- **Server-render the answer content.** If FAQs/listings render only via client-side JS, several AI
  crawlers won't see them. (Ties into Core Web Vitals.)

### 4. JSON-LD enrichment  *(cheap once content exists)*
`RealEstateAgent`/`Organization` + `LocalBusiness` + `Service` + `FAQPage` + `Offer`/`OfferCatalog` +
`BreadcrumbList` + `Person`. **`AggregateRating`/`Review` must reflect real, verifiable reviews on your
own pages — never fabricated** (that's the deceptive-signal problem again). Add `sameAs` (see #1).

### 5. Off-site "be the cited source"  *(compounding authority)*
Digital PR / original data other sites link to and models ingest: local price reports, neighbourhood
indices, market stats. Third-party citations matter more than anything self-declared.

### 6. Plumbing (necessary gate, low ongoing effort)
- **robots.txt** welcoming AI crawlers — done (single correct `*` group; served at the edge for the
  MyRealPage zones, at origin for WordPress/Next).
- **llms.txt** — ship a curated index and forget it. No major AI crawler has confirmed consuming it;
  don't let it displace effort on 1–3.
- **A2A surface** (agent-card + catalogue.json + later a *secured* MCP) — honest + forward-looking
  optionality, not a near-term traffic driver. Defer the OAuth-gated MCP until there's a real consumer,
  and only advertise endpoints that actually resolve.

## Measurement
Use `rank.aibizconnect.ca` (the seo-geo-platform AI-Visibility scorer) to baseline now and track lift:
ask ChatGPT/Gemini/Perplexity/Claude the target questions ("who is a good first-time-buyer realtor in
<area>", "commercial real estate agent in <area>") and track mentions/citations/position over time.

## What NOT to do
Fake/borrowed reviews or inflated ratings; over-investing in llms.txt/MCP as if they drive traffic
today; per-bot robots groups (inheritance bug); client-only-rendered answer content; duplicated
listing content across the three domains without distinct canonicals.
