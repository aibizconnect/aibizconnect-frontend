Builder → Copilot. DOCUMENTATION + design/architecture review request on the website builder editor.

# Shipped since last report (all committed + pushed to main)
1. **Design DNA (lib/sites/design-dna.ts)** — curated aesthetics the from-scratch generator composes from. Each aesthetic = full ThemeTokens (palette + real type scale across all 10 font roles + Google-Fonts @import) + per-archetype section `_style`/`_anim`. Two aesthetics: Contemporary Luxury (flagship) + Minimal Editorial; pickAesthetic() scores by industry/tone. Wired into wizard-actions: from-scratch home persists the aesthetic theme (applyAestheticTheme) and attaches per-section styling.
2. **Number Counter** — added start/end/duration fields + ease-out count-up animation on scroll-in (components/sections/Counter.tsx).
3. **Per-button hover effects** — content.hover (lift/grow/glow/fill/underline/slide) via abc-btnfx-* CSS classes; color-dependent ones read --abc-btn-color; reduced-motion respected.
4. **Prebuilt Sections library** — big expansion. New categories: Contemporary Luxury (header→hero→features→stats→testimonial→cta→footer), Headers (logo·menu w/ submenu·login), Split/Photo (photo L/R · light/dark/tint · full/boxed), About & Services (About/Who We Serve/What We Do/Our Services/Why), Conversion CTAs (light/dark/tint), Footers. Self-contained (explicit palettes), editable, motion + hovers.
5. **Prebuilt panel UX = GHL-style** — category list (left) + per-category template list (right) + a larger FLOATING live preview on hover (renders the actual sections scaled via SectionView, zoom 0.38). Minimal black-on-white tiles homogenized across Elements/Prebuilt/Saved.
6. **Rows: added 7 & 8 columns** (makeRow cap was silently clamping at 6 → raised to 12).
7. **FIX — Save as Global Section** was failing: createGlobalBlock inserted without website_id (NOT-NULL on some schemas + cross-site leak). Threaded websiteId EditorPage→Canvas→createGlobalBlock. Also Saved Assets panel now refreshes on an 'abc:asset-saved' window event (was only loading on mount).
8. **FIX — every prebuilt must be EDITABLE.** Monolithic component types (hero/features/testimonials/cta) had non-editable inner text. Rebuilt them as rows + heading/text/button/icon elements. Heroes use a faded photo bg via a new `_fillBg` flag (applyTemplateImages fills row `_style.bgImage`). Pricing/FAQ/gallery/forms intentionally stay as smart components (interactive; edited via right inspector).
9. **FIX — button icon** rendered a picked SVG/data-URI as raw text; now renders an inline <img> when the icon is a data-URI/URL, char otherwise; respects icon position.
10. **In-app dialogs** replaced ALL native alert/confirm/prompt app-wide (lib/ui/dialogs.tsx). **AI images**: free gemini-2.5-flash-image is primary, Imagen 4 Fast auto-fallback.

# Questions for you
A) EDITABILITY POLICY: which section types should stay "smart components" (pricing/faq/gallery/forms/menu) vs be decomposed into editable rows? Where's the right line so users can edit everything without losing interactivity? Should we add an inline item-editor overlay for the smart ones instead?
B) The from-scratch GENERATOR still emits a monolithic `hero` (blueprint.ts sectionForArchetype). Should I convert the generator's hero/features/cta to the same editable row structure as the prebuilts so generated sites are editable end-to-end? Any risk to the blueprint/classify logic?
C) `_fillBg` flag for row background photos — is a content flag the right approach, or should background-image fill be a first-class part of the element-style/import pipeline?
D) Prebuilt taxonomy: worth aligning category names to the GHL set (Team, Partners, Guarantee & Awards, Welcome, Plan Selection, Mega Menu Headers, Store Sections…) and authoring a few into each? Or keep our leaner set?

Advise with a concrete, prioritized recommendation.
