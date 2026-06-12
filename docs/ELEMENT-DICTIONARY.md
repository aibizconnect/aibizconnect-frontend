# Element Data Dictionary — AIBizConnect Website Builder

> v1 (2026-06-10). Source of truth for every element: what it is, its data, how it renders, how each
> editor panel controls it, and how to RECOGNIZE it in imported HTML (lossless projection, D-188+).
> Maintained with the architects (Gemini working peer; Copilot = blueprint + docs of record).

## How the element system works

| Layer | File | Role |
|---|---|---|
| Schema | `lib/sections/schemas.ts` | Zod union — the element's DATA contract (content fields) |
| Field specs | `lib/sections/fieldSpecs.ts` | Which content fields the RIGHT panel (General tab) shows |
| Renderer | `components/sections/registry.tsx` + per-element components | How it draws in canvas/preview/public |
| Style | `content._style` (+ `_responsive`) via `lib/design/element-style.ts` | Styles tab: spacing, bg, border, shadow, size |
| Animation | `content._anim` via `animClasses()` | Animations tab — available on EVERY element (wrapper-level) |
| Layers | `lib/sections/layers.ts` | LEFT panel tree shape + labels |
| Projection | `lib/sections/node-projection.ts` | Imported HTML node ⇄ native element mapping |

Every element supports: `_style` (Styles tab), `_anim` (Animations tab), `_name` (display name),
`_role` (typography role). Listed below are the element-specific CONTENT fields.

## Walk the left panel (top → bottom)

### 1. SECTION ("Add a Section")
**Definition.** A Section is a top-level band of the page: one entry in `draft_sections`, rendered
as a full-bleed strip carrying its own background/padding (`_style`). Internally it IS a Row
(`type:"row"`) at page root — the Layers panel labels root rows "Section".

