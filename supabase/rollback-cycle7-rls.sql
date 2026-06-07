-- ============================================================================
-- ROLLBACK Cycle 7 RLS — restore the interim-open policies so the editor works.
--
-- WHY: the Cycle 7 policies use claim_tenant() = tenant_id, but the app sends no
-- tenant claim to Postgres (anon key), so claim_tenant() = NULL and EVERY tenant
-- read/write is denied. This reverts to the prior interim-open posture.
--
-- HOW TO RUN: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (drop ... if exists + create). No data is touched.
-- ============================================================================

drop policy if exists tenant_rw_pages on website_pages;
create policy pages_interim_open on website_pages
  for all using (true) with check (true);

drop policy if exists tenant_rw_sections on website_page_sections;
create policy sections_interim_open on website_page_sections
  for all using (true) with check (true);

drop policy if exists tenant_rw_brand on website_brand_settings;
create policy brand_interim_open on website_brand_settings
  for all using (true) with check (true);

drop policy if exists tenant_rw_nav on website_navigation;
create policy nav_interim_open on website_navigation
  for all using (true) with check (true);

drop policy if exists tenant_rw_global_blocks on website_global_blocks;
create policy global_blocks_interim_open on website_global_blocks
  for all using (true) with check (true);

drop policy if exists tenant_rw_block_refs on website_page_block_refs;
create policy page_block_refs_interim_open on website_page_block_refs
  for all using (true) with check (true);

drop policy if exists tenant_rw_section_templates on website_section_templates;
create policy section_templates_interim_open on website_section_templates
  for all using (true) with check (true);

drop policy if exists tenant_rw_media on website_media;
create policy media_interim_open on website_media
  for all using (true) with check (true);

-- The Cycle 8 version tables already use *_interim_open policies, so they are
-- unaffected and need no change here.
