Builder → Copilot. STRATEGIC DECISION needed. Be opinionated; pick ONE path and justify.

# Situation
We've spent significant effort hand-building a drag-and-drop website editor inside our Next.js 16 / React 19 app. It works but we keep hitting papercuts (non-editable sealed sections, global-save bug, button-icon, panel UX) and Ali is frustrated/burned out. Core goal: produce LUXURY-but-CONTEMPORARY, fully EDITABLE websites — ideally AI-generated then user-editable.

# What we already have (sunk + working)
- Section model: zod schemas (lib/sections/schemas.ts) — rows (1–12 cols), elements (heading/text/button/image/menu/etc.), `_style` (ElementStyle: spacing/bg/radius/shadow/bgImage/responsive/anim) applied by SectionView. Nested in-column editing. Layers panel.
- Importer: lib/sites/html-importer.ts (HTML → our editable section model), style-capture (data-cs computed styles), theme-importer, chrome-importer (header/footer→global), render bridge for SPA.
- Design DNA (lib/sites/design-dna.ts): curated aesthetics (theme + per-archetype styling) for from-scratch builds.
- Prebuilt Sections library (GHL-style category browser + floating preview), Saved/Global sections, Media Library on R2, multi-tenant, theme tokens (--abc-*), in-app dialogs.

# New options discovered
1. **Google Stitch (MCP, Gemini 3)** — generate_screen_from_text + design systems (60+ fonts, tokens) + variants. A real AI design engine. Likely emits HTML we can run through our importer → editable sections. = keep our editor, outsource the TASTE.
2. **Puck** (open-source, React/Next-native) — embeddable visual editor, exports clean JSON schema (close to our section model). Could replace our hand-built editor with a maintained one.
3. **GrapesJS Studio SDK** — embeddable editor with built-in AI URL-cloning (paste URL → editable template), drag-drop, HTML/CSS export. Mature.
4. **Plasmic** — visual CMS, imports HTML, React.
Market refs (TeleportHQ/Readdy/Webflow AI/Mobirise) all do prompt→modular editable sections + chat edits ("add a services section").

# Decision to make
Pick the best path to "AI-generated, fully editable, luxury sites" with the LEAST further pain, given our stack and sunk work:
- (A) Keep our editor; add Stitch (AI design) → our HTML importer → editable sections. Reuses everything. Risk: our editor's long tail of bugs remains ours to fix.
- (B) Adopt Puck as the editor; migrate our section schema → Puck JSON; keep Stitch for design + our importer to seed Puck. Risk: migration cost, re-plumbing save/publish/theme/multi-tenant.
- (C) Embed GrapesJS Studio SDK (has AI clone) — least custom editor code, but HTML/CSS model differs from our token/theme/section system; multi-tenant + R2 media + our theme need integration.
- (D) Hybrid: Stitch for design now (quick win), evaluate Puck migration in parallel as the longer-term editor.

# Questions
1. Which option (A/B/C/D) and WHY — weigh sunk cost vs long-term maintenance vs time-to-"nice editable site".
2. If B/C, realistic migration scope against our zod section model + SectionView + multi-tenant save/publish + R2 media + --abc theme tokens? What breaks?
3. Concrete FIRST step that gives Ali a visible win this session.
4. Any reason NOT to lean on Stitch as the design brain regardless of editor choice?

Give a single recommendation + a short migration/integration outline + first step.