**Width tiers** (Ali's spec — now real, not cosmetic):
| Tier | Inner max-width | Use |
|---|---|---|
| Full Width | none (edge-to-edge) | hero strips, color bands, tickers |
| Wide (= legacy "boxed") | 1200px (`--abc-maxw`) | standard content |
| Medium | 960px | articles, forms |
| Small | 720px | narrow copy, signatures |
The background always spans edge-to-edge; the TIER constrains the content box. Editable any time:
right panel → General → "Content width".

**Recognition in imported HTML.** Band boundaries: semantic `<section>/<header>/<footer>`, an own
background different from the page, or a ≥48px vertical gap (D-149). Width tier: read the inner
wrapper's computed `max-width` → ≥1140px ⇒ wide, ~960 ⇒ medium, ~720 ⇒ small, none ⇒ full.

**Controls.** Canvas hover toolbar + right-panel Actions: move ↑/↓ (reorders `draft_sections`),
duplicate (deep JSON clone), delete, save-as-asset, AI rewrite. On an IMPORTED band the same
actions write structural patches (move/duplicate-with-fresh-uids/remove) over the verbatim HTML.

### 2. ROW ("Rows", 1–8 columns)
**Definition.** The layout primitive: N columns (`children[col][]` arrays), per-column styles
(`colStyles`), fractional widths (`widths`), gap, vertical align, min-height. Mobile: stacks to
one column under 768px by default (`keepRowOnMobile` opts out, `reverseOnMobile` flips); tablet
caps at 2–3 visible columns with wrap. A row containing a `menu` renders as a HEADER bar
(logo + ☰ on mobile). Rows nest inside columns (sub-rows).
**Recognition.** flex/grid containers; outermost layout grid wins (D-173); cards chunk per real
`grid-template-columns` count (D-175).
**Controls.** Column resize (drag divider), per-column +add/duplicate/delete, drag-drop children
between cells, column style (bg/padding/align) in inspector.

### 3. TEXT family — mirrors the Typography roles
The site-wide Typography settings define roles; each Text tile seeds the matching `_role`, so
global typography drives every instance (change Typography → all Body text follows).
| Tile | Element | Role | HTML recognition |
|---|---|---|---|
| Title | heading h1 | `title` | the page's `<h1>` |
| Subtitle | subheading | `subtitle` | `<h2>/<p>` directly under a Title, lighter weight |
| Headline | heading (h2–h4) | `heading` | other `<h2>–<h4>` |
| Section Header | heading h2 | `sectionHeader` | first heading of a band |
| Body | text | `body` | `<p>` |
| Quote | text (italic) | `quote` | `<blockquote>`, quoted+italic text |
(Buttons/menus also have roles: `button`, `menu`, `submenu` — applied by their own elements.)

### 4+. Continue down the panel
Lists → Buttons → Icon → Images → Media → Sections (composites) → Forms & Surveys → Booking →
Social → Ticker → Countdown Timers → Progress Bar → Layout (Divider/Spacer) → Custom.
Per-element details in the master table below; pending upgrades are tracked in D-197..D-203.

## Master table

| # | Type | Label | Purpose / behaviour | Key content fields | HTML recognition (projection signature) | Status / gaps |
|---|---|---|---|---|---|---|
| 1 | `heading` | Heading | h1–h6 title; fluid size ≥22px | text, level, color, fontSize, align, gradientText | `<h1>`–`<h6>` | OK — projected ✓ |
| 2 | `subheading` | Subheading | secondary title | text, level | `<h2>/<h3>` smaller | OK |
| 3 | `text` | Text | paragraph; inline-editable | text, color, fontSize, align, href | `<p>`, text-leaf `<span>/<div>/<li>` | OK — projected ✓ |
| 4 | `image` | Image | picture w/ Media Library, lightbox, link | url, alt, width, rounding, objectFit, href | `<img>`, `<picture>` | OK — projected ✓ |
| 5 | `button` | Button | CTA; solid/outline; size | label, href, variant, bgColor, textColor, radius, size | `<a>/<button>` w/ chrome (fill or radius+padding) | OK — projected ✓ |
| 6 | `divider` | Divider | horizontal rule | (style only) | `<hr>` | OK |
| 7 | `spacer` | Spacer | vertical gap | size sm/md/lg | tall empty `<div>` | OK |
| 8 | `video` | Video | YouTube/Vimeo/file embed | url | `<video>`, `<iframe src=youtube…>` | OK |
| 9 | `audio` | Audio | audio player | url | `<audio>` | OK |
| 10 | `html` | Custom HTML | raw user snippet | code | n/a (user-authored) | OK |
| 11 | `row` | Row/Columns | the LAYOUT primitive: N columns, per-col styles, mobile stacking | columns, children[][], colStyles, widths, gap, valign | flex/grid containers | OK |
| 12 | `bullet-list` | Bullet List | list w/ marker styles | items[], bulletStyle (disc/circle/square/none/check/arrow/number), color, direction | `<ul>` | **GAPS (Ali)**: custom icon per list; global text controls (font/size); numbered list needs startAt + 2-col split (1-5 / 6-10) |
| 13 | `number-counter` | Number Counter | animates a stat number on view | value, start, end, duration, label, prefix, suffix | big numeral text node ("500+") | **DUPLICATE of countdown:counter (Ali) — consolidation ruling needed** |
| 14 | `progress-bar` | Progress Bar | labelled % bar, animates to percent | label, percent | `<progress>`, div-in-div width:% | AUDIT (Ali): fields are minimal — no color/height/value-text controls |
| 15 | `countdown` | Countdown (3 modes) | counter: number from→to over seconds; timer: HH:MM:SS down; date: D/H/M/S to a moment | mode, from, to, duration, prefix, suffix, minutes, target, units, display, title, footer, preText, postText, font, fgColor, bgColor, size, align | timer-looking digit groups | **GAP (Ali)**: timer needs visitor-scope modes: each-visit / per-visitor (evergreen) / global target |
| 16 | `ticker` | Ticker | infinite marquee strip | items[{text}], speed, bg, color, separator | `marquee`-like animated strip | **GAP (Ali)**: images-only / text-only / mixed modes |
| 17 | `menu` | Menu | nav links; ONE submenu level (`children`); renderer treats row-with-menu as header bar | items[{label, href, children[]}], orientation, align, gap, fontFamily | `<nav>`, link lists | **SPEC NEEDED (Ali)**: concrete definition; submenu add/edit UI in inspector |
| 18 | `icon` | Icon box | glyph + optional heading/text | icon, heading, text, size, color | icon-font `<span>`/`<svg>` | OK |
| 19 | `gallery` | Gallery | image grid 2–6 cols | images[], columns | repeated `<img>` grid (≥3) | OK |
| 20 | `slider` | Slider | image carousel | images[], autoplay? | carousel markup | OK |
| 21 | `logos` | Logos | partner logo strip | images[] | row of small images | OK |
| 22 | `social` | Social Icons | platform links | links[{platform,url}] | icon-font/svg social `<a>`s | OK |
| 23 | `map` | Map | Google Maps embed by query | query | `<iframe src=maps…>` | OK |
| 24 | `qr` | QR Code | generated QR | data, size | n/a | OK |
| 25 | `faq` | FAQ | Q/A accordions | items[{q,a}] | dt/dd, details/summary | OK |
| 26 | `tabs` | Tabs | tabbed content | tabs[{label,content}] | role=tablist | OK |
| 27 | `pricing` | Pricing | plan cards | plans[{name,price,period,features,cta}] | price-pattern cards | OK |
| 28 | `testimonials` | Testimonials | quote cards | items[{quote,author}] | ★ row + quote + attribution | OK |
| 29 | `features` | Features | icon+title+text cards | items[] | card grids | composite template |
| 30 | `hero` | Hero | heading+sub+CTAs+bg | heading, subheading, CTAs, bg | first band w/ h1 | composite template |
| 31 | `cta` | CTA banner | colored call-to-action band | heading, button | — | composite template |
| 32 | `listings` | Listings | property/product cards | items[] | — | domain composite |
| 33 | `contact-form` | Contact Form | CRM-wired form (name/email/phone/message → /api/leads/submit) | heading, fields[{name,label,type}], submitLabel, submitColor, submitTextColor, successMessage | `<form>` w/ inputs | OK — projected ✓ (labels via sibling-label D-170) |
| 34 | `survey` | Survey | multi-question form | questions[] | multi-fieldset forms | OK |
| 35 | `booking` | Booking Calendar | LIVE embed of the public booking page (?embed=1, logo-free; D-259): calendar dropdown (All calendars = index), heading/subheading, height px; tenantId stamped at insert/edit; absolute app-host URL (custom-domain safe); iframe inert in canvas (clicks select) | config | — | OK |
| — | `imported-html` | Imported design | lossless band (verbatim HTML + patches) | html, patches[] | (is itself the container) | Layer-tree edited; nodes project to elements above |
| — | `imported-css` | Design CSS | snapshot + font hrefs carrier | css, fontHrefs | — | hidden from add picker |

## Panel capability matrix

| Surface | What works today | Known gaps |
|---|---|---|
| LEFT (Layers) | full tree for native sections (row→column→element); imported bands show band name (inner tree lives on-canvas next to the band) | imported band's node tree not yet merged INTO the Layers panel; composites (features/pricing) show blueprint rows not live children |
| CANVAS | select, hover toolbar (move/dup/del/AI rewrite), inline text editing (native + imported dbl-click), column resize, drag-drop, device preview | drag-drop INTO imported bands not supported (insert between bands only) |
| RIGHT — General | per-type fields from fieldSpecs | bullet icons/startAt/columns missing; ticker images missing; timer scope missing; menu submenu editor UI missing; progress-bar minimal |
| RIGHT — Styles | spacing, background (color/image/fade/blur), border+corners, shadow, effects, size/align — via `_style` | — |
| RIGHT — Animations | `_anim` entrance animations on every element | per-element micro-interactions (hover) not yet specced |

## Countdown family — agreed semantics (Ali, ruled this session)

1. **Countdown** (`mode:"counter"`): animates a NUMBER from `from` → `to` over `duration` seconds.
   Editable: the number text, `prefix`, `suffix` (postfix), `title`, `footer`, pre/post text, font,
   fg/bg color, size, alignment. ✓ shipped.
2. **Minute Timer** (`mode:"timer"`): inline `HH:MM:SS` ticking down from `minutes`.
   **NEW (Ali)**: needs a SCOPE: `each-visit` (reset on every load — today's behaviour) /
   `per-visitor` (evergreen: persists per browser so a returning visitor keeps their deadline) /
   `global` (everyone counts to the same moment, e.g. a Zoom call start = a target datetime).
3. **Day Countdown** (`mode:"date"`): days/hours/minutes/seconds cells to a target date-time. ✓.
4. **Number Counter**: functional duplicate of mode "counter" → consolidation decision pending
   (proposal: keep `countdown` as the one element; Quick-Add tile "Number Counter" becomes a
   preset of countdown@counter; legacy `number-counter` content keeps rendering forever).

## HTML recognition map (projection, D-188/D-193)

| HTML | Projects to |
|---|---|
| `<h1>`–`<h6>` | heading |
| `<p>`, leaf `<span>/<div>/<li>` | text |
| `<img>/<picture>` | image |
| `<a>/<button>` (chrome: fill or radius+padding; else plain link) | button |
| `<ul>/<ol>` | bullet-list (items keep per-`<li>` uids) |
| `<form>` + inputs + sibling labels | contact-form (submit label/color mapped) |
| big numeral leaf ("500+", "5.0") fontSize ≥24 | number-counter |
| `<nav>` / link lists | menu (planned composite projection) |
| `<iframe youtube/vimeo>` / `<video>` | video |
| repeated `<img>` grid | gallery (planned) |
| `<hr>` | divider |

Pending recognition (queued): gallery/slider strips, tabs (`role=tablist`),
FAQ (`details/summary`), progress bars, icon fonts → icon element.

## The DIV protocol (Ali's ruling)

A `<div>` is never shown as a "Container" — it is identified by what it DOES:

| The div… | Identified as | Right-panel attributes |
|---|---|---|
| direct children are mostly links (≥80%, ≥2) | **Menu** | full Menu inspector (items, submenus, hrefs) |
| lays children side-by-side (flex-row / grid, ≥2 children) | **Row · N columns** | Box attributes (bg, radius, padding, max-width) |
| has its own background or rounded corners | **Box** (visual card) | Box attributes |
| anything else | **flattened** — children take its place in the tree | — |

Header bands read as: **Section → Row (3 cols) → Logo \| Menu \| Button** — the first plain link
before the menu is the **Logo**, the links group is the **Menu** (never the whole `<nav>`), the
icon-only `<button>` is the **Mobile menu ☰**.
