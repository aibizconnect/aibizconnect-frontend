-- Step 27: tenant-scoped media library.
-- Apply manually (supabase db push / SQL editor).
--
-- ⚠️ STORAGE DEPENDENCY (cannot be provisioned from app code): create a
-- Supabase Storage bucket named "website-media" (public read) with policies
-- that allow the app's role to INSERT/DELETE objects. Uploads will fail until
-- this bucket + policies exist. See the Supabase dashboard → Storage.
--
-- NOTE: storage_path is added beyond Copilot's listed columns because we need
-- the object path to delete the underlying storage file in deleteMedia().

create table if not exists public.website_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  url text not null,
  storage_path text not null,
  filename text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_website_media_tenant
  on public.website_media (tenant_id);

alter table public.website_media enable row level security;

drop policy if exists media_interim_open on public.website_media;
create policy media_interim_open on public.website_media
  for all using (true) with check (true);
