# AIBizConnect OS — Public Site Design Brief (for Claude Design)

This is the spec to **design from**. Design these pages in Claude Design; export each via
**Handoff → Send to local coding agent** into `design-handoffs/<slug>/`; I translate each to our **native
sections** and publish on the platform tenant. Pair this with `DESIGN.md` (the design system) which Claude
Design reads from the repo.

## Non-negotiables (so the output builds cleanly)
- **Brand:** use the AIBizConnect design system in `DESIGN.md` / `app/abc-design-system.css` — royal blue
  `#3D49C4`, navy ink `#090966`, accent `#555FC4`, **MontserratAlt1** display + **Montserrat** body, soft
  cool shadows, 10–20px radii, the brand gradient `linear-gradient(135deg,#2F399D,#555FC4)`.
- **Name it "AIBizConnect OS" universally.** Wordmark = "AIBizConnect" (MontserratAlt1) + app icon
  `/abc/app-icon.png`.
- **Compose from this section vocabulary only** (these map 1:1 to our native sections — anything else is
  hard to translate): `hero`, `feature grid` (icon + title + blurb cards), `stat bar` (number + label),
  `logo strip`, `testimonials` (quote + name + role), `pricing tiers`, `FAQ` (Q/A), `steps / how-it-works`
  (numbered), `CTA band`, `split` (copy + image), `contact form`, `footer`. Avoid bespoke one-off widgets.
- **Wiring (I handle, design for it):** every primary CTA → **Start free / sign up** (`/start`); contact
  forms → CRM; nav links → the pages below.
- **Responsive**, generous white space, conversion-focused. Light theme; use navy→blue gradient bands for
  emphasis (hero accents, CTA, "inside the platform").

## Global chrome (design once, applies to every page)
- **Header:** app icon + "AIBizConnect" wordmark · nav: Platform · Solutions ▾ · Pricing · Resources ▾ ·
  Company ▾ · **Log in** · **Start free** (primary). Sticky, light, subtle bottom hairline.
- **Footer:** 4 columns — Product (Platform, CRM, Websites & Funnels, AI Builder, Automations, Consumer
  Portal, Marketplace, Templates) · Solutions (Real Estate, Mortgage, Insurance, Legal, Coaching, Agencies)
  · Company (About, Partners, Careers, Blog, Guides, Webinars) · Legal (Privacy, Terms, Security). Wordmark
  + tagline "The AI Business OS for small business." + © AIBizConnect.

## Pages & section structure (parity with the live aibizconnect.app, on the new design)

### 1. Home `home` (priority 1 — design first)
1. **Hero** — headline "One platform to run your entire business — with AI", sub: AIBizConnect OS builds
   your site, fills your CRM, books your calendar, and markets for you. Primary CTA "Start free", secondary
   "Watch demo". Trust line ("14-day free trial · no credit card · plans from $39/mo").
2. **Dashboard preview** — a framed product screenshot/mock (navy→blue accent).
3. **AI concierge highlight** — split: "Your 24/7 AI assistant" + a chat/leads mock ("3 new leads qualified").
4. **Who it's for** — 6–7 industry cards (Real Estate, Mortgage, Insurance, Legal, Advisors, Coaches, Agencies).
5. **Why AIBizConnect OS** — 4 value props (one unified OS · AI does the work · live in minutes · team/agency ready).
6. **Inside the platform** — 6 module cards (Website Builder · CRM & Pipelines · Websites & Funnels ·
   AI Builder · Automations · Consumer Portal).
7. **Testimonials** — 3 quotes + logos.
8. **Pricing teaser** — 3 tiers summary → link to Pricing.
9. **How it works** — 3 steps (Sign up → AI builds your OS → Publish & grow).
10. **Final CTA band** — "Ready to run your business on AIBizConnect OS?" + Start free.
11. **Footer.**

### 2. Pricing `pricing` (priority 2)
Hero (short) · **pricing tiers** (Starter / Pro / Agency — features, "from $39/mo", 14-day trial) ·
feature-comparison table · FAQ · CTA band.

### 3. Platform overview `platform`
Hero · "Inside the platform" full module grid (8–9 modules, each: icon, name, 1–2 lines) · split sections
for the 2–3 hero modules · stat bar · testimonials · CTA.

### 4. Solutions hub `solutions` + per-industry pages
- Hub: hero + 6 industry cards linking to each.
- Each industry page (`solutions-real-estate`, `-mortgage`, `-insurance`, `-legal`, `-coaching`, `-agencies`):
  hero tailored to the vertical · 3–4 vertical-specific feature cards · how-it-works · testimonial · CTA.

### 5. Feature pages (one each, same shape: hero · feature grid · split demo · CTA)
`ai-builder` · `crm` · `websites-funnels` · `automations` · `consumer-portal` · `marketplace` · `templates`.

### 6. Company `about` + `contact`
- About: hero · mission · stat bar · (team optional) · CTA.
- Contact: hero · **contact form** (name/email/business/message) · alt contact methods.

### 7. Resources (lighter; design last) `blog` · `guides` · `webinars`
Hero + card list/grid layout (placeholder entries fine).

## Suggested order to send me
1) Home → 2) Pricing → 3) Platform → 4) Solutions hub + Real Estate → 5) the feature pages →
6) About/Contact → 7) remaining Solutions + Resources. One folder per page; reuse the slug to revise.
