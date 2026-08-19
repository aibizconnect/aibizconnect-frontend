-- 0087 — Client/Project hierarchy for model-portable A2A.
--
-- Principle (from the "build once" idea): the Knowledge Catalogue (0086) and the A2A
-- surface are keyed to the CLIENT, never to the hosting model. Hosting model is just an
-- attribute of the project on a domain — so migrating a client between models
-- (ghl_funnel ↔ wordpress ↔ platform_tenant ↔ custom) never disturbs their catalogue or
-- their /.well-known/* files. The A2A edge serves from the central store, not the origin.
--
-- Hierarchy mapping onto existing tables:
--   Account  = the platform            (implicit)
--   Client   = public.tenants          (+ client_tier below)
--   Domain   = public.tenant_domains   (+ hosting/CF columns below)
--   Project  = the site on a domain    (tagged by hosting_model)
--   Catalogue= public.tenant_catalogues (0086)  ← the portable "build once" asset
--   A2A      = derived, edge-served (Cloudflare Worker)  ← origin-independent

-- Client tier (who the client is → what they get). Nullable; set at provisioning.
--   landing | managed_wp | platform_tenant | custom
alter table public.tenants add column if not exists client_tier text;

-- Per-domain / per-project attributes.
--   hosting_model: ghl_funnel | wordpress | platform_tenant | static | external | custom
alter table public.tenant_domains add column if not exists hosting_model text;
-- Cloudflare zone id for this domain — used to automate A2A route attachment.
alter table public.tenant_domains add column if not exists cf_zone_id text;
-- Whether the domain is proxied (orange-cloud) through Cloudflare — prerequisite for edge A2A.
alter table public.tenant_domains add column if not exists cf_proxied boolean not null default false;
-- Whether the edge A2A routes (/llms.txt, /.well-known/*) are attached for this domain.
alter table public.tenant_domains add column if not exists a2a_enabled boolean not null default false;

comment on column public.tenants.client_tier is 'landing | managed_wp | platform_tenant | custom';
comment on column public.tenant_domains.hosting_model is 'ghl_funnel | wordpress | platform_tenant | static | external | custom';
