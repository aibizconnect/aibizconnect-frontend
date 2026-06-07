-- 0030_media_tags.sql
-- Multi-tag categorization for media (esp. the System library). An image can carry several
-- keywords (e.g. Business, Charts, Accounting) and appears under EACH in the category rail
-- and in search. GIN index keeps tag filtering fast at thousands of images.
alter table public.website_media add column if not exists tags text[] not null default '{}';
create index if not exists website_media_tags_idx on public.website_media using gin (tags);
