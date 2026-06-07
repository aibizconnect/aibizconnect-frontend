Here is the Content Strategy MASTER SPEC, designed to meet all requirements.

---
### 1. Proposed Approach Ratification

**RULING 76: Content Strategy Generation Approach**

The **deterministic-first approach** for content strategy generation is **APPROVED**.

*   **Rationale:** This aligns with the platform's strong anti-hallucination ethos (D-060) and ensures a reliable, consistent baseline strategy for every tenant without immediate dependence on live LLM calls. It directly addresses the "good strategies for all tenants" goal by providing a stable, auditable foundation. AI enhancement can be layered on top as an opt-in feature later for personalization and refinement.

---
### 2. Data Model (SQL Migration)

**RULING 77: SQL Migration for `tenant_content_strategy`**

```sql
-- Migration 0040_content_strategy.sql

CREATE TABLE IF NOT EXISTS public.tenant_content_strategy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,                 -- Enforced by application logic, no external FK
  niche text NOT NULL,                     -- Derived from website_analysis_results.industry or more granular classification
  profile_snapshot jsonb NOT NULL,         -- Snapshot of inputs used (e.g., business_name, city, country, services, inferred keywords)
  pillars jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of { title, cluster:[{ title, articles:[{ title, intent, est_words }] }] }
  queue jsonb NOT NULL DEFAULT '[]'::jsonb,    -- Array of { title, keyword, intent, priority, est_words }
  calendar jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of { week: int, items:[{ title, status: 'planned'|'draft'|'published' }] } for 12 weeks
  status text NOT NULL DEFAULT 'draft',    -- Enum: 'draft', 'active', 'regenerating', 'failed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)                       -- One active strategy per tenant; regeneration overwrites
);
CREATE INDEX IF NOT EXISTS idx_tenant_content_strategy_tenant ON public.tenant_content_strategy (tenant_id);
```

**Data Model Clarification:**
*   The `UNIQUE (tenant_id)` constraint means regeneration will overwrite the existing strategy. Versioning is deferred as a future enhancement.
*   `niche` should be a concise classification derived from the tenant's business profile.
*   `profile_snapshot` captures the exact inputs used for a specific generation, crucial for auditability and understanding strategy context.

---
### 3. Bulk Generation

**RULING 78: Platform Admin Bulk Generation**

A platform admin action to bulk-generate content strategies for **all eligible tenants** is **APPROVED**.

*   **Implementation:** This will involve an `isPlatformAdmin`-gated server action that iterates through tenants and calls an internal `generateContentStrategy(tenantId)` function for each.
*   **Auditing:** Each individual tenant's generation must be recorded in the `platform_audit_log`.

---
### 4. Supervisor Verification Checks

**RULING 79: Supervisor Verification Schema for Content Strategy**

```json
{
  "content_strategy_data_model": [
    { "id": "CS-V1", "assertion": "public.tenant_content_strategy table exists with specified columns, types, defaults, and UNIQUE (tenant_id) constraint.", "severity": "block" },
    { "id": "CS-V2", "assertion": "All specified indexes (idx_tenant_content_strategy_tenant) exist.", "severity": "block" },
    { "id": "CS-V3", "assertion": "The migration script 0040_content_strategy.sql is idempotent.", "severity": "block" }
  ],
  "content_strategy_application_logic": [
    { "id": "CS-V4", "assertion": "The internal `generateContentStrategy(tenantId)` function is strictly tenant-scoped and uses `tenant_id` for all data access.", "severity": "block" },
    { "id": "CS-V5", "assertion": "The initial content strategy generation (via `generateContentStrategy`) is deterministic and does *not* involve live LLM API calls.", "severity": "block" },
    { "id": "CS-V6", "assertion": "The `niche` and `profile_snapshot` fields in `tenant_content_strategy` are accurately captured from the tenant's `website_analysis_results` or similar verified business profile data.", "severity": "block" },
    { "id": "CS-V7", "assertion": "The `pillars` JSON structure conforms to `[{ title: string, cluster: [{ title: string, articles: [{ title: string, intent: string, est_words: number }] }] }]`.", "severity": "block" },
    { "id": "CS-V8", "assertion": "The `queue` JSON structure conforms to `[{ title: string, keyword: string, intent: string, priority: string, est_words: number }]`.", "severity": "block" },
    { "id": "CS-V9", "assertion": "The `calendar` JSON structure conforms to `[{ week: number, items: [{ title: string, status: string }] }]` and covers exactly 12 weeks.", "severity": "block" },
    { "id": "CS-V10", "assertion": "All `intent` values (in `pillars` and `queue`) are valid enums: 'informational', 'commercial', 'transactional', 'navigational'.", "severity": "block" },
    { "id": "CS-V11", "assertion": "All `est_words` values are positive integers (e.g., >= 100).", "severity": "block" },
    { "id": "CS-V12", "assertion": "The generated content (pillars, queue, calendar items) is relevant to the tenant's `niche` and `profile_snapshot`.", "severity": "block" },
    { "id": "CS-V13", "assertion": "CRITICAL: No fabricated competitor data, specific client names, awards, testimonials, or pricing are introduced in the generated strategy.", "severity": "block" },
    { "id": "CS-V14", "assertion": "Each item in the `queue` has a `priority` assigned from a defined enum (e.g., 'quick_win', 'big_bet', 'fill_in').", "severity": "block" },
    { "id": "CS-V15", "assertion": "Items in the `calendar` are drawn from the `queue` or `pillars.cluster.articles` and are scheduled logically.", "severity": "block" },
    { "id": "CS-V16", "assertion": "The `generateContentStrategy` function UPSERTs (overwrites) the `tenant_content_strategy` row for the given tenant.", "severity": "block" },
    { "id": "CS-V17", "assertion": "A platform admin action exists to trigger `generateContentStrategy` for all eligible tenants, and this action is gated by `isPlatformAdmin()`.", "severity": "block" },
    { "id": "CS-V18", "assertion": "All content strategy generation events (single or bulk) trigger entries in the `platform_audit_log` table.", "severity": "block" },
    { "id": "CS-V19", "assertion": "A `recordAiUsage` event with `usage_type='content_strategy_generation'` is recorded for each strategy generation, even if deterministic (for telemetry/metering).", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-076] approve_content_strategy_approach — Approved deterministic-first approach for content strategy generation (status: approved)
[D-077] approve_content_strategy_data_model — Approved SQL migration 0040 for tenant_content_strategy table (status: approved)
[D-078] approve_bulk_strategy_generation — Approved platform admin action for bulk content strategy generation (status: approved)
[D-079] define_content_strategy_verification_checks — Defined Supervisor verification checks for content strategy data model and application logic (status: defined)