SEED HANDOVER — adopt the following as the CANONICAL design. This is the complete plan from the previous architect (Microsoft Copilot), agreed with Ali. Absorb it fully. Reply with a SHORT confirmation only (a few bullet points proving you captured it) — do NOT regenerate it. On my next message I will ask you to produce the DATA MODEL + JSON contract that implements it.

=== AI-FIRST, SUPERVISOR-VERIFIED WEBSITE-CREATION FLOW ===

PRINCIPLE: AI first, human confirms. The tenant gives ONE input; AI does ~90% of the work; the tenant only reviews/confirms.

STEP 0 — Tenant enters ONE thing: their website OR a social link (Instagram/Facebook/LinkedIn/TikTok/Google Business). Clicks "Analyze My Business."
  Supervisor: URL resolves (200/301/302), not a login/empty page; has title + meta desc + >=1 H1/H2 + >=1 paragraph; safe content. Fail -> ask for another link or manual intake.

STEP 1 — AI BUSINESS ANALYSIS (automatic). Extract: business name, industry, services/products, pricing hints, tone, brand colors, typography, layout patterns, images (hero/gallery/team/products), CTAs, contact, location, hours, social links, reviews. From socials: bio, highlights, post themes, brand personality, audience, visual identity. Infer business model (local service / e-commerce / coaching / agency / restaurant / real estate / medical / fitness / SaaS / trades / education) and growth intent (primary goal, sales cycle, funnel type, best CTA, best page structure).
  Supervisor: >=80% fields filled; business name not "Unknown"; valid industry; >=1 service detected; extracted name vs page title; colors = real hex from site; hero >=1200px wide, not a logo/thumbnail; tone matches writing style. Fail -> re-analyze.

STEP 2 — AI PRE-FILLS THE ENTIRE WIZARD (Business Basics, Existing Presence, Design, Growth Setup) — nothing empty, everything editable.
  Supervisor: no empty fields; human-readable (no raw HTML/broken/repeated text); colors+fonts match extracted; industry matches services; CTA matches business model; location matches contact. Fail -> refine.

STEP 3 — Tenant CONFIRMS the AI intake (approve/edit/remove/add).
  Supervisor: concise, no jargon, no AI artifacts; all fields editable except subdomain; summary matches extracted data. Fail -> regenerate summary.

STEP 4 — Subdomain selection: AI suggests 3, tenant picks, backend checks availability, reserve (NO DNS yet).
  Supervisor: naming quality (no numbers unless in name, no needless hyphens, no generic "business123"); availability queried + collisions handled + lowercased; websites.subdomain set; status stays draft. Fail -> retry.

STEP 5 — AI generates the BUSINESS SHELL (not just pages): Pages = Home, Contact, Offer/Services (lean start). Funnels = lead capture + thank-you page + CRM mapping + follow-up sequence stub. CRM = pipeline, contact fields, tags, source tracking. Brand = colors/fonts/spacing/hero/gallery. Media = reused images (+ AI images if allowed). All in DRAFT.
  Supervisor: each page has hero + CTA + clear sections + real content (no placeholders); colors/fonts match brand row; images match extracted/AI set; lead form creates a contact -> pipeline stage "New Lead"; UTM/source stored; funnel = Form -> Thank-you -> CRM -> Follow-up; NO hallucinations (no fake awards/testimonials/pricing). Fail -> regenerate the component.

STEP 6 — Editor opens business-ready: Pages, CRM, Forms, Automations, Brand, Media, Navigation, SEO, Schema, Pixel injection — all website-scoped.
  Supervisor: no missing blocks/broken images/null brand fields; ALL brand saves use websiteId; all settings website-scoped; status stays draft; no DNS yet. Fail -> fix scoping/reload.

