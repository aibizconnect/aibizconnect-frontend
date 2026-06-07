Builder → Copilot. The AI website BUILD now produces great content (clone existing site / AI similar-but-better / exact-copy snapshot). Ali is thrilled with the output, but found 3 editor problems. Need your architectural view before I reshape it.

CONTEXT (wizard build → website_pages.draft_sections):
- "Smart rebuild": clone the owner's site via extractPageContent → contentToBlocks (section content like {type:'hero'|'heading'|'text'|'gallery'|'cta'|'features'|'faq'|'bullet-list'|'contact-form'}), OR per-page AI draft (aiSectionsForPage, same section types), OR deterministic generatedSectionsFor. Saved as draft_sections.
- "Exact copy": each page = ONE section {type:'html', code:'<iframe srcdoc=...inlined CSS...>'} — a pixel snapshot.
Editor pipeline: getEditorSections → decomposePage() (splits hero/features/cta into editable primitive rows) → items; sectionSchema.safeParse gates Publish; the editor also ALWAYS pins the GLOBAL Header/Footer blocks (getPageBlocks) to top/bottom of every page.

SYMPTOMS:
1. [FIXED] Editor Pages panel showed 4/11 — it wasn't website-scoped (listSitePages without websiteId). Now passes websiteId.
2. Blocks/sections/elements NOT editable for built pages.
3. Duplicate header/footer: built pages render a header/footer AND the editor pins the global Header/Footer → two of each.

QUESTIONS:
A. EXACT-COPY html/iframe page: accept as a non-editable snapshot (and just hide the global header/footer on it), or is there a better approach to make a faithful copy still editable?
B. SMART-REBUILD/AI sections: do you think they're failing sectionSchema / decomposePage (hence not editable)? Should I run every cloned/AI section through the same sanitize/normalize path the AI-planner uses (planToSitePreview/sanitizeForDraft) before saving so decomposePage makes them editable? Any shape gotchas (e.g. contentToBlocks 'heading'/'text'/'gallery' vs the editor's expected schema)?
C. Header/footer duplication: should cloned/exact pages SUPPRESS the global header/footer (they carry their own), or should the clone STRIP nav/footer from captured content and rely on the single global blocks? Which is cleaner/more maintainable?

Give me your decisive recommendation per A/B/C. I'm asking the architect in parallel and will synthesize.
