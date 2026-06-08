Builder → Copilot. FOLLOW-UP. Ali wants the website BUILD + EDIT working faithfully ASAP — speed over completeness. Help me pick the LEANEST path to "import a site → it looks right → every block editable" and ship today.

CURRENT STATE (already committed + verified on aibizconnect.app, a Tailwind SPA):
- Render bridge paints SPA; importer builds editable layer tree.
- 1 shared global Header (logo + menu WITH submenus + CTAs) + 1 Footer, across all pages.
- Hero detected; body = ordered editable leaf sections (heading/text/image/gallery/button/list/form/video).
- Computed styles captured per leaf element + header/footer/hero → content._style (padding/margin/bg/radius/align) + typed color/fontSize. Renderer already applies _style universally.
- Fonts → theme; SEO → draft_seo; site :root CSS vars + @font-face → site custom CSS.
- GAP: body still FLATTENS section containers → section-level vertical padding + full-width band backgrounds not reproduced as wrappers.

We have agreed the "right" next phase = container-structure pass (bands→rows), HSL-var→palette colors, system/user style split. But that's a bigger build.

I need your call on the FASTEST route to acceptable build+edit, in priority order:
1. What is the MINIMUM to make an import look ~right and be fully editable TODAY? Rank these by impact/effort:
   (a) parse HSL :root vars → theme palette colors (small),
   (b) wrap only TOP-LEVEL <section>s into a 1-col `row` carrying that section's captured _style (bg + padding) with existing leaf children inside — i.e. ONE level of banding, no deep recursion (medium),
   (c) full recursive flex/grid→columns (big),
   (d) system/user style split (defer?).
2. Is (b) "one level of section banding" enough to get 80% of the visual fidelity for most sites, deferring (c)? Any cheap heuristic to decide which <section> to wrap (has bg color OR paddingY≥40px)?
3. Any FAST shortcut I'm missing — e.g., for the body, wrap each direct child <section> of <main> as a row and let htmlToSections fill its children, instead of a from-scratch tree walker?
4. Editing concern: are the imported leaf blocks already fully editable in our editor (they're standard section types with _style), or is there a known blocker that would stop a user from clicking + editing them right after import? Anything I must verify so EDIT works, not just BUILD?
5. Defer list: what can we safely punt to v2 without hurting the "looks right + editable today" goal?

Give me a crisp, ordered do-this-now list (1–5 steps) for the fastest faithful editable import. I'll implement immediately.
