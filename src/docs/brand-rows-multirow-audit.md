# Audit: multi-row `website_brand_settings` (fonts / widths / settings)

Date: 2026-06-05 (autonomous QA pass while Ali away)

## The schema reality (migration 0019)
`website_brand_settings` allows **one row per (tenant_id, website_id)** — unique index
`website_brand_settings_tenant_website_uidx (tenant_id, website_id) WHERE website_id IS NOT NULL`.
So a tenant with several websites has several brand rows. The 0017 backfill tagged the
original single row with the primary website.

## What this broke (all now fixed)
Code that read the brand by **tenant_id only** + `.single()` / `.maybeSingle()`:
- `.single()` → **throws** on >1 row → brand becomes `null`.
- `.maybeSingle()` → returns **null** on >1 row.

Effects seen:
1. **Fonts didn't pre-load** (had to open Typography) — the editor picked one row and lost the
   heading font that lived on another row; the base heading rule fell back to Inter.
2. **Random element widths in preview** — `SitePreviewDocument` + published site used `.single()`,
   so brand was null → wrong theme → boxed columns mis-sized. (Also a separate grid-item
   `width:100%` fix in `element-style.ts`.)
3. **Settings/occasions/background risk** — `getSiteSettings` / `getSiteBackground` and the
   `saveTypography` / `saveSiteSettings` / `saveSiteBackground` / `updateTheme` merge-reads
   nulled on >1 row, so a save could **wipe** theme keys living on another row.

## Fixes applied (safe, no write-semantics change)
- `lib/sections/theme.ts` → new `mergeBrandRows()` (unions font columns + customFonts across rows).
- `actions.ts` → new server `readTenantTheme()` (deep-merges every row's `theme` jsonb). Wired into
  `getTheme` fallback, `getSiteSettings`, `getSiteBackground`, `saveTypography`,
  `saveSiteSettings`, `saveSiteBackground`, `updateTheme`, brand-context getter.
- Client reads using `mergeBrandRows`: `Canvas.tsx`, `builder/page.tsx`, `ToolbarPanels.tsx`,
  `BrandPanel.tsx`, `SitePreviewDocument.tsx`, `sites/[slug]/page.tsx`.

## STILL OPEN — needs Ali + Copilot ruling (Option A vs B)
The **tenant-only `upsert({ tenant_id, theme })`** writes have NO `website_id`. They cannot
conflict-match the partial unique index, so each one risks **INSERTing a new `website_id=null`
duplicate row** rather than updating in place — the likely source of the duplicate rows.

Two ways forward:
- **Option A (correct, bigger):** thread `websiteId` into every theme read/write so each website
  reads/writes its OWN row (`.eq("website_id", websiteId)`), like `getTheme(tenantId, websiteId)`
  already does. Eliminates duplicates and any cross-website bleed.
- **Option B (resilient fallback, shipped now):** keep the merge-reads above so nothing nulls/wipes,
  and additionally make the tenant-level writes UPDATE the existing row **by id** (read rows → pick
  one → `update().eq("id", …)`) instead of blind upsert, to stop new-row creation.

I did NOT change the write/upsert targeting autonomously (risk of cross-website blend + the
Option A/B decision is pending). Reads are hardened; writes still use the original upsert.

Recommendation: do **A** for the long term; **B**'s "update-by-id" tweak is a safe stopgap if A
isn't done soon. Awaiting Ali/Copilot.
