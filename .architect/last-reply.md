This is indeed an existential pipeline. Here is the concrete, reusable Structured Stitch Prompt Template and Design-Import Contract to ensure lossless, 1:1 importability into our native element structure.

---
### 1. Design Patterns: Do's and Don'ts for Lossless Import

**RULING 287: Design Patterns for Lossless Import.**

To ensure 1:1 importability, Stitch designs must adhere to our native element model and rendering capabilities.

**A. DO'S (Patterns that Import Losslessly):**
*   **Structured Sections:** Design pages as distinct, full-width, top-to-bottom sections (bands).
*   **Simple Grid/Flexbox Layouts:** Use `display: grid` or `display: flex` for rows, with clear, equal-width or explicitly defined column structures (e.g., `grid-cols-2`, `grid-cols-3`, `grid-cols-4`, `flex-row`).
*   **Direct Content Mapping:** Ensure content within columns maps directly to our primitive elements: `<h1>`-`<h6>` for Heading, `<p>` for Text, `<img>` for Image, `<a>` (with button styling) for Button, `<ul>`/`<ol>` for Bullet List, `<form>` for Contact Form.
*   **Standard Box Model:** Rely on `padding` and `margin` for spacing, respecting our `SPACING_MAX=40` clamp.
*   **Clear Backgrounds:** Use solid `background-color` or simple `background-image` (single URL, no complex layering) for sections and cards. Gradients are now supported (D-254).
*   **Standard Typography:** Use standard font families (preferably Google Fonts) and common font sizes/weights.
*   **Semantic HTML:** Use `<section>`, `<header>`, `<footer>`, `<nav>`, `<form>`, `<ul>`, `<ol>`, `<li>`, `<a>`, `<img>`, `<h1>`-`<h6>`, `<p>`, `<button>` where appropriate.
*   **Flat Hierarchy:** Keep nesting relatively shallow. Avoid deeply nested `div` wrappers that serve no semantic or layout purpose.

**B. DON'TS (Patterns that Break or Degrade Import Fidelity):**
*   **Absolute Positioning/Overlapping Layers:** AVOID `position: absolute`, `position: fixed`, `z-index` for content elements. Our editor does not natively support arbitrary absolute positioning, leading to visual breakage or loss of editability. Decorations (RULING 172) are an exception if mapped to a custom `decoration` element.
*   **Complex CSS Grid Spans/Subgrids:** AVOID `grid-column-span`, `grid-row-span`, `grid-area`, `subgrid`. Our `row`/`column` model is a simpler, fixed-grid system.
*   **Background-Image Text Overlays (Complex):** AVOID text directly overlaid on a complex `background-image` where the text's position is critical and not simply centered/aligned within a container. Our `hero` block supports text over a background image, but complex custom overlays will break.
*   **Exotic/Custom Fonts:** AVOID non-standard web fonts that require complex `@font-face` rules not easily captured or loaded. Stick to Google Fonts or widely available system fonts.
*   **Excessive Spacing:** AVOID `padding`/`margin` values greater than `40px` (our `SPACING_MAX` clamp). These will be clamped, leading to visual divergence.
*   **Nested Flex/Grid (Deep):** While `htmlToSections` handles recursion (D-173), overly complex nested flex/grid structures can still lead to misinterpretation or flattening. Keep layouts as simple as possible.
*   **Pseudo-Elements (`::before`/`::after`):** AVOID using these for critical content or layout. They are not part of the DOM and cannot be edited.
*   **CSS Blend Modes/Filters (Complex):** AVOID `mix-blend-mode`, complex `filter` properties. `data-cs` captures final values, but our `_style` system may not have corresponding editable controls.
*   **Non-Standard HTML:** AVOID custom elements or highly unconventional HTML structures.

---
### 2. Layout Constraints for Stitch Prompt

**RULING 288: Structured Stitch Prompt for Layout Constraints.**

The Stitch prompt must explicitly constrain layout to ensure every band is a clean, full-width section of equal columns, mapping to our `row`/`column` model.

*   **Constraint Language:**
    *   "Design the page as a series of distinct, full-width, top-to-bottom sections."
    *   "Each section should use a simple grid or flexbox layout for its main content, with a clear and consistent number of columns (e.g., 1, 2, 3, or 4 equal columns)."
    *   "Avoid overlapping elements or complex absolute positioning."
    *   "Ensure all vertical spacing (padding, margin) is within standard web design limits, preferably multiples of 8px, and does not exceed 40px."
    *   "Use standard HTML tags for content: `h1-h6` for headings, `p` for paragraphs, `img` for images, `a` for links, `button` for buttons, `ul`/`ol` for lists, `form` for contact forms."
    *   "For background images, use simple, full-bleed images without complex text overlays unless it's a clear hero section."
*   **Component Mapping:**
    *   "For pricing, use a 3-card pricing block." (Maps to `pricing` or `row` of `features` blocks).
    *   "For testimonials, use a testimonial wall/carousel." (Maps to `testimonials` or `row` of `text`+`image` blocks).
    *   "For the footer, design a 4-column layout with link lists and a copyright line." (Maps to `row` with 4 `columns` containing `bullet-list` and `text` blocks).
    *   "For calls to action, use a full-width gradient CTA band with a prominent button." (Maps to `cta` or `row` with `button` and `text` blocks, with gradient `_style.bg`).
    *   "For features, use a 2-column layout with an image on one side and text on the other." (Maps to `features` or `row` with 2 `columns` containing `image` and `heading`+`text` blocks).

