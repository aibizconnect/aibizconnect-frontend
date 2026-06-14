-- 0066 — Blog engine (D-345). GHL Sites → Blogs parity. Admin authoring at
-- /tenants/<id>/sites/blog; public reading at /sites/<tenantId>/blog[/<slug>] with
-- SEO meta + Article JSON-LD (GEO). Drafts-only-friendly: a post is private until published.
create table if not exists public.tenant_blog_posts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,
  website_id       uuid,                                 -- optional: owning website (theme/domain)
  title            text not null default 'Untitled post',
  slug             text not null,
  excerpt          text not null default '',
  cover_image_url  text,
  body             text not null default '',             -- plain text, blank-line paragraphs
  tags             jsonb not null default '[]'::jsonb,
  author           text,
  seo_title        text,
  seo_description  text,
  status           text not null default 'draft',        -- draft | published
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists tenant_blog_posts_slug_uidx on public.tenant_blog_posts (tenant_id, slug);
create index if not exists tenant_blog_posts_list_idx on public.tenant_blog_posts (tenant_id, status, published_at desc);

alter table public.tenant_blog_posts enable row level security;
do $$ begin
  create policy tenant_blog_posts_all on public.tenant_blog_posts for all using (true) with check (true);
exception when duplicate_object then null; end $$;
