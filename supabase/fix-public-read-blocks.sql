-- FIX: restore public (anonymous) read of global blocks + their page refs.
-- After Cycle-7 RLS dropped the interim-open policies, these two tables had NO
-- public-read policy, so footers/global blocks vanished for anonymous visitors.
-- Global blocks are published site chrome (footers/headers) — safe to read
-- publicly, matching public_read_brand / public_read_nav (USING true).
--
-- Run in: Supabase SQL Editor.

drop policy if exists public_read_global_blocks on public.website_global_blocks;
create policy public_read_global_blocks on public.website_global_blocks
  for select using (true);

drop policy if exists public_read_block_refs on public.website_page_block_refs;
create policy public_read_block_refs on public.website_page_block_refs
  for select using (true);