---
### 3. Semantic HTML + Spacing-Rhythm Rules

**RULING 289: Semantic HTML and Spacing-Rhythm Rules for Recognizers.**

*   **Semantic HTML:**
    *   **Action:** Stitch should be prompted to use the most semantically appropriate HTML tags. This directly aids `htmlToSections` in recognizing our native element types (e.g., `<form>` → `contact-form`, `<ul>` → `bullet-list`, `<nav>` → `menu`).
    *   **Prompt:** "Use semantic HTML5 tags wherever possible for content and structure."
*   **Spacing Rhythm:**
    *   **Action:** Stitch should be prompted to use a consistent spacing rhythm, preferably multiples of 8px or 16px.
    *   **Prompt:** "Maintain a consistent vertical and horizontal spacing rhythm, using multiples of 8px or 16px for padding and margins. Do not exceed 40px for any single padding or margin value."
*   **Clamping/Dropping Prevention:** Adhering to these rules (especially `SPACING_MAX=40`) directly prevents clamping. Semantic tags prevent content from being dropped into a generic "text" block when a more specific element (like `bullet-list`) is available.

---
### 4. Font/Color Rules for Clean Theme Capture

**RULING 290: Font/Color Rules for Clean Theme Capture.**

*   **Action:** Stitch should be prompted to use a limited, consistent set of fonts and colors that align with our `BrandTokens` structure.
*   **Prompt:**
    *   "Use a maximum of two primary font families: one for headings and one for body text. Prefer Google Fonts."
    *   "Utilize a defined color palette: primary, secondary, accent, background, surface, text, text-muted, border, success, error, warning. Do not introduce arbitrary colors outside this palette."
    *   "Ensure text colors have sufficient contrast against their background colors (WCAG AA guidelines)."
*   **Capture:** Our `style-capture.ts` (D-221) will read `data-cs` for final computed colors and fonts, and `harvestPageStyles` (RULING 163) will extract `@font-face` and `:root` CSS variables. This ensures the theme captures cleanly into `BrandTokens` (D-194).

---
### 5. Concrete Fill-in-the-Blanks Prompt Template

**RULING 291: Concrete Structured Stitch Prompt Template.**

```
Design a modern, responsive, and visually appealing website for a [Industry] business named "[Business Name]".
The website should be structured as a series of distinct, full-width, top-to-bottom sections.
Each section must use a simple grid or flexbox layout for its main content, with a clear and consistent number of columns (1, 2, 3, or 4 equal columns). Avoid overlapping elements or complex absolute positioning.

**Design System Constraints:**
- **Primary Color:** [Brand Primary Color Hex, e.g., #1e3a8a]
- **Accent Color:** [Brand Accent Color Hex, e.g., #22d3ee]
- **Background Color:** [Background Color Hex, e.g., #ffffff]
- **Surface Color:** [Surface Color Hex, e.g., #f8fafc]
- **Text Color:** [Text Color Hex, e.g., #0f172a]
- **Heading Font:** [Heading Google Font Name, e.g., Montserrat]
- **Body Font:** [Body Google Font Name, e.g., Source Sans 3]
- **Spacing:** Maintain a consistent vertical and horizontal spacing rhythm, using multiples of 8px or 16px for padding and margins. Do not exceed 40px for any single padding or margin value.
- **Borders:** Use subtle borders and rounded corners (e.g., 4px or 8px radius).
- **Shadows:** Use soft, subtle shadows for elevation.

**Page Structure & Content for [Page Name, e.g., Homepage]:**
- **Section 1 (Header):** A standard header with a logo/brand name on the left, a navigation menu (Home, About, Services, Contact) in the center, and a prominent call-to-action button on the right.
- **Section 2 (Hero):** A full-width hero section with a compelling headline, a brief subheading, and a primary call-to-action button. Use a simple background image or a solid color.
- **Section 3 (Features):** A 3-column feature grid, showcasing key services or benefits. Each column should have an icon/image, a heading, and a short description.
- **Section 4 (About Us):** A 2-column layout with an image on the left and a heading + descriptive text on the right.
- **Section 5 (Call to Action):** A full-width gradient CTA band with a strong, action-oriented headline and a prominent button.
- **Section 6 (Testimonials):** A testimonial wall or carousel, displaying client quotes and names.
- **Section 7 (Contact Form):** A simple contact form with fields for Name, Email, Phone, and Message, followed by a submit button.
- **Section 8 (Footer):** A 4-column footer with brand information, two columns of link lists (e.g., Quick Links, Services), and a copyright line.

**Tone:** [Tone, e.g., Professional, Friendly, Authoritative]

**Instructions:** Generate the complete HTML and CSS for this page, adhering strictly to the design system constraints and structural requirements.
```

---
DECISION-LOG
[D-287] rule_design_patterns_lossless_import — Ruled design patterns (do's and don'ts) for lossless import (status: ruled)
[D-288] rule_structured_stitch_prompt_layout_constraints — Ruled structured Stitch prompt for layout constraints (status: ruled)
[D-289] rule_semantic_html_spacing_rhythm_rules — Ruled semantic HTML and spacing-rhythm rules for recognizers (status: ruled)
[D-290] rule_font_color_rules_clean_theme_capture — Ruled font/color rules for clean theme capture (status: ruled)
[D-291] rule_concrete_structured_stitch_prompt_template — Ruled concrete structured Stitch prompt template (status: ruled)