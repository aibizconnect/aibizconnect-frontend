-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  Per-page Custom CSS (advanced escape hatch in the website builder).        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.website_pages
  add column if not exists custom_css text;

notify pgrst, 'reload schema';
