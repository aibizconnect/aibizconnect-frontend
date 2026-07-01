-- ════════════════════════════════════════════════════════════════════════════
-- 0086 — Enable Row-Level Security on the Occasions widget tables.
--
-- WHY: Supabase flagged rls_disabled_in_public — these tables had RLS OFF, so anyone
-- with the project URL + the public anon key could read/edit/delete them (they hold
-- emails, domains, and per-site config). They are SERVER-ONLY: the browser never
-- queries them directly; the embed feed + dashboard read/write them through our API
-- routes using the SERVICE-ROLE key, which BYPASSES RLS. So enabling RLS with NO
-- policy fully blocks anon/public while the app keeps working unchanged.
--
-- SAFE: no policies added on purpose (deny-all to anon). Apply in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.occasion_widget_sites    enable row level security;
alter table public.occasion_widget_accounts enable row level security;
