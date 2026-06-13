# Design → Element-Layers Import Contract (D-287)

**Goal (Ali, existential):** beautiful designs that drop into our Section → Row → Column →
Element structure **losslessly and fully editable** — without touching the editor or the
importer. The lever is the **input**: make the design (Stitch or any source) speak our
structure natively, so the translator captures everything and nothing is flattened,
clamped, or dropped.

This document is two things:
1. The **contract** — what imports losslessly vs. what breaks (from the real translator).
2. The **structured Stitch prompt** — bakes the contract into every generation.

---

## 1. How our importer thinks (so designs can cooperate)

The render bridge stamps every node with `data-cs` (computed styles). `htmlToSections`
then walks the DOM and produces **bands → rows → columns → elements**:

- A **band** = a full-width horizontal stripe (a `<section>`/`<header>`/`<footer>`, or a
  child with its own background, or one separated by ≥48px gap).
- Inside a band it finds the dominant **card grid** (a flex/grid container of 2–12 similar
  children) → a **row** with N **columns**.
- Each leaf becomes a **named element** (heading, text, button, image, list, …).
- Spacing is clamped to **≤40** (`SPACING_MAX`); larger paddings fluid-scale.
- Backgrounds: solid colors, gradients (now captured into `_style.bg`), and image URLs.

So the importer is happiest with **clean vertical sections of equal-column rows of
recognizable components.** Designs that fight that model lose fidelity.

---

## 2. The contract — DO / DON'T

### ✅ Imports LOSSLESSLY
- A page = a **vertical stack of full-width `<section>` bands**, one idea per band.
- Within a band, **one row of 1–4 EQUAL columns** (flex/grid, equal children).
- **Semantic HTML5**: `<header> <section> <footer> <h1>–<h6> <p> <ul><li> <a> <button>
  <img> <picture>`. Our recognizers key off these.
- **Recognizable component shapes** that map to a named element (see §3).
- **Solid or single-gradient backgrounds** on a band; gradient reserved for CTA/hero.
- **Spacing rhythm ≤ 40** (section padding, gaps). Consistent multiples (8/16/24/32/40).
- **One heading font + one body font**, both standard **Google Fonts** (name them).
- **One brand color** + neutral grays; the theme extractor captures these cleanly.

### ❌ BREAKS or DEGRADES (avoid in the design)
- **Absolute positioning / overlapping layers** → flattened; stacking + position lost.
- **CSS grid column spans** (one card spanning 2 tracks) → column miscount / ghost cells.
- **Background image with text overlaid** (except the hero) → text and bg may separate.
- **Deeply nested flex (>3 levels)** → over-fragmentation or column collapse.
- **Sticky / fixed / parallax / scroll-driven animation** → not representable; dropped.
- **Icon fonts** that aren't standard Material Symbols → render as ligature words.
- **Tables used for layout** → captured as a raw `html` element (not editable as parts).
- **Decorative/non-Google fonts** → theme can't capture; falls back to defaults.
- **Huge hero heights / >40 spacing** → clamped (still looks fine, but not pixel-exact).
- **Carousels/sliders with JS state** → first slide imports; interactivity is re-added as
  our native `slider`/`tabs` element, not the source's script.

---

## 3. The element vocabulary — design in THESE blocks

Every section should be built from components that map 1:1 to a native element. Name them
in the prompt so Stitch produces the exact shape:

| Design the section as… | Imports as element |
|---|---|
| Top bar: logo + horizontal nav links + one CTA button | `header` row with a `menu` |
| Headline + subtext + 1–2 buttons (+ optional right image) | `hero` |
| 3–4 equal cards, each icon + title + 1-line text | `features` |
| 3 equal plan cards, one marked "Most Popular" | `pricing` |
| 3 equal quote cards: quote + name + ★ rating | `testimonials` |
| Row of grayscale brand logos | `logos` |
| Row of big numbers + labels (e.g. "500+ clients") | `number-counter` |
| Question/answer accordion list | `faq` |
| Full-width gradient stripe: headline + button | `cta` |
| Tabbed content panels | `tabs` |
| Footer: 3–4 columns of link lists + © bar | `footer` with `bullet-list`s |
| A simple list of linked items | `bullet-list` |
| A form (name/email/phone/message) | `contact-form` |
| A single image / image grid | `image` / `gallery` |

