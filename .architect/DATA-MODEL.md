# AI Website-Creation Pipeline — Data Model & Contract (architect spec)

Source: local architect relay (Gemini), seeded with Copilot's canonical plan.
Suggested migration filename: `supabase/migrations/0029_ai_website_creation_pipeline.sql`
All tables scoped by `tenant_id` + `website_id`; idempotent; RLS enabled (policies TBD by Builder).

## 1. Tables

```sql
-- website_analysis_results — AI business analysis (Step 1)
CREATE TABLE IF NOT EXISTS public.website_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  source_url text,
  analysis_data jsonb NOT NULL,
  analysis_status text NOT NULL DEFAULT 'pending', -- pending|completed|failed|re_analyzing
  supervisor_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_war_tenant_website ON public.website_analysis_results (tenant_id, website_id);

-- website_page_extractions — content extracted per source main page
CREATE TABLE IF NOT EXISTS public.website_page_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  page_title text,
  page_intent text, -- informational|conversion|trust_building|seo|funnel_step
  extracted_content jsonb NOT NULL, -- hero, headline, sections, CTAs, images, layout, metadata
  extraction_status text NOT NULL DEFAULT 'pending', -- pending|completed|failed|re_extracting
  supervisor_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_id, original_url)
);
CREATE INDEX IF NOT EXISTS idx_wpe_tenant_website ON public.website_page_extractions (tenant_id, website_id);
CREATE INDEX IF NOT EXISTS idx_wpe_url ON public.website_page_extractions (original_url);

-- website_page_blocks — atomic, design-system blocks
CREATE TABLE IF NOT EXISTS public.website_page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  block_type text NOT NULL, -- hero_block|feature_block|service_block|testimonial_block|gallery_block|cta_block|faq_block|contact_block
  block_name text NOT NULL,
  content jsonb NOT NULL,
  is_global boolean NOT NULL DEFAULT false,
  source_page_extraction_id uuid REFERENCES public.website_page_extractions(id) ON DELETE SET NULL,
  block_status text NOT NULL DEFAULT 'draft', -- draft|active|archived
  supervisor_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wpb_tenant_website ON public.website_page_blocks (tenant_id, website_id);
CREATE INDEX IF NOT EXISTS idx_wpb_type ON public.website_page_blocks (block_type);
CREATE INDEX IF NOT EXISTS idx_wpb_source ON public.website_page_blocks (source_page_extraction_id);

-- website_page_tree — improved canonical page structure
CREATE TABLE IF NOT EXISTS public.website_page_tree (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.website_page_tree(id) ON DELETE SET NULL,
  page_type text NOT NULL, -- home|about|services|service_detail|pricing|testimonials|portfolio|faq|blog_index|contact|lead_magnet|thank_you|ad_landing|custom
  title text NOT NULL,
  slug text NOT NULL,
  full_path text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_funnel_page boolean NOT NULL DEFAULT false,
  is_seo_page boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ block_id, order, settings }]
  tree_status text NOT NULL DEFAULT 'draft', -- draft|published|archived
  supervisor_verification jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_id, full_path)
);
CREATE INDEX IF NOT EXISTS idx_wpt_tenant_website ON public.website_page_tree (tenant_id, website_id);
CREATE INDEX IF NOT EXISTS idx_wpt_parent ON public.website_page_tree (parent_id);
CREATE INDEX IF NOT EXISTS idx_wpt_path ON public.website_page_tree (full_path);

-- website_page_map — old extraction -> new tree node
CREATE TABLE IF NOT EXISTS public.website_page_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  original_page_extraction_id uuid NOT NULL REFERENCES public.website_page_extractions(id) ON DELETE CASCADE,
  new_page_id uuid NOT NULL REFERENCES public.website_page_tree(id) ON DELETE CASCADE,
  mapping_type text NOT NULL, -- direct_reuse|content_merged|redirect_only|no_equivalent
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (original_page_extraction_id, new_page_id)
);
CREATE INDEX IF NOT EXISTS idx_wpm_tenant_website ON public.website_page_map (tenant_id, website_id);
CREATE INDEX IF NOT EXISTS idx_wpm_original ON public.website_page_map (original_page_extraction_id);
CREATE INDEX IF NOT EXISTS idx_wpm_new ON public.website_page_map (new_page_id);

-- pipeline state on websites
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS wizard_pipeline_state jsonb NOT NULL DEFAULT '{}'::jsonb;
```

> NOTE for Builder: verify `tenants(id)` / `websites(id)` FK targets exist in this DB before applying; the rest of the app uses the service-role client + in-code tenant scoping, so RLS policies are optional/deferred (see SECURITY-PLAN.md). The architect wrote `ENABLE ROW SECURITY` on some tables — correct keyword is `ENABLE ROW LEVEL SECURITY`; only include if we actually author policies.

## 2. websites.wizard_pipeline_state JSON contract

Object keyed by step; each step: `{ status, data:{...}, verifiedAt, errors:[] }`.
status ∈ pending|running|done|failed|needs_review.

Steps & key data:
- `version`: "1.0"
- `step0_intake`: { input_url, input_type }
- `step1_ai_analysis`: { analysis_id, business_name, industry, services_products[], pricing_hints, tone, brand_colors[], typography{heading,body}, layout_patterns[], images{hero,gallery[]}, ctas[], contact_info{email,phone,address}, location, hours, social_links{}, reviews_summary, business_model, growth_intent{primary_goal,sales_cycle,funnel_type,best_cta,best_page_structure[]}, main_pages_detected[{title,url}], page_extractions_ids[] }
- `step2_ai_prefill_wizard`: { prefill_summary, business_basics{}, existing_presence{}, design_preferences{}, growth_setup{} }
- `step3_confirm_intake`: { tenant_confirmed, edited_data_snapshot{} }
- `step4_subdomain`: { suggested_subdomains[], selected_subdomain, subdomain_reserved }
- `step5_business_shell`: { pages_generated[{page_id,title,path}], crm_pipeline_id, crm_contact_fields_configured, crm_tags_configured, crm_source_tracking_configured, funnel_id, follow_up_sequence_stub_id, brand_settings_id, media_assets_ids[] }
- `step6_editor_ready`: { editor_url, website_status, all_settings_scoped }
- `step7_publish`: { publish_initiated_at, cloudflare_cname_created, website_live, tracking_activated, follow_up_sequences_activated, public_url }

## 3. Supervisor verification schema

`{ step: [ { id, assertion, severity:'block'|'warn' } ] }` — full set captured in
`.architect/history.json` (turn 4). Highlights: S0 (URL valid/safe/has content), S1
(>=80% fields, valid industry, real hex colors, hero>=1200px, main-page count correct,
extractions non-hallucinated), S2 (no empty/raw-HTML, industry↔services, CTA↔model),
S3 (editable except subdomain, summary matches), S4 (naming quality, availability, lowercase,
status stays draft), S5 (real content, brand match, CRM wiring Form→Thankyou→CRM→Followup,
no hallucinations, blocks follow design system, websiteId scoping, no tenant bleed),
S6 (websiteId on all saves, draft, no DNS), S7 (CNAME only/no A records, live, pixel firing,
sequences off unless toggled).
