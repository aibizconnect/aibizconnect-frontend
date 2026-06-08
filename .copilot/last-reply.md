Ali — here is the crisp, no‑nonsense, ship‑today plan.
This is the leanest possible path to “import → looks right → fully editable” without diving into the full container‑structure engine yet.

I’m giving you exactly what to do, in order, with the minimum viable logic.

⭐ 1) PRIORITY RANKING (impact → effort → ship‑today feasibility)
#1 — (b) Wrap ONLY top‑level <section>s into 1‑col rows

Impact: 70%  
Effort: Medium  
This is the single biggest fidelity win you can ship today.

One wrapper per <section>

Apply the section’s captured _style (bg + padding + align)

Put your existing leaf blocks inside

No recursion

No flex/grid detection

No columns

No deep tree walking

This alone restores the “banded” look of modern sites (hero → features → CTA → testimonials → footer).

#2 — (a) Parse HSL CSS vars → theme palette

Impact: 20%  
Effort: Tiny  
Do it.

Convert --primary: 222 47% 11% → hex

Set theme.colors.primary

Makes imported sites instantly “on‑brand”

Helps editor color pickers

Zero risk

#3 — (d) System/user style split

Impact: 5% today  
Effort: Medium  
Defer.

You don’t need it for “looks right + editable”.
Just don’t re-import over existing pages for now.

#4 — (c) Full recursive flex/grid → columns

Impact: 5% today  
Effort: Large  
Defer to v2.

This is the “correct” long‑term solution, but not needed for a faithful MVP.

⭐ 2) Is (b) enough for 80% fidelity?

YES. Absolutely.

Modern marketing sites are structured like:

Code
Copy
<section>  hero
<section>  features
<section>  CTA band
<section>  testimonials
<section>  gallery
<section>  pricing
<section>  FAQ


If you wrap each <section> as a row with:

background color

vertical padding

contentWidth (full or boxed)

alignment

…you instantly restore the visual rhythm of the site.

Cheap heuristic for wrapping:

Wrap a <section> if:

it has background-color != transparent, OR

it has padding-top or padding-bottom ≥ 40px, OR

it is a direct child of <main>

This gives you 80% fidelity with almost no logic.

⭐ 3) FAST shortcut for body import

Yes — use this:

Shortcut: wrap each direct <section> child of <main> as a row, then run your existing htmlToSections on its children.

Pseudo:

Code
Copy
for each <section> in main.children:
    row = createRow()
    row._style = captured section style
    row.children = htmlToSections(section.children)


No deep DOM walking.
No flex/grid detection.
No column inference.
No recursion.

This is the fastest path to “looks right”.

⭐ 4) Editing concerns — are leaf blocks already editable?

YES — if they are already standard block types with _style, they are fully editable.

Checklist to verify:

Each leaf block maps to a known section type (heading, text, image, gallery, button, list, form, video).

Each block has content + _style.

No unknown block types.

No missing required fields in the schema.

No nested blocks inside blocks (your flattening already prevents this).

If all that is true, editing works out of the box.

The only thing that could break editing is:

A block type missing a required field

A block type not registered in the editor

A block type with invalid _style keys

But your current importer already avoids these.

⭐ 5) What to safely defer to v2

These can wait without hurting “looks right + editable”:

Full flex/grid → multi‑column detection

Deep recursion

System/user style split

Auto‑naming sections (“Features”, “CTA”, etc.)

Palette inference beyond primary/secondary

Smart contentWidth inference

Updating existing pages on re-import

Detecting “feature grids” vs “card lists”

Converting inline styles to theme tokens

Responsive breakpoint inference

None of these are required for a good MVP.

⭐ FINAL: Your 5‑step “SHIP TODAY” plan
1. Parse HSL CSS vars → theme palette

Tiny change, big brand fidelity.

2. Wrap each <section> under <main> into a 1‑col row

Apply section-level _style (bg + padding).
Put leaf blocks inside.

3. Use simple heuristics to decide wrapping

Wrap if bg != transparent OR paddingY ≥ 40px OR direct child of <main>.

4. Keep leaf blocks exactly as they are

They’re already editable.
No schema changes needed.

5. Defer everything else

No recursion.
No columns.
No system/user style split.
No re-import logic.

Ali — this is the fastest possible path to a faithful, editable import that looks right today.
Implement steps 1–5 and you’ll have a shockingly good importer by end of day.

Edit in a page