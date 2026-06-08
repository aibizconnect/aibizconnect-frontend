See my thinking

You’re thinking about this exactly at the right level. Short version: the architect’s “Hybrid (C)” ruling is right, and your current bridge gives you enough signal to do this cleanly without turning the editor into a div soup.

Here’s my decisive take, question by question.

1) Container-structure pass

Recommendation:  
Do a hybrid container pass:

Top-level bands → rows

Treat any top-level <section> or full-width block-level container (div with display:flex|grid|block and width ~100%) as a row.

That row gets the band’s _style (padding, bg, align, contentWidth).

Inner layout → columns

For containers inside that band with display:flex|grid and multiple children, emit columns with colStyles (basis, gap, align).

Leaf nodes become your existing blocks (heading/text/image/etc).

Selective wrapping (Hybrid):

Always wrap when the container has:

non-default background

significant vertical padding (e.g. ≥ 32–40px)

a clear layout role (flex/grid with multiple children)

Skip wrapping for tiny utility wrappers (e.g. small padding, no bg, single child) to avoid over-nesting.

Depth:

Recurse 2–3 levels max:

Level 1: band row

Level 2: layout row (columns)

Level 3: leaf blocks

Beyond that, treat extra wrappers as noise unless they carry a strong visual signal (bg or big padding).

2) Width/centering (full-width band + inner container)

Recommendation:  
Model the outer band as the row, and infer contentWidth from the inner container:

Outer container (full-width, bg, big padding) →

row.contentWidth = 'full'

row._style.bg, row._style.pt/pb, etc.

Inner container (Tailwind container mx-auto, max-width) →

Set row.contentWidth = 'boxed' based on detected max-width.

You don’t need a second row; treat the inner container as layout metadata, not a separate block.

Heuristic:

If you see a child with max-width in the 960–1440px range and margin: 0 auto, treat that as the boxed width for the row and don’t emit it as its own row—just use it to set contentWidth.

3) Colors for Tailwind (CSS vars HSL)

Recommendation:  
Yes, parse the CSS vars into your theme palette.

Parse --primary: 222 47% 11% → HSL → hex → theme.colors.primary.

Do the same for secondary, accent, background, etc.

Use these as named palette entries in the theme, and still keep per-element computed colors as overrides.

Why:

It gives you a coherent brand palette for new sections/pages.

It makes the editor feel “native” to the imported brand.

You already have siteCustomCss for the raw vars; this just adds a structured layer.

4) Idempotency on re-import (don’t clobber tenant edits)

Recommendation:  
Introduce a system-style vs user-style split, and only reapply system styles on re-import.

Store _style as:

systemStyle (from importer)

userStyle (from editor)

Renderer resolves: effectiveStyle = { ...systemStyle, ...userStyle }.

On re-import:

You can safely update systemStyle without touching userStyle.

If a user has overridden a property (e.g. padding), their userStyle wins.

Optionally, mark blocks/rows as importedFromUrl with a version so you can show “Update from source” in the UI later.

If you don’t want to split fields, only apply styles on first import and never on re-import—but that kills the “refresh from source” story. The split is more powerful and still simple.

5) Risks of many nested rows

Performance:

A few extra rows/columns per band is fine.

The real risk is deep, meaningless nesting, not 2–3 levels of semantic structure.

Your current renderer + SectionSchema can handle this if you cap depth and avoid wrapping every tiny div.

Editor UX:

Too many anonymous rows will confuse users.

Mitigate by:

Naming rows based on content (“Hero”, “Feature grid”, “CTA band”) when possible.

Hiding “technical” rows in the editor if they only exist for layout and have no visible styling.

SectionSchema:

Ensure your schema explicitly supports:

row with contentWidth, _style

columns with colStyles

leaf blocks as children

As long as you stay within that shape, nested rows are safe.

Direct answer to your synthesis

Architect said: Hybrid, computed-style whitelist, websites.custom_css store, don't overwrite tenant edits, detect flex/grid → row+colStyles.

My view aligns:

Hybrid container detection (wrap meaningful bands + layout, skip noise).

Computed-style whitelist (you already have it; extend to rows/columns).

Custom CSS stored once (you’re doing this).

Don’t overwrite tenant edits → implement system vs user style or first-import-only.

Detect flex/grid → row+colStyles → yes, with 2–3 level recursion cap and heuristics for when to emit columns.

If you implement it this way, you’ll get high-fidelity, editable, and not over-nested imports that feel like they were built natively in your system.

Edit in a page