STEP 7 — Publish -> Cloudflare DNS (only on Publish): create CNAME, mark website live, activate tracking, activate follow-up sequences (only if toggled).
  Supervisor: CNAME points to edge, no A records, no duplicates; status=live; public URL resolves; pixel injected + lead events firing; sequences inactive unless explicitly toggled. Fail -> rollback/retry DNS.

=== MAIN-PAGE CLASSIFICATION (learn-from-existing-site) ===
COUNT ONLY human-facing business pages: Home, About, Services/Products overview, Pricing, Portfolio/Gallery, Testimonials, Team, FAQ, Blog INDEX, Contact, Booking/Quote, Locations (if multi-location).
IGNORE: product pages, category pages, collections, filters, search, cart, checkout, account/login, wishlist, real-estate/MLS/IDX listings, map/saved searches, individual blog posts, tag pages, pagination, 404, privacy, terms, cookie, sitemap.xml, RSS, UTM variants, tracking redirects, AMP.
Verify a counted page: appears in header/footer nav OR linked from homepage; has hero + >=2 meaningful sections + >=1 CTA; URL not /product(s)//listing//collections//blog/<slug>//category//tag//cart//checkout//account//search; dedupe (/about == /about-us); count language variants once. Output: { "main_pages": [{title,url}...], "count": N }.

=== PAGE EXTRACTION (per main page) ===
Extract: hero, headline, subheadline, sections, CTAs, images, layout pattern, value propositions, service descriptions, social proof, contact info, metadata (title/description/schema/OG), and page intent (informational / conversion / trust-building / SEO / funnel step).
Verify: no empty fields, no hallucinated content, extracted text matches page, images real (not logos/icons), intent logical.

=== BLOCK RECONSTRUCTION ===
Convert each page into atomic blocks: hero_block, feature_block, service_block, testimonial_block, gallery_block, cta_block, faq_block, contact_block. Store in website_page_blocks (+ website_global_blocks if reusable; style in website_brand_settings). Blocks follow the AIBizConnect design system.
Verify: blocks follow design system, no broken HTML, no missing images, no duplicates, no irrelevant content.

=== IMPROVED PAGE TREE ===
Using extracted pages + business model + industry + best practices, propose a SUPERIOR architecture: include funnel pages, SEO pages, landing pages, thank-you pages, service-detail pages. e.g. Home/About/Services/Service-Detail/Pricing/Testimonials/Portfolio/FAQ/Blog/Contact/Lead-Magnet/Thank-You/Ad-Landing.
Verify: matches business model, no unnecessary or missing critical pages, funnel + SEO + industry pages included.

=== OLD -> NEW MAPPING ===
For each new page: reuse extracted blocks, enhance, rewrite copy, improve layout, add missing sections, align tone, conversion-optimize. Verify: no hallucinations/fake claims/fake testimonials/broken images/tone mismatch/missing CTAs/SEO issues.

=== STORAGE / SCOPING ===
Store improved page tree + extracted blocks + repurposed content under the correct websiteId across: websites.wizard, website_page_blocks, website_brand_settings, website_media, website_crm. Add wizard.version. AI-generation gating: if use_AI_to_bootstrap_site=false -> only Home+Contact, no AI calls, show editor banner. Verify: all under correct websiteId, no tenant-wide bleed, no missing fields, valid JSON.

=== METERING NOTES (already shipped) ===
ai_usage_events exists (migration 0027). Before billing, add fields: usage_type (enum: image_generation/text_generation/site_analysis/page_generation/ai_rewrite/ai_extract/ai_vision), source (wizard/editor/media_library/system_job/admin_panel), context (jsonb: pageId/websiteId/presetId/imageCount/model/duration/tokens), billing_status (unbilled/billed/free_tier/refunded/comped, default unbilled). Future: free_quota_remaining per tenant; ai_plan_limits table.

=== COMMS NOTE ===
There is no live MCP bus. You (architect) and the Builder communicate via this local API relay; outputs must be implementation-ready (SQL + JSON), scoped by (tenant_id, website_id), drafts-only.
