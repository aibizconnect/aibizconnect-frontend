# AIBizConnect · ABC SalesMaster — Design System

The brand & UI system for **ABC SalesMaster**, the all-in-one CRM, marketing automation,
website builder, and analytics platform by **AIBizConnect** — built for solo professionals
and small teams (law firms, insurance agencies, investment advisors, real estate).

> **Tagline in use:** "Run your whole business from one platform."

---

## Sources provided
- **Reference site:** https://aibizconnect.app — *ABC SalesMaster* ("All-in-one CRM,
  marketing automation, website builder, and analytics platform for law firms, insurance
  agencies, investment advisors, and real estate professionals"). The live site is a
  client-rendered app, so this system was designed from the brand assets + product description
  rather than scraped markup. **If you have deeper product access (Figma, codebase, more copy),
  share it and this system can be tightened to match exact screens.**
- **Brand assets (uploaded):** app icon (play-button mark), the "AIBIZCONNECT" wordmark
  (blue-on-transparent and white), and `MontserratAlt1-SemiBold.woff2`.
- Audience: small business owners & self-employed professionals. Tone: modern & energetic startup.

---

## CONTENT FUNDAMENTALS — how we write

**Voice:** confident, plain-spoken, and outcome-focused. We talk like a sharp peer who
respects the reader's time, not a corporation. Energetic but never hypey.

- **Person:** Address the reader as **"you"**; the product is **"ABC SalesMaster"** (or just
  "SalesMaster" in-app). We avoid "we/our" except in the company footer.
- **Outcomes over features:** lead with the result. *"Recover 8+ hours a week,"* *"close more
  deals,"* *"without juggling five tools."* Features are the proof, not the headline.
- **Casing:** Sentence case everywhere — headlines, buttons, nav, table headers are the one
  exception (UPPERCASE micro-labels / eyebrows with wide tracking, e.g. `MARKETING SUITE`).
- **Length:** short. Headlines ≤ 8 words. Body sentences rarely exceed ~18 words. Buttons are
  verb-first: *Start free trial, Add contact, Send proposal, Book a call.*
- **Numbers:** concrete and specific — `$48,920`, `327 leads`, `+12.4%`, `4,000+ businesses`.
  Money and metrics render in the mono face for tabular alignment.
- **Industry-aware:** copy references the reader's world — *matters, retainers, policy renewals,
  listings, prospects.* One product, spoken in the customer's language.
- **Emoji:** sparingly, and only in warm app moments (a single 👋 on the dashboard greeting).
  Never in marketing headlines, buttons, or formal UI. Never as a substitute for an icon.
- **Punctuation:** em dashes for asides, the occasional ampersand in labels ("CRM & contacts").
  No exclamation-point spam.

**Examples (use as reference):**
- Hero: *"Run your whole business from one platform."*
- Sub: *"CRM, marketing automation, a website builder, and analytics — built for solo
  professionals and small teams who'd rather sell than juggle software."*
- Empty state: *"Build email & SMS sequences that nurture every lead on autopilot."*
- Pro tip card: *"Automate follow-ups and recover 8+ hours a week."*

---

## VISUAL FOUNDATIONS

**Overall vibe:** clean, bright, and trustworthy with energetic blue accents — a light
SaaS workspace on near-white surfaces. Lots of breathing room; color used decisively, not
everywhere. Think "approachable enterprise."

**Color**
- Primary is a **royal/indigo blue** lifted straight from the play-button mark: the brand
  gradient runs `#2F399D → #555FC4` (`--gradient-brand`). The flat primary is `#3D49C4`
  (`--color-primary`); hover deepens to `#2F399D`, active to `#262E82`.
- **Navy `#090966`** (`--navy-900`, the wordmark color) anchors dark surfaces — the sidebar
  pro-tip card, the contact drawer header, footer, and the marketing CTA band.
- **Cool grays** carry text, borders, and surfaces (`#909094` brand gray and its scale).
  Backgrounds are `--surface-page` `#F8F9FC`; cards are pure white.
- Semantic: green `#1F9D6B` (success/won), amber `#E0A115` (warning/follow-up), red `#DC4040`
  (danger/overdue). Each has a soft tint (`-100`) for badges and alerts.
- **Two background colors max** per surface: near-white page + white cards. Dark moments use
  navy or the brand gradient — never a third neutral.

