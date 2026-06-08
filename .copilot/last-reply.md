See my thinking

You’ve moved this from “builder” to “product” territory—nice work. Let’s lock in some clear rules so it stays coherent as it grows.

1. Editability policy (smart vs decomposed) — set this line now

Keep as smart components (with inline item editors):

Pricing

FAQ

Gallery

Forms

Menu / Nav

Why: they’re inherently interactive, list-based, or schema-heavy. Users care more about items, labels, and behavior than pixel-perfect layout. You don’t want people accidentally breaking validation, layout logic, or responsive behavior.

What to do:

Keep them as smart components.

Add an inline item-editor overlay:

Click → opens structured editor (items, labels, prices, questions, images, fields).

Still allow high-level layout toggles (columns, alignment, style variant).

Expose only safe style knobs:

Radius, shadow, bg, padding, alignment, theme variant.

Decompose everything else into rows + elements:

Heroes

Features

Stats / Counters

Testimonials

CTAs

About / Services

Logos / Partners

Simple content sections

These should always be fully decomposed into rows + heading/text/image/button/etc so they’re editable “all the way down”.

2. Generator output — yes, convert hero/features/cta to row-based

Recommendation:  
Yes—convert the generator’s hero, features, cta (and similar) to the same row-based structure as your prebuilts.

Use the same section templates as the Prebuilt library (Design DNA).

Generator picks:

Aesthetic (theme tokens)

Section templates (hero, features, stats, testimonials, CTA)

Fills content into them.

Why:

Generated sites become 100% editable, same as prebuilts.

You get one representation of sections (no “special” generator-only types).

Blueprint/classify logic doesn’t break—it just maps archetypes → templates instead of archetypes → monolithic components.

Risk to blueprint/classify:  
Minimal, if you:

Keep the same archetype names (hero, features, cta, etc.).

Just change the implementation from monolithic to row-based.

If you rely on type: 'hero' somewhere, keep a semantic tag (e.g. sectionKind: 'hero') on the row for analytics/classification.

3. _fillBg flag — promote to first-class style

Right now _fillBg as a content flag is a pragmatic hack. Long-term, it belongs in the style system, not content.

Recommendation:

Promote background-image fill to element-style / row-style:

style.bgImage (url)

style.bgMode (cover, contain, pattern, tint)

style.bgOverlay (optional tint/gradient)

_fillBg can stay as a legacy/shortcut that maps to:

bgMode = 'cover'

bgPosition = 'center'

bgSize = 'cover'

Why:

Background behavior is presentation, not content.

Importer can map real CSS backgrounds into this cleanly.

Prebuilts + generator can use the same mechanism.

It keeps your “editable all the way down” story consistent: background is just another style knob.

Short-term: keep _fillBg but implement it via style under the hood. Long-term: migrate to pure style.

4. Prebuilt taxonomy — light alignment with GHL, but keep your opinion

Recommendation:

Don’t fully mirror GHL’s taxonomy (it’s noisy and sales-funnel-specific).

Do a light alignment where it helps users recognize patterns:

Add categories like:

Team

Partners / Logos

Guarantee & Awards

Plan Selection (pricing variants)

Welcome / Intro

Store / Product sections (when you’re ready)

Keep your core, opinionated categories:

Contemporary Luxury

Headers

Split / Photo

About & Services

CTAs

Footers

Testimonials

Stats / Counters

Why:

You want recognizable names for GHL-style users, but not a bloated, overlapping taxonomy.

Your Design DNA is a differentiator—don’t dilute it by copying GHL’s entire set.

Prioritized recommendation (do this in order)

Lock the editability policy

Smart components: pricing, FAQ, gallery, forms, menu.

Everything else: decomposed rows + elements.

Add inline item-editor overlays for smart components.

Convert generator sections to row-based templates

Use the same templates as Prebuilts.

Keep sectionKind tags for semantics.

Result: generated sites are fully editable end-to-end.

Promote _fillBg into style

Implement background-image fill as first-class style.

Keep _fillBg as a convenience flag that sets style.

Lightly align Prebuilt taxonomy with GHL

Add a few familiar categories (Team, Partners, Guarantee, Plan Selection).

Keep your curated, luxury-focused categories as the backbone.

If you do those four, you’ll have:

a clear, defensible editability model,

generated sites that feel like your best prebuilts,

a style system that can grow,

and a library that feels both familiar to GHL users and distinctly “Ali-level” in taste.

Edit in a page