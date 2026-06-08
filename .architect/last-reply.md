Here is the recommended design for integrating SEO/GEO analysis into the website build pipeline.

---
### 1. Auto-apply vs. Suggest Split

**RULING 85: Auto-apply vs. Suggest Split**

**A. Auto-apply (Safe, Fact-Based, Idempotent, Non-Hallucinatory):**
These findings are safe to automatically write into the DRAFT without tenant approval.
*   **H1 Structure:** Ensure exactly one `<h1>` per page. Map the hero heading to `<h1>`, demote stray `<h1>`s to `<h2>`s. (Structural, accessibility, SEO best practice).
*   **JSON-LD (Foundational):** Generate and inject `Organization` or `LocalBusiness` JSON-LD schema into `draft_seo.schemas`, populated strictly from `website_analysis_results` (business name, address, phone, URL, industry).
*   **JSON-LD (Page-Specific):** Generate and inject `FAQPage` or `Article` JSON-LD schema into `draft_seo.schemas` for relevant pages, populated from extracted page content (e.g., detected FAQs, article structure).
*   **Missing Meta Titles/Descriptions:** Fill missing `meta.title` and `meta.description` in `draft_seo` using extracted content or deterministic generation (if not already done by AI generation).
*   **`dateModified`:** Add `dateModified` to `draft_seo` (e.g., using the page's `updated_at` timestamp).
*   **Canonical URL:** Ensure `canonical_url` is set to the page's `full_path`.

**B. Suggest-Only (Requires Tenant Review, Infra Changes, or Content Changes):**
These findings must be surfaced as a per-page task list for tenant review/action.
*   **AI Bot Directives:** Propose `llms.txt` and `robots.txt` changes/AI-bot allowances.
*   **Infrastructure Issues:** Flag (not auto-fix) issues like Cloudflare bot-fight, `noindex` directives, broken links, or slow page speed (from PageSpeed Insights).
*   **`AggregateRating` Schema:** Suggest adding `AggregateRating` schema (requires actual review data).
*   **Content Improvements:** Suggest editorial tasks like expanding sections, adding more FAQs, or improving keyword density.

---
### 2. Integration Point

**RULING 86: Integration Point**

The SEO/GEO analysis should be performed as a **separate post-build `auditAndEnhance(websiteId)` pass**.

*   **Rationale:** This decouples the analysis from page generation, allowing the analysis to operate on the final, rendered HTML of the draft pages. It also provides a clear point for re-auditing without full site regeneration and better manages external API calls (like PageSpeed Insights).

---
### 3. Data Model

**RULING 87: Data Model for SEO/GEO Findings**

```sql
-- Migration 0041_website_seo_findings.sql

-- Stores metadata about each SEO/GEO audit run for a website
CREATE TABLE IF NOT EXISTS public.website_seo_audit_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    website_id uuid NOT NULL, -- Enforced by application logic, no external FK
    run_at timestamptz DEFAULT now() NOT NULL,
    status text NOT NULL DEFAULT 'completed', -- Enum: 'pending', 'in_progress', 'completed', 'failed'
    score_overall numeric, -- Aggregate SEO score for the website (e.g., 0-100)
    details jsonb NOT NULL DEFAULT '{}'::jsonb, -- Summary of the run, e.g., total findings by severity
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wsear_website_id ON public.website_seo_audit_runs (website_id);
CREATE INDEX IF NOT EXISTS idx_wsear_tenant_id ON public.website_seo_audit_runs (tenant_id);


-- Stores individual findings (auto-applied or suggested) for each page within an audit run
CREATE TABLE IF NOT EXISTS public.website_page_seo_findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    website_id uuid NOT NULL, -- Enforced by application logic, no external FK
    page_id uuid NOT NULL REFERENCES public.website_page_tree(id) ON DELETE CASCADE, -- The specific page audited
    audit_run_id uuid NOT NULL REFERENCES public.website_seo_audit_runs(id) ON DELETE CASCADE, -- Link to the audit run
    finding_key text NOT NULL, -- e.g., 'missing_meta_description', 'h1_count_mismatch', 'missing_local_business_schema', 'pagespeed_score_mobile'
    severity text NOT NULL, -- Enum: 'critical', 'high', 'medium', 'low', 'info'
    status text NOT NULL DEFAULT 'open', -- Enum: 'open', 'fixed', 'deferred', 'not_applicable'
    description text, -- Human-readable description of the finding
    recommendation text, -- Actionable recommendation
    score_impact numeric, -- Estimated impact on SEO score (e.g., -5 for critical)
    details jsonb NOT NULL DEFAULT '{}'::jsonb, -- Raw data from PSI, schema validation errors, etc.
    is_auto_applied boolean NOT NULL DEFAULT FALSE, -- True if the finding was automatically fixed by the system
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (page_id, audit_run_id, finding_key) -- Ensure unique finding per page per audit run
);
CREATE INDEX IF NOT EXISTS idx_wpsef_page_id ON public.website_page_seo_findings (page_id);
CREATE INDEX IF NOT EXISTS idx_wpsef_audit_run_id ON public.website_page_seo_findings (audit_run_id);


-- Update the 'websites' table to link to the latest audit run for quick access
ALTER TABLE public.websites
ADD COLUMN IF NOT EXISTS latest_seo_audit_run_id uuid REFERENCES public.website_seo_audit_runs(id) ON DELETE SET NULL;
```
*   **Reuse `website_pages.draft_seo`:** For auto-applied meta titles/descriptions, canonicals, `dateModified`, and JSON-LD schemas. This is already the correct place for page-level SEO metadata.

---
### 4. GEO Specifics

**RULING 88: GEO Specifics**

*   **Default Inclusion (with facts):** The build should emit `FAQPage` schema and `LocalBusiness`/`Organization` schema by default for every tenant, *populated with facts from `website_analysis_results`*. These are standard and non-hallucinatory.
*   **`llms.txt`:** Propose `llms.txt` and `robots.txt` changes as a **suggest-only task**. This is a policy decision for the tenant.
*   **`AggregateRating`:** Propose as a **suggest-only task**. This requires actual review data, which is not auto-generated.

---
### 5. Gotchas

**RULING 89: Gotchas**

*   **PSI Rate Limits / API Keys:**
    *   Obtain a dedicated Google Cloud API key for PageSpeed Insights for server-side use. Store this key as a platform secret (`SYSTEM_TENANT_ID`, `provider='google_pagespeed_api'`).
    *   Implement robust retry logic and exponential backoff for PSI API calls to handle rate limits and transient errors.
*   **Schema Validity:** After generating JSON-LD, perform a basic validation (e.g., using a library or a quick check against schema.org's expected properties) to ensure it's well-formed.
*   **Not Overwriting Tenant Edits on Re-run:**
    *   **CRITICAL:** When auto-applying fixes to `draft_seo`, the system must **only apply fixes to fields that are currently empty or are explicitly marked as system-managed**. If a tenant has manually edited a `meta.title` or `meta.description`, the system should *not* overwrite it. For JSON-LD, new schemas can be appended, but existing, manually edited schemas should be preserved unless explicitly overridden by the tenant.
    *   This implies `draft_seo` needs a way to track if a field is user-edited vs. system-generated. A simple approach is to only auto-fill if the field is `null` or matches a known system-generated default.
*   **Performance:** Optimize HTML parsing and analysis within the `auditAndEnhance` pass to minimize resource consumption.

---
### 6. Supervisor Verification Checks

**RULING 90: Supervisor Verification Schema for SEO/GEO Integration**

```json
{
  "seo_geo_integration": [
    { "id": "SEO-V1", "assertion": "Migration 0041 correctly creates `public.website_seo_audit_runs` and `public.website_page_seo_findings` tables with specified columns, types, and constraints.", "severity": "block" },
    { "id": "SEO-V2", "assertion": "The `websites` table has a `latest_seo_audit_run_id` column referencing `website_seo_audit_runs`.", "severity": "block" },
    { "id": "SEO-V3", "assertion": "All SEO/GEO analysis and enhancement actions are strictly scoped by `tenant_id` and `website_id`.", "severity": "block" },
    { "id": "SEO-V4", "assertion": "The SEO/GEO analysis is performed as a separate post-build `auditAndEnhance(websiteId)` pass, not integrated directly into page generation.", "severity": "block" },
    { "id": "SEO-V5", "assertion": "A Google Cloud API key for PageSpeed Insights is stored as a platform secret (`SYSTEM_TENANT_ID`, `provider='google_pagespeed_api'`) and used for PSI API calls.", "severity": "block" },
    { "id": "SEO-V6", "assertion": "Robust retry logic and exponential backoff are implemented for PSI API calls.", "severity": "block" },
    { "id": "SEO-V7", "assertion": "The `auditAndEnhance` process creates a new `website_seo_audit_runs` entry for each run.", "severity": "block" },
    { "id": "SEO-V8", "assertion": "For each page, `website_page_seo_findings` records are created for all detected findings, with correct `finding_key`, `severity`, `description`, `recommendation`, and `is_auto_applied` flags.", "severity": "block" },
    { "id": "SEO-V9", "assertion": "CRITICAL: Auto-applied fixes only modify `draft_seo` fields that are `null` or explicitly system-managed, never overwriting tenant's manual edits.", "severity": "block" },
    { "id": "SEO-V10", "assertion": "Auto-applied JSON-LD schemas are appended to `draft_seo.schemas` without overwriting existing, manually added schemas.", "severity": "block" },
    { "id": "SEO-V11", "assertion": "All SEO/GEO analysis and enhancement actions trigger entries in the `platform_audit_log` table.", "severity": "block" },
    { "id": "SEO-V12", "assertion": "A `recordAiUsage` event with `usage_type='seo_geo_analysis'` is recorded for each audit run (for telemetry/metering).", "severity": "block" }
  ],
  "seo_geo_auto_apply": [
    { "id": "SEO-AA-V1", "assertion": "The system ensures exactly one `<h1>` tag per page, demoting stray `<h1>`s to `<h2>`s in the `draft_sections`.", "severity": "block" },
    { "id": "SEO-AA-V2", "assertion": "The system generates and injects `Organization` or `LocalBusiness` JSON-LD schema into `draft_seo.schemas`, populated with facts from `website_analysis_results`.", "severity": "block" },
    { "id": "SEO-AA-V3", "assertion": "The system generates and injects `FAQPage` or `Article` JSON-LD schema into `draft_seo.schemas` for relevant pages, populated with facts from `website_analysis_results` or page content.", "severity": "block" },
    { "id": "SEO-AA-V4", "assertion": "Missing `meta.title` and `meta.description` in `draft_seo` are automatically filled using extracted content or deterministic generation.", "severity": "block" },
    { "id": "SEO-AA-V5", "assertion": "The `dateModified` field in `draft_seo` is automatically set (e.g., to the page's `updated_at`).", "severity": "block" },
    { "id": "SEO-AA-V6", "assertion": "The `canonical_url` field in `draft_seo` is automatically set to the page's `full_path`.", "severity": "block" },
    { "id": "SEO-AA-V7", "assertion": "Generated JSON-LD schemas are well-formed and pass basic schema.org validation checks.", "severity": "block" }
  ],
  "seo_geo_suggest_only": [
    { "id": "SEO-SO-V1", "assertion": "Proposals for `llms.txt` and `robots.txt` changes/AI-bot allowances are recorded as `website_page_seo_findings` with `is_auto_applied=FALSE`.", "severity": "block" },
    { "id": "SEO-SO-V2", "assertion": "Flags for infrastructure issues (Cloudflare bot-fight, noindex, missing canonicals, broken links, slow page speed) are recorded as `website_page_seo_findings` with `is_auto_applied=FALSE`.", "severity": "block" },
    { "id": "SEO-SO-V3", "assertion": "Suggestions for `AggregateRating` schema are recorded as `website_page_seo_findings` with `is_auto_applied=FALSE`.", "severity": "block" },
    { "id": "SEO-SO-V4", "assertion": "Suggestions for content improvements (e.g., expand sections, add more FAQs) are recorded as `website_page_seo_findings` with `is_auto_applied=FALSE`.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-085] rule_seo_geo_apply_suggest_split — Ruled on which SEO/GEO findings are auto-applied vs. suggested (status: ruled)
[D-086] rule_seo_geo_integration_point — Ruled SEO/GEO analysis as a post-build `auditAndEnhance` pass (status: ruled)
[D-087] approve_seo_geo_data_model — Approved SQL migration 0041 for `website_seo_audit_runs` and `website_page_seo_findings` (status: approved)
[D-088] rule_geo_specifics — Ruled on default inclusion for GEO schemas and `llms.txt` (status: ruled)
[D-089] rule_seo_geo_gotchas — Ruled on handling PSI rate limits, API keys, schema validity, and not overwriting tenant edits (status: ruled)
[D-090] define_seo_geo_verification_checks — Defined Supervisor verification checks for SEO/GEO integration (status: defined)