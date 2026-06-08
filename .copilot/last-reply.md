See my thinking

You’ve hardened the plumbing—now it’s about taste encoded as systems.

Here’s the concrete, prioritized plan to get to “luxury, contemporary, editable all the way down” without losing fidelity.

1. Lock in a design-token system (this is the foundation)

Do this first. Everything else hangs off it.

Create a global design-token layer that every imported + generated section resolves through:

Type scale

Define 6–8 tokens: display, h1–h4, body-lg, body, label.

Map imported fontSizes to nearest token (with a small tolerance).

Generated sites use tokens only; imports get “snapped” where safe.

Spacing scale

Define a tight scale: 0, 4, 8, 12, 16, 24, 32, 40, 56, 72, 96.

Map captured paddings/margins to nearest token.

Section _style stores both: rawPx + token (for future refinement).

Radius + shadow (elevation)

Radius tokens: none, sm, md, lg, pill.

Shadow tokens: none, subtle, card, floating.

Map imported values to nearest token; generator uses tokens only.

Why first:  
This gives you a coherent visual language across imported and generated sites, and it’s compatible with “editable all the way down” because you store both raw + token.

2. Introduce section-level layout presets (row + columns)

You already have rowSchema with cols, gap, valign, colStyles. Turn that into named layout presets:

hero-split (50/50 image + text)

hero-centered (single column, max-width, center)

feature-grid-3 (3 equal cols)

feature-grid-4

testimonial-carousel

logo-strip

cta-band

pricing-3-cols

faq-two-column

Implementation:

Add layoutPreset?: string to rowSchema.

For imports:

Infer preset when pattern matches (e.g., 3 equal cols with cards → feature-grid-3).

Still keep exact col widths in colStyles so fidelity is preserved.

For generation:

Always start from a preset; then apply tokens + theme.

Why now:  
Presets give you structure and rhythm—luxury sites feel intentional because the layouts repeat with variation, not chaos.

3. Build a “design DNA” library (curated templates + theme presets)

This is where “luxury” really comes from.

Design DNA = curated combinations of:

Theme presets

Typography pairings (e.g., serif display + sans body).

Color systems (muted neutrals + one accent, dark mode, warm luxury, tech minimal).

Radius/shadow defaults (sharp + no shadow vs soft + subtle shadow).

Section templates

Fully designed sections using your presets:

Hero variants (image-left, image-right, full-bleed, video background).

Feature sections (cards, icon rows, staggered layouts).

Testimonial layouts (cards, quotes, avatars).

CTAs, pricing, FAQs, footers.

Architecture:

Store templates as real sections JSON using your existing schema.

Tag them with:

industry, tone (luxury, playful, corporate), complexity.

Generator:

Picks a theme preset.

Picks section templates by archetype + industry.

Fills content (copy, images, CTAs) into those templates.

Editable all the way down:  
Because templates are just normal sections, every element is editable; you’re not introducing a separate “locked template” system.

4. Motion + whitespace defaults (subtle but high impact)

Once tokens + presets + DNA exist, add gentle motion + breathing room:

Whitespace

Default section vertical padding from spacing tokens (e.g., 56 or 72).

Ensure first/last sections have slightly more breathing room.

For imports: keep captured padding but snap to nearest token where it doesn’t break layout.

Motion

Add a small set of animation tokens:

fade-in-up, fade-in, scale-in, staggered-list.

Attach them at the section/row level:

animationPreset?: string.

Generator uses them sparingly (e.g., hero + first feature + CTA).

Imports: default to none unless user opts in.

Key:  
Luxury = calm motion + generous whitespace, not flashy.

5. Preserve fidelity while staying editable (system vs user vs captured)

To avoid losing captured fidelity while still being editable:

For each block/row, store:

capturedStyle (from importer, raw computed values).

systemStyle (tokens + theme-driven defaults).

userStyle (editor overrides).

Render order:

Start from systemStyle (tokens + theme).

Overlay capturedStyle where it materially affects layout (e.g., band bg, major padding).

Overlay userStyle (always wins).

Behavior:

Imported sites:

Initially lean more on capturedStyle to look faithful.

As user edits, userStyle gradually replaces it.

Generated sites:

Use systemStyle only; no capturedStyle.

This keeps imports faithful, but lets you normalize toward your design system over time.

6. Tie generator to real-world references (you already started this)

You already have competitor-research.ts and blueprint.ts.

Upgrade them to:

Choose theme preset based on competitor cluster (e.g., dark tech vs light wellness).

Choose section templates from the design DNA library instead of synthesizing raw rows.

Use imported competitor sites only to:

influence theme (colors, type)

influence section ordering

influence density (how many sections, how long pages feel)

This gives you “inspired by” rather than “copied from”, and keeps everything within your curated luxury system.

Concrete implementation order

Design tokens layer

Type, spacing, radius, shadow tokens.

Map imports to tokens (store raw + token).

Section layout presets

Add layoutPreset to rowSchema.

Infer presets on import where obvious.

Use presets for generation.

Design DNA library

Theme presets + curated section templates.

Generator composes from these, not raw.

Motion + whitespace defaults

Section padding from spacing tokens.

Add subtle animation presets.

capturedStyle / systemStyle / userStyle

Implement merge order.

Imports use captured+system; generated use system; user always wins.

If you follow that order, you’ll get:

imports that look like the real site but are still editable, and

generated sites that feel coherent, intentional, and high-end, not generic.

Edit in a page