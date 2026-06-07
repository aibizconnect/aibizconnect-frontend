The request for secured per-tenant media storage is critical. Here is the phased plan and data model to achieve this, ensuring no disruption to currently published sites.

---
### Phase 0: Data Model & Initial Setup (Migration)

**RULING 9: SQL Migration for `media_folders` and `website_media` updates**

```sql
-- Migration 0030_secure_media_storage.sql

-- 1. Create media_folders table
CREATE TABLE IF NOT EXISTS public.media_folders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic
    parent_folder_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
    name text NOT NULL,
    path text NOT NULL, -- e.g., 'root/images/logos', unique per tenant
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, path)
);
CREATE INDEX IF NOT EXISTS idx_media_folders_tenant_id ON public.media_folders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_folders_parent_id ON public.media_folders (parent_folder_id);
-- RLS policies will be added in a later phase if required.

-- 2. Update website_media table
ALTER TABLE public.website_media
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT TRUE, -- New uploads are private by default
ADD COLUMN IF NOT EXISTS public_url text; -- URL for publicly served assets (if is_private is false)

-- 3. Data migration for existing website_media records:
--    - Assume existing records in 'website-media' bucket are for published sites or were public by default.
--    - Mark them as NOT private and set their public_url to their existing Supabase Storage URL.
--    - This step requires careful execution to ensure existing URLs are correctly formed.
--    - This UPDATE should be run *after* the schema changes and *before* new uploads.
--    - Example assuming existing file_path is the full path within the 'website-media' bucket:
--      UPDATE public.website_media
--      SET
--          is_private = FALSE,
--          public_url = 'https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/storage/v1/object/public/website-media/' || file_path
--      WHERE public_url IS NULL; -- Only update records that haven't been processed
--      -- NOTE: The actual base URL for Supabase Storage needs to be dynamically inserted or configured.
--      -- Builder: Ensure this UPDATE statement is correctly adapted for the project's Supabase URL.

-- 4. Create a root folder for each existing tenant
--    This ensures all existing media can be associated with a folder.
INSERT INTO public.media_folders (tenant_id, name, path)
SELECT DISTINCT tenant_id, 'root', 'root'
FROM public.website_media
ON CONFLICT (tenant_id, path) DO NOTHING;

-- 5. Associate existing media with their root folder
UPDATE public.website_media wm
SET folder_id = mf.id
FROM public.media_folders mf
WHERE wm.tenant_id = mf.tenant_id AND mf.path = 'root' AND wm.folder_id IS NULL;
```

**Setup Steps (Manual/Infra):**
*   **S0-1:** Create a **new Supabase Storage bucket** named `aibizconnect-private-media`. Set its security policy to **private**.
*   **S0-2:** The **existing `website-media` bucket** will be repurposed as the new **`aibizconnect-public-media` bucket**. Its security policy must remain **public**.

**Supervisor Verification Checks for Phase 0:**
*   **P0-V1:** Confirm `public.media_folders` table exists with `id`, `tenant_id`, `parent_folder_id`, `name`, `path` columns (types and constraints as specified).
*   **P0-V2:** Confirm `public.website_media` table has new columns `folder_id` (FK to `media_folders`), `is_private` (boolean, default TRUE), and `public_url` (text).
*   **P0-V3:** Verify the `UPDATE` statement for existing `website_media` records correctly sets `is_private = FALSE` and populates `public_url` with the correct public URL for *all pre-existing* media.
*   **P0-V4:** Verify a `media_folders` entry with `name='root'` and `path='root'` exists for every tenant with existing media.
*   **P0-V5:** Verify all pre-existing `website_media` records are associated with their respective `root` `folder_id`.
*   **P0-V6:** Confirm a new Supabase Storage bucket `aibizconnect-private-media` exists and is configured as **private**.
*   **P0-V7:** Confirm the existing `website-media` bucket (now `aibizconnect-public-media`) remains configured as **public**.

---
### Phase 1: Private Uploads & Dashboard Access

**Implementation Steps:**
*   **P1-1:** Modify the media upload API/logic to target the `aibizconnect-private-media` bucket by default.
*   **P1-2:** Update the `website_media` record upon upload: `is_private = TRUE`, `public_url = NULL`, `folder_id` set to the selected folder (or `root` if none specified).
*   **P1-3:** Implement a server-side utility function (e.g., `getSignedUrl(bucketName, filePath, expiresIn)`) using the Supabase service-role client.
*   **P1-4:** Modify the `listMedia` API endpoint (used by the dashboard/editor) to:
    *   Retrieve `website_media` records for the given `tenant_id` and `website_id`.
    *   For records where `is_private = TRUE`, generate a **short-lived (e.g., 5-15 minutes) signed URL** using the `aibizconnect-private-media` bucket.
    *   For records where `is_private = FALSE`, return the `public_url` directly.
    *   Return these URLs in the API response.
*   **P1-5:** Update the dashboard/editor UI to consume these signed/public URLs for displaying media.