**Type**
- **Display:** `MontserratAlt1` SemiBold (the brand's wordmark font) for all headings and the
  hero — tight tracking (`-0.02em`), 600 weight. *(See substitution note below.)*
- **Body:** Montserrat 400/500/600. Generous line-height (1.5 UI, 1.65 long-form).
- **Mono:** Roboto Mono for money, metrics, table values, and `kbd`.
- Micro-labels/eyebrows: uppercase, 700, `0.08em` tracking, in primary blue.

**Spacing & layout**
- 4px base scale (`--space-1`…`--space-32`). Cards use 24px (`--space-6`) interior padding.
- App shell: fixed 244px sidebar + 64px top bar, scrolling content area at 24px gutters.
- Marketing: 1200px max content width, ~88px vertical section rhythm, centered section heads.

**Corners & cards**
- Friendly rounding: controls `--radius-md` (10px), cards `--radius-lg` (14px), modals &
  feature tiles `--radius-xl`/`2xl` (20–28px), pills fully round.
- **Card recipe:** white surface + **1px `--border-subtle`** + soft **`--shadow-sm`**. The
  border does the separating; shadow is a whisper. Interactive cards lift `-2px` with
  `--shadow-lg` on hover. Never stack heavy shadows.

**Shadows**
- Cool-tinted, low-contrast elevation ramp (`--shadow-xs` → `xl`), all tinted with navy
  `rgba(18,22,74,…)`. Primary buttons get a colored **`--shadow-brand`** glow.

**Backgrounds & texture**
- Mostly flat near-white. Accents: a soft **radial wash** behind the hero
  (`radial-gradient(... var(--blue-50), transparent)`) and the brand gradient on CTA bands,
  primary buttons, avatars, and feature-tile icons. No photographic backgrounds, no noise/grain,
  no repeating patterns. Sparing translucency + blur only on the sticky nav and modal scrims
  (`backdrop-filter: blur`).

**Motion**
- Quick and a little springy — startup energy, never bouncy-cartoonish. Durations 120/200/320ms.
- `--ease-out` for most transitions; `--ease-spring` for the toggle knob and modal pop-in.
- Hover = subtle lift + shadow or a tint shift; **press = scale down ~0.97–0.99** (buttons) or
  0.95 (icon buttons). Drawers slide in from the right; modals fade + pop. No infinite loops.

**Hover / press states**
- Primary button: hover darkens to `--color-primary-hover`, drops the brand shadow on press.
- Secondary: hover to `--gray-50`. Ghost: hover to `--blue-50`.
- Rows & nav items: hover to `--gray-50`; active nav item is a `--blue-50` chip with blue text.

**Focus**
- Brand focus ring `--ring-focus` (3px `rgba(85,95,196,0.35)`) plus a blue border. Always visible.

---

## ICONOGRAPHY

- **System:** **Lucide** line icons — 24×24 grid, **2px stroke**, round caps/joins, no fill.
  Clean and geometric; matches the modern-startup tone. Active/selected icons bump to ~2.3px
  stroke for weight rather than switching to a filled set.
- **Format:** SVG, currentColor-driven so they inherit text color. A curated subset is embedded
  in `ui_kits/web-app/Icons.jsx` (exported as `window.ABCIcons.Icon`, used across all kits) for
  offline reliability. **To use the full library, drop in the Lucide CDN
  (`https://unpkg.com/lucide`) — same visual language.** ⚠ *Substitution flag: Lucide is a
  best-match choice; if AIBizConnect has a house icon set, send it and it will be swapped in.*
- **Sizing:** 16px inside buttons/badges, 18–22px in nav and tiles, 26–28px for feature/empty-state
  marks. Tile icons sit in tinted (`--blue-50`) or gradient squares.
- **The play-button mark** is the brand's hero glyph (action / momentum) — used as the app icon
  and favicon, not as a UI icon.
- **Emoji** are not part of the icon system (one optional 👋 in the dashboard greeting only).
  No unicode-character icons.

---

## TYPOGRAPHY SUBSTITUTION — action needed
Only **MontserratAlt1-SemiBold (600)** was provided. We use it for display/headings and load
**standard Montserrat** (Google Fonts, 400/500/600/700) for body weights and **Roboto Mono**
for data. MontserratAlt1 is a stylistic alternate of Montserrat, so the pairing is visually
consistent — but if you have the **full MontserratAlt1 family** (regular/medium/bold), send it
and the `@font-face` set in `tokens/fonts.css` will be expanded. ✅

---

## INDEX — what's in this system

**Root**
- `styles.css` — the single entry point consumers link. `@import`s all tokens. *(Imports-only.)*
- `readme.md` — this file. `SKILL.md` — Agent-Skills-compatible wrapper.

**`tokens/`** — CSS custom properties (imported by `styles.css`)
- `colors.css` · `typography.css` · `spacing.css` · `effects.css` (radii/shadow/motion)
- `fonts.css` (`@font-face` + Google Fonts) · `base.css` (element defaults)

**`assets/`** — `logo-mark.png` (play button), `logo-wordmark-blue.png`,
`logo-wordmark-white.png`, `fonts/MontserratAlt1-SemiBold.woff2`.

**`guidelines/`** — foundation specimen cards (Design System tab): color scales, type, spacing,
radii, shadows, brand/logo usage.

**`components/`** — reusable React primitives (namespace `window.AIBizConnectDesignSystem_d948fa`)
- `core/` — `Button`, `IconButton`, `Badge`, `Avatar`, `Card`/`CardHeader`
- `forms/` — `Input`, `Select`, `Checkbox`, `Switch`
- `data/` — `Stat`, `Tabs`, `Alert`
  Each component ships `.jsx` + `.d.ts` + `.prompt.md`; each folder has a `*.card.html` demo.

**`ui_kits/`** — high-fidelity, interactive product recreations
- `web-app/` — the **ABC SalesMaster CRM** (sidebar, top bar, dashboard, contacts table +
  drawer, pipeline kanban, new-contact modal). Entry: `index.html`.
- `marketing/` — the **marketing landing page** (nav, hero + product preview, features,
  industries, pricing, CTA, footer). Entry: `index.html`.
- `mobile/` — the **iOS CRM app** (home, contacts, pipeline, bottom tabs, FAB) in a device frame.
  Entry: `index.html`.

**Namespace:** import components as `const { Button } = window.AIBizConnectDesignSystem_d948fa`
after loading `_ds_bundle.js`.
