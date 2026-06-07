# GHL-style Website Editor — Spec (from Ali's reference screenshots)

Status: DRAFT spec for build. Defers to SHARED_SPEC.md. Date: 2026-06-01.
Goal: "structured freedom" — component-based, brand-token-driven, critic-safe editing
that feels like GoHighLevel but never breaks brand/structure/safety.

## Top toolbar
Add element (＋), Layers, Sections, Code (custom CSS/HTML), Popups, Text, Media, Forms,
Saved assets, Animations, panel toggle; page selector; desktop/mobile responsive toggle;
keyboard shortcuts; version history (undo/redo); Preview; Save; Publish.

## Quick Add palette (＋)
- Rows: 1 / 2 / 3 / 4 / 5 / 6 column.
- Text: Headline, Sub-Headline, Paragraph, Bullet list, Rich Text.
- Form: Button, Form.
- Plus: Buttons, Forms & Surveys, Social Media Icons, Countdown Timers, Images,
  Progress Bar, Blog, Video, Map, Gallery, etc.
Left rail tabs: Quick Add · Sections · Rows · Elements · Prebuilt Sections ·
Saved Assets · Widget Marketplace · Store.

## Prebuilt Sections library
Categorized, premium section templates: About, Call To Action, FAQs, Footer, For Who,
Guarantee & Awards, Image Slider, List, Mega Menu Headers, Partners, Plan Selection,
Product, Store Sections, Team, Testimonials, Welcome. (Maps to our component registry.)

## ⭐ Saved Assets — reuse tiers (Ali's favorite)
Three distinct reuse behaviors when you save a section OR an element:

1. **Template (copy)** — "Element Templates" / "Section Templates".
   - Saves as a COPY. Reusable anywhere as a starting point.
   - Inserting creates an INDEPENDENT instance; editing a copy does NOT affect others.
   - Scope: tenant library (and optionally platform-wide presets).

2. **Global (per-website)** — "Global Sections".
   - Scoped to ONE website. Edit once → every instance ON THAT SITE updates.
   - "Changes will affect current website."

3. **Universal (per-account)** — "Universal Elements" / "Universal Sections".
   - Saved at the ACCOUNT level. Edit once → syncs across ALL of the tenant's websites.
   - "Any changes in one instance will sync across all instances, account-wide."

### Data model (extends existing global blocks)
We already have:
- `website_global_blocks (id, tenant_id, name, type, content, draft_content)`
- `website_page_block_refs (page_id, block_id, order_index)` — the sync mechanism:
  a page references a block, so editing the block updates every referencing page.

Proposed additions (QUEUED — see supabase/QUEUED_saved_assets.sql, NOT applied):
- `website_global_blocks.scope text` — 'website' | 'account' (account = Universal).
- `website_global_blocks.website_id uuid null` — set when scope='website'.
- `website_global_blocks.kind text` — 'section' | 'element'.
- New `website_saved_templates (id, tenant_id, name, kind, content, is_platform)` —
  the copy-on-insert library (Templates tier; platform presets when is_platform).

Behavior:
- Template insert → copy content into the page's own section row (no ref). Independent.
- Global/Universal insert → create a `website_page_block_refs` row → live link → sync.
- Global scoped by website_id; Universal spans all the tenant's sites (no website_id).

## Element inspector (3 tabs) — per selected element
- **General**: element name; Text + Sub Text; Typography (type → Headline/Content font,
  font size px, font weight).
- **Styles**: appearance (full width fluid/fixed, BG color/image/video, spacing), visual
  Margin & Padding box editor, Border (style/color/sides), radius, shadow.
- **Animations**: Entrance (None, Fade In/Up/Down/Left/Right, Slide, Bounce…) + Hover
  (None, Elevate, Wobble), each clearable.

## Popup builder
- Popup element with: Disable popup; close-on-click-outside; Width (S/M/L); Show popup on
  (Exit-intent, timer, scroll, load); Background (color/image/video); Position (9-grid).
- Multiple popups per page with priority/z-index ordering; "Create New Popup".

## SEO & AI search optimization panel (per page)
"Get found across AI & search engines." Live SERP/preview + scored checklist sections:
- Preview (title / description / URL) — already backed by website_pages.seo_*.
- Content (score), Keywords, Author (score), Images (alt coverage), Links & tags (score),
  Language, Schema markup (JSON-LD).
- Scoring reuses the O-3 critic's SEO/accessibility heuristics; GEO angle = optimize for
  AI answer engines (clear headings, schema, entity clarity).

## Custom CSS / Code
- Per-page Custom CSS modal (code editor, Save/Cancel). Advanced escape hatch; still
  rendered inside the brand-token sandbox.

## Safety (unchanged)
- Component-based, critic-safe; O-3 runs on publish (structure, a11y, SEO, safety).
- Brand tokens always applied; custom CSS sandboxed.
- Drafts only until publish; per-tenant publish control.
- All schema changes QUEUED, not applied, until Ali confirms.

## Build sequence (proposed)
1. Saved Assets reuse tiers (Template / Global / Universal) + "Save this element/section"
   modal + Saved Assets panel. (Ali's favorite — do first.)
2. Element inspector (General/Styles/Animations).
3. SEO & AI search panel (evolve existing SeoPanel).
4. Popups + Custom CSS.
5. Quick Add palette + Prebuilt Sections wired to the component registry.