**Signed URL Strategy:**
*   **Expiry:** 5-15 minutes. This is sufficient for a user to view/select media within the editor session.
*   **Generation:** Server-side only, using the Supabase service-role client.
*   **Caching:** Signed URLs should not be aggressively cached by the client, as they expire. The browser's default cache for images will apply for the duration of the signed URL.

**Supervisor Verification Checks for Phase 1:**
*   **P1-V1:** Verify new media uploads are successfully stored in the `aibizconnect-private-media` bucket.
*   **P1-V2:** Verify `website_media` records for new uploads have `is_private = TRUE` and `public_url IS NULL`.
*   **P1-V3:** Verify `listMedia` API returns signed URLs for private media (e.g., `https://<project_ref>.supabase.co/storage/v1/object/sign/aibizconnect-private-media/...`).
*   **P1-V4:** Verify signed URLs expire after the specified duration (e.g., 10 minutes).
*   **P1-V5:** Verify `listMedia` API returns direct `public_url` for media where `is_private = FALSE`.
*   **P1-V6:** Verify media displays correctly in the dashboard/editor for both private (via signed URL) and public assets.
*   **P1-V7:** Attempt to access a private media item directly via its *unsigned* `aibizconnect-private-media` URL; verify it returns an access denied error.

---
### Phase 2: Publish Flow Integration

**Implementation Steps:**
*   **P2-1:** Modify Step 7 (Publish) logic:
    *   Identify all `website_media` assets *currently used* by the `website_page_tree` for the website being published.
    *   For each *used* asset where `is_private = TRUE`:
        *   **Copy the file** from `aibizconnect-private-media` to `aibizconnect-public-media` using the Supabase service-role client. The `file_path` should remain consistent.
        *   Update the corresponding `website_media` record: set `is_private = FALSE` and populate `public_url` with the new public URL (e.g., `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/storage/v1/object/public/aibizconnect-public-media/` + `file_path`).
*   **P2-2:** Update the website rendering engine to use `website_media.public_url` for all images and media assets on published sites.

**Supervisor Verification Checks for Phase 2:**
*   **P2-V1:** Publish a new website containing newly uploaded (private) media.
*   **P2-V2:** Verify that all media files used on the published site are copied to the `aibizconnect-public-media` bucket.
*   **P2-V3:** Verify corresponding `website_media` records have `is_private = FALSE` and `public_url` correctly set.
*   **P2-V4:** Verify the live, published website correctly displays all its media using the `public_url`.
*   **P2-V5:** Verify direct access to the `public_url` of these assets works without authentication.
*   **P2-V6:** Verify that media *not* used on the published site remains in the `aibizconnect-private-media` bucket and is not publicly accessible.
*   **P2-V7:** Publish an *existing* website (from before this migration); verify its media continues to render correctly via their existing `public_url`s.

---
### Phase 3: RLS Implementation (Future-proofing)

**Rationale:** Given the service-role client bypasses RLS, these policies primarily protect against accidental data exposure if a user-level Supabase client were ever introduced, or for direct database access by non-superadmin platform users. It's a lower priority but good practice.

**Implementation Steps:**
*   **P3-1:** Enable RLS on `public.media_folders` and `public.website_media`.
*   **P3-2:** Create RLS policies for `public.media_folders`:
    *   `CREATE POLICY "Tenants can view their own folders" ON public.media_folders FOR SELECT USING (tenant_id = auth.uid());`
    *   `CREATE POLICY "Tenants can manage their own folders" ON public.media_folders FOR ALL USING (tenant_id = auth.uid());`
*   **P3-3:** Create RLS policies for `public.website_media`:
    *   `CREATE POLICY "Tenants can view their own private media" ON public.website_media FOR SELECT USING (tenant_id = auth.uid() AND is_private = TRUE);`
    *   `CREATE POLICY "Tenants can manage their own media" ON public.website_media FOR ALL USING (tenant_id = auth.uid());`
    *   `CREATE POLICY "Public media is viewable by anyone" ON public.website_media FOR SELECT USING (is_private = FALSE);`

**Supervisor Verification Checks for Phase 3:**
*   **P3-V1:** As a non-tenant user (auth.uid() is NULL), verify only `is_private = FALSE` media records are visible via a user-level Supabase client.
*   **P3-V2:** As a tenant user, verify only their own `is_private = TRUE` media records and all `is_private = FALSE` records are visible.
*   **P3-V3:** As a tenant user, verify they can only insert/update/delete `website_media` and `media_folders` records where `tenant_id` matches their `auth.uid()`.

---
DECISION-LOG
[D-013] approve_secure_media_storage_plan — Approved phased plan for secure per-tenant media storage, including data model, bucket strategy, signed URLs, and RLS (status: approved)
[D-014] define_phase0_checks — Defined Supervisor verification checks for Phase 0 (Data Model & Initial Setup) (status: defined)
[D-015] define_phase1_checks — Defined Supervisor verification checks for Phase 1 (Private Uploads & Dashboard Access) (status: defined)
[D-016] define_phase2_checks — Defined Supervisor verification checks for Phase 2 (Publish Flow Integration) (status: defined)
[D-017] define_phase3_checks — Defined Supervisor verification checks for Phase 3 (RLS Implementation) (status: defined)