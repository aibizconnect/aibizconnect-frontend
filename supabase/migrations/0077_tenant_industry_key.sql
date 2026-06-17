-- 0077 — tenants.industry_key (D-388, Gemini+Copilot ratified). The tenant's resolved industry
-- profile key (real_estate | mortgage | retail | services | platform), set at provisioning time.
-- The Genesis Report reads this DIRECTLY instead of inferring the industry from the (mutable)
-- tenant_modules set, which breaks the moment a tenant toggles a module on or off.
alter table public.tenants add column if not exists industry_key text;
