-- Phase A: RLS for the website-builder tenant tables
-- Apply manually (supabase db push / SQL editor).
--
-- ============================================================================
-- AUTH MODEL (IMPORTANT)
-- ----------------------------------------------------------------------------
-- This app does NOT use Supabase Auth. Authentication and tenant scoping are
-- enforced by a CUSTOM JWT (token cookie / localStorage) against an EXTERNAL
-- backend at NEXT_PUBLIC_API_URL. tenant_id here is a TENANT ENTITY id (with a
-- multi-user-per-tenant membership model), NOT a Supabase auth.uid().
--
-- Because there is no Supabase session, auth.uid() is NULL inside Postgres.
-- Therefore any RLS policy of the form `auth.uid() = tenant_id` would deny ALL
-- tenant reads/writes and lock the editor out. We deliberately do NOT use
-- auth.uid() here.
--
-- INTERIM POSTURE (this phase):
--   * RLS is ENABLED, but tenant operations use PERMISSIVE policies
--     (USING (true) / WITH CHECK (true)) so the editor keeps working exactly
--     as before via the anon/publishable key.
--   * Real tenant isolation is enforced UPSTREAM by the external backend + JWT,
--     not by Postgres RLS, for now.
--   * public_read_* policies below describe the eventual public surface and are
--     already correct; when we later introduce proper JWT-claim-based tenant
--     policies, we DROP the *_interim_open policies and replace them — the
--     public_read_* policies can stay.
--
-- DRAFT HIDING: until tenant RLS is real, "only published pages are public" is
-- ALSO enforced at the application layer (app/sites/.../page.tsx calls
-- notFound() when is_public is false). Do not treat the DB as the sole gate yet.
--
-- DEFERRED TO A FUTURE PHASE: tenant-scoped RLS driven by verified JWT claims
-- (request.jwt.claims / a SECURITY DEFINER verifier), OR moving all
-- website-builder mutations behind the external backend.
-- ============================================================================

-- Enable RLS
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_brand_settings ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so the migration is re-runnable
DROP POLICY IF EXISTS pages_interim_open ON website_pages;
DROP POLICY IF EXISTS sections_interim_open ON website_page_sections;
DROP POLICY IF EXISTS brand_interim_open ON website_brand_settings;
DROP POLICY IF EXISTS public_read_pages ON website_pages;
DROP POLICY IF EXISTS public_read_sections ON website_page_sections;
DROP POLICY IF EXISTS public_read_brand ON website_brand_settings;

-- ----------------------------------------------------------------------------
-- INTERIM PERMISSIVE POLICIES (keep the app working; NOT real isolation)
-- Replace these with JWT-claim-based tenant policies in a future phase.
-- ----------------------------------------------------------------------------
CREATE POLICY pages_interim_open ON website_pages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY sections_interim_open ON website_page_sections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY brand_interim_open ON website_brand_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- PUBLIC READ SURFACE (the part that is genuinely meaningful now)
-- These describe the eventual published-content surface. Under the interim
-- permissive policies above they are redundant, but they remain correct once
-- the *_interim_open policies are removed/tightened.
-- ----------------------------------------------------------------------------
CREATE POLICY public_read_pages ON website_pages
  FOR SELECT USING (is_public = true);

CREATE POLICY public_read_sections ON website_page_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM website_pages p
      WHERE p.id = page_id AND p.is_public = true
    )
  );

-- Brand settings are safe to read publicly
CREATE POLICY public_read_brand ON website_brand_settings
  FOR SELECT USING (true);
