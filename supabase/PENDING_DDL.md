# PENDING DDL — run-in-SQL-editor ledger

Durable record of every database change Claude needs Ali to apply. Updated
whenever new DDL is introduced. Items stay listed until Ali confirms applied.

> Fastest path: re-run **`supabase/APPLY_ALL.sql`** (idempotent — safe to re-run).
> It already consolidates every REQUIRED migration below. The only thing it does
> NOT cover is the Storage bucket (item B) and the review-only DROP (item C).

Last updated: STEP 33 — SCHEMA CONFIRMED COMPLETE by Ali.

> ✅ SCHEMA COMPLETE THROUGH STEP 33. Ali confirmed all tables, columns,
> indexes, and RLS policies enumerated for STEP 33 exist in the live DB.
> Do NOT regenerate or re-ask for the consolidated DDL below — it's applied.
> Only items added AFTER this line (future steps) are pending.

---

## A) Required migrations (all folded into APPLY_ALL.sql) — ✅ APPLIED

Confirmed applied by Ali as of STEP 33:

- [x] `0000_base_website_tables.sql` — website_pages, website_page_sections, website_brand_settings
- [x] `0002_phaseA_published_slug.sql` — website_pages.is_public + UNIQUE(tenant_id, slug)
- [x] `0003_phaseA_rls_policies.sql` — enable RLS + interim-permissive + public_read policies (targets website_page_sections)
- [x] `0005_phaseA_published_at.sql` — website_pages.published_at
- [x] `0006_website_navigation.sql` — website_navigation table
- [x] `0007_website_section_templates.sql` — website_section_templates table
- [x] `0009_page_seo_fields.sql` — website_pages SEO columns
- [x] `0010_page_settings.sql` — website_pages.is_hidden, redirect_url
- [x] `0011_website_media.sql` — website_media table
- [x] `0012_page_drafts.sql` — website_pages.draft_title, draft_slug, draft_seo, draft_sections
- [x] `0013_theme_tokens.sql` — website_brand_settings.theme jsonb
- [x] `0014_global_blocks.sql` — website_global_blocks + website_page_block_refs tables
- [x] `0015_navigation_v2.sql` — website_navigation.menu_key + draft_* + index
- [x] website_pages.order_index + is_home (one-off fix)

## B) Non-migration infrastructure (dashboard — NOT covered by APPLY_ALL)

- [ ] Create Supabase **Storage bucket `website-media`** (public read) + storage
      policies allowing insert/delete. Required by the Media library (STEP 27).
      Uploads fail until this exists.

## C) Review-only / DO NOT run unless decided

- [ ] `0008_retire_step18_templates.sql` — DROP statements for the retired STEP 18
      template tables. Statements are COMMENTED OUT; only apply after you decide to
      permanently drop website_templates / website_template_pages / _sections /
      _brand_settings. Not required for the app to work.

## NOT introduced (excluded on purpose)

- `0001_website_templates.sql` and `0004_phaseA_clone_rpc.sql` — the retired STEP 18
  "Kits" system. Excluded from APPLY_ALL. Do not run unless you specifically want
  those legacy tables/function.
- STEP 33 (sitemap.xml / robots.txt) — code only, no DDL.

---

## =========================================================
## DDL QUEUE (awaiting apply) — added after STEP 33
## =========================================================
## New DDL from future steps lands here as unchecked items. Nothing below is
## assumed applied.

> Fastest path for the items below: run **`supabase/APPLY_0079_0080.sql`** (idempotent).

- [x] `0079_tenant_billing.sql` — platform SUBSCRIBER billing on `tenants`: adds
      `billing_status`, `trial_ends_at`, `current_period_end`, `monthly_amount_cents` (+ backfills
      14-day trials and comps the platform tenant). Powers /platform → Subscribers.
      **✅ APPLIED 2026-06-19 (Ali ran it — verified live).**
- [x] `0080_subscriptions.sql` — general tenant SUBSCRIPTIONS: new tables `subscription_plans`
      (per-tenant plan levels) + `tenant_subscriptions` (a contact on a plan). Powers Payments →
      Subscriptions/Orders/Recurring. (Coupons uses the existing `tenant_coupons` from 0058.)
      **✅ APPLIED 2026-06-19 (Ali ran it — verified live).**

---

## PROTOCOL (binding)
1. Whenever Claude generates ANY DDL (new table/column/index/constraint/RLS
   policy/function, or required infra like a storage bucket), Claude APPENDS it
   to the DDL QUEUE above — before reporting the step done — and delivers the
   file as a clickable attachment.
2. Claude then WAITS. Claude does not assume the DDL is applied.
3. When Ali says "Check in", Claude presents the full current DDL QUEUE.
4. DDL is only marked applied (`[ ]` -> `[x]`, moved out of the queue) when Ali
   says "Done" (for specific items) or "all done". Until then it stays queued.
5. The "SCHEMA COMPLETE THROUGH STEP 33" block above is frozen and never
   regenerated or re-asked.