Anything not in this table becomes generic `heading`/`text`/`image` — still editable, just
not a "smart" element. So **compose from the named blocks** for the richest result.

---

## 4. The structured Stitch prompt template

Fill the `{{…}}` slots; the rest is the contract, encoded. This replaces freeform briefs
in the Stitch pipeline.

```
Design a {{PAGE_TYPE}} web page for "{{BUSINESS_NAME}}", a {{INDUSTRY}} business.
Tone: {{TONE}}. Audience: {{AUDIENCE}}.

STRUCTURE (follow exactly — this is how the page must be built):
- Lay the page out as a VERTICAL STACK OF FULL-WIDTH HORIZONTAL SECTIONS. One idea per section.
- Inside each section, arrange content in a SINGLE ROW of 1 to 4 EQUAL-WIDTH columns.
- NEVER use: absolute/overlapping positioning, column spans, sticky/fixed elements,
  parallax, background images with text on top (except the hero), or tables for layout.
- Use semantic HTML5: <header>, <section>, <footer>, <h1>–<h6>, <p>, <ul><li>, <a>, <button>, <img>.
- Spacing rhythm: section padding 24–40px; gaps 16–24px; consistent multiples of 8.

SECTIONS (use these named blocks, in this order):
1. HEADER — logo text left, 3–5 nav links center, one primary CTA button right.
2. HERO — big headline, one-sentence subhead, two buttons, optional supporting image on the right.
3. FEATURES — a row of 3–4 EQUAL cards, each a small icon, a short title, and one line of text.
4. {{SOCIAL_PROOF}} — a TESTIMONIAL WALL: 3 equal cards, each a quote, a person's name, and a 5-star rating.
5. PRICING — 3 equal plan cards; mark the middle one "Most Popular" with a colored badge.
6. FAQ — a question/answer accordion of 4–6 items.
7. CTA — a full-width band with a single accent GRADIENT background, a headline, and one button.
8. FOOTER — 4 columns: a short brand blurb + 3 columns of link lists; a copyright bar as the LAST line.

STYLE — use ONLY this palette (no arbitrary colors; ensures clean theme capture):
- primary {{BRAND_COLOR}} · accent {{ACCENT}} · background {{BG=#ffffff}} · surface {{SURFACE=#f8fafc}}
  · text {{TEXT=#0f172a}} · text-muted #64748b · border #e2e8f0.
- Heading font: {{HEADING_FONT}} (Google Fonts). Body font: {{BODY_FONT}} (Google Fonts).
- Use primary for buttons, links, badges, and the ONE CTA gradient (primary→accent). At most one gradient on the page.
- Corner radius 8px; soft subtle shadows for card elevation.
- Text must meet WCAG-AA contrast against its background (never light text on a light band).
- Icons: standard Material Symbols only.

Make it beautiful and modern, but every section must remain a clean full-width band of
equal columns built from the named blocks above.
```

### Per-page section recipes (swap block 2–7 by page type)
- **Home**: header · hero · features · social-proof · pricing · faq · cta · footer
- **About**: header · hero(short) · story text · team `features` · values · cta · footer
- **Services/Product**: header · hero · features(detailed) · `tabs` or comparison · pricing · faq · cta · footer
- **Contact**: header · hero(short) · `contact-form` + business `bullet-list` · `map` · footer
- **Pricing**: header · hero(short) · pricing · faq · cta · footer

---

## 5. Why this doesn't change how Stitch *looks*

The contract constrains **structure and semantics**, not aesthetics. Stitch still chooses
the visuals, imagery, and polish — it just builds them as clean stacked bands of equal
columns from named blocks, which is already how good marketing pages are designed. The
output looks the same to a human; it simply lands in our element tree **whole**.

---

_Status: D-287 (2026-06-13). Editor + importer UNTOUCHED per Ali. This contract feeds the
Stitch pipeline prompt; QA = import a page generated with it and confirm Inspector 100 with
every band a named row/element (no `imported-html`/`html` fallbacks, no clamped spacing
surprises)._
