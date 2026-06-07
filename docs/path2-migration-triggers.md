# Path 2 Migration — When to Make Sections/Blocks First-Class

Path 1 (live now): the v1.0 agent format is normalized onto the proven engine.
Sections are page-scoped (live in `draft_sections`); `attachBlockToSection`
collapses to `attachBlockToPage`; `update*`/`list*` actions are deferred.

Migrate to Path 2 (first-class `website_sections` + section-scoped blocks) when
ANY TWO of these become true — or any ONE marked 🔴:

1. 🔴 **Reusable sections** — you need the same section shared across multiple
   pages (edit once, reflected everywhere). Page-level `draft_sections` can't do this.
2. 🔴 **Section-scoped blocks** — `attachBlockToSection` becomes a real product
   need (blocks nested inside sections, not just page footers/headers).
3. **Granular agent edits** — a Content/SEO/Brand agent needs to update ONE section
   without rewriting the whole page draft (Path 1 rewrites the page's draft_sections).
   i.e. when `updateSection` / `updateBlock` / `listSections` are actually used.
4. **Concurrent agents on one page** — multiple agents editing the same page at once;
   the page-level draft is a coarse lock and causes overwrite contention.
5. **Section-level versioning/rollback** — you want to roll back a single section,
   not the whole page (Cycle-8 versioning is page-snapshot today).
6. **Scale** — many tenants × many agents where the page-rebuild-on-publish model
   becomes a write-amplification bottleneck.

## What Path 2 entails (so it's a planned project, not a surprise)
- DDL (queued, staged, RLS-verified): `website_sections`, `website_section_blocks`.
- Rewrite the public renderer + `SectionView` to read first-class sections.
- Rewrite the draft/publish pipeline (`saveDraft`/`publishPage`) to section-level state.
- Rework Cycle-8 versioning to section granularity.
- Migrate existing live data (current tenant pages/sections) into the new model.
- Swap the normalizer for direct v1→engine execution (drop the page-accumulation hack).
- Re-run the supervised dry-run → live proof + the rls-test harness.

## Recommendation
Stay on Path 1 through: agent mesh (role-agents) + UI embedding. Trigger Path 2 the
moment #1 or #2 is needed, or when #3+#4 both show up in real usage. Do it as a
supervised migration (DDL queue → staging → data migration → proof), never a rushed
cutover.
