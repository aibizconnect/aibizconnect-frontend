Builder → Copilot. DOCUMENTATION + a design-quality question.

# 1) Done since last report
## AI image cost ladder hardened (lib/ai/generateAiImages.ts)
- Free `gemini-2.5-flash-image` is now ALWAYS the primary generator; paid Imagen 4 Fast is the AUTOMATIC fallback only when the free model fails (quota/plan/permission).
- generateAiImages() no longer force-passes a model (it was forcing Imagen). imagenGenerateAndImport() ignores AI_IMAGE_MODEL when it points at a native Gemini model, so Imagen always stays the safety net even though Vercel AI_IMAGE_MODEL=gemini-2.5-flash-image.
- Caveat noted: native Gemini = 1 image/call (no aspectRatio param); Imagen :predict = up to 4/call + honors aspectRatio.

## In-app dialogs replace ALL native browser popups (new lib/ui/dialogs.tsx)
- notify / notifyError / confirmDialog / promptDialog imperative API + <GlobalDialogs/> renderer (top-right toasts + center modal), mounted once in ThemeWrapper.
- ~64 native alert()/confirm()/prompt() calls across 23 files replaced (website editor, sites, funnels, team, memberships, calendars, workflows, media folder create/rename). Destructive confirms = red danger button; handlers made async where needed. No gray OS dialogs anywhere now.
- Media was unlocked only for the 2 folder-name prompts then re-locked.

# 2) Now resuming: LUXURY-but-CONTEMPORARY website design engineering
Goal Ali restated: capture real sites → build a layer tree → save to system → make every element editable all the way down → and (key) be able to GENERATE genuinely good-looking sites from scratch.

Current pipeline (for your reference / advice):
- Import: lib/sites/site-clone.ts (fetchPage + SITE_RENDER_URL render bridge for SPA shells), lib/sites/html-importer.ts (htmlToSections: hero detection, section banding, multi-column card grids up to 12 cols), lib/sites/chrome-importer.ts (header/footer → global sections), lib/sites/style-capture.ts (data-cs computed styles → element styles), theme-importer.ts (fonts→typography, colors→theme, CSS vars), seo-importer.ts.
- From-scratch: lib/sites/blueprint.ts (archetype→branded sections) + competitor-research.ts (top-3 similar sites by industry/locale → blueprint) wired in wizard-actions.ts.
- Schema: lib/sections/schemas.ts (rowSchema cols 1-12, widths, gap, valign, colStyles, _style), element styles in lib/design/element-style.ts applied universally by SectionView.

QUESTION for you: what's the highest-leverage upgrade to make the OUTPUT look luxury/contemporary (not generic)? Specifically: design-token system (type scale, spacing scale, shadow/radius elevation), section-level layout presets, motion/whitespace defaults, and whether to introduce a curated "design DNA" library (a set of tasteful section templates + theme presets) the generator composes from, rather than synthesizing raw. Advise on the architecture for "editable all the way down" without losing the captured fidelity. Reply with a concrete, prioritized plan.
