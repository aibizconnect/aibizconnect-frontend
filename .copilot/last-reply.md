Short answer:  
Yes — your proposal is 100% correct, and it fixes the exact root cause of Ali’s bad result.
The old wizard must be fully deprecated, and the new AI‑first, Supervisor‑verified pipeline must become the only creation path.

Below is the full ruling with the missing pieces you asked me to flag.

✅ The Correct Fix (Approved)
1. Deprecate the old wizard entirely

The old flow is architecturally incompatible with:

real brand extraction

multi‑page learning

atomic block generation

Supervisor verification

tenant‑scoped assets

It will always produce:

wrong logo

wrong colors

wrong fonts

generic content

single‑page fallback

So yes — route all creation through the new pipeline.

🎨 2. Step 1a MUST extract real brand assets

This is essential. The extraction must include:

Primary logo (header <img>, SVG/PNG/JPG)

Secondary logo (footer, alt versions)

Favicon / apple-touch-icon

OpenGraph image

Brand colors (CSS vars, inline styles, computed styles)

Brand fonts (Google Fonts, @font-face, CSS stack)

Rules:

If multiple logos exist → pick the header logo as canonical.

If the logo is SVG → store raw SVG + raster fallback.

If colors conflict → pick the dominant + accent colors.

If fonts conflict → pick the primary body font + primary heading font.

Never:

Never use the platform’s AIBizConnect logo.

Never use placeholder colors.

Never use template fonts.

🧱 3. Lean build MUST use learned brand + learned content

This is the entire point of the new pipeline.

The lean build (Home + Contact + Offer) must be generated from:

Step 1a → business analysis + brand

Step 1b → real main pages

Step 1c → atomic blocks

Step 2 → page tree

The build must NOT use:

template placeholders

stock lorem ipsum

platform logos

generic hero images

default CTA text

The build MUST use:

learned logo

learned colors

learned fonts

repurposed blocks

real business voice

real services

real CTAs

This is the only way to guarantee a professional, tenant‑specific result.

🆘 4. If no logo is found

This is the correct fallback:

Use a text wordmark of the business name

Do NOT use the platform logo

Do NOT invent a logo

Do NOT hallucinate a brand

This keeps the build clean and avoids brand contamination.

🔍 Missing considerations (you asked me to flag them)
A. Multi‑logo conflict resolution

If a site has:

header logo

footer logo

dark/light variants

mobile variant

You must store all, but select one canonical for the build.

B. Transparent vs non‑transparent logos

If the logo has a white background:

detect it

offer a transparent version if available

otherwise keep original

C. Minimum resolution

Reject logos under 200px width unless SVG.

D. Color extraction accuracy

Use:

CSS variables

computed styles

dominant color extraction from hero

fallback to header background

E. Font fallback logic

If the site uses:

Google Fonts → easy

system fonts → pick the first non‑generic

custom @font-face → store the name only

F. Asset storage

Logos must be stored in:

tenant‑scoped media library

not the system library

📘 DECISION‑LOG (for the Builder)

Decision:  
Deprecate the old wizard. All website creation must route through the new AI‑first, Supervisor‑verified pipeline.

Brand Extraction:  
Step 1a must extract real logos, colors, and fonts. Never use platform defaults.

Lean Build:  
Home + Contact + Offer must use learned brand + repurposed blocks, not templates.

Fallback:  
If no logo is found, use a text wordmark. Never use AIBizConnect’s logo.

Additional Requirements:  
Handle multi‑logo conflicts, transparency, resolution, color accuracy, font fallbacks, and tenant‑scoped storage.

If you want, I can now generate the full Step 1a brand‑extraction spec or the lean build assembly spec.

Edit in a page