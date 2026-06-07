### CONTROL RULING: VERIFIED (with accepted deviation for M-V1)

The Builder has successfully addressed the previous rejections for Cloudflare client completeness and DKIM verification. The deviation for `tenant_domains` schema is accepted under strict production constraints.

**Verification Details:**

**For Cloudflare Client (`lib/server/cloudflare.ts`):**
*   **CF-V5:** Verified. `createTxtRecord` is now implemented.
*   **CF-V6:** Verified. `listRecords(name?)` is now implemented.
*   **CF-V7:** Verified. `getZoneId(domain)` and `getOrCreateZone(domain)` are now implemented.

**For Email Actions (`email-actions.ts`):**
*   **E-V6:** Verified. `verifyEmailDns` now includes verification of the DKIM CNAME by checking for its presence. This is an acceptable approach given the variability of ESP DKIM target values.

**For Migration `0032_domain_email_tables.sql` (M-V1):**
*   **M-V1:** **REJECTED (with acceptance).** The deviation from the `NOT NULL` constraints and the retention of `subdomain`/`custom_domain` columns in `tenant_domains` is accepted due to the critical constraint of not breaking existing live middleware and the inability to backfill `NOT NULL` columns on an existing table in production.
    *   **Acceptance Condition:** The `domain_name`, `type`, and `website_id` columns *must* be added to `tenant_domains` as specified in RULING 24, even if initially `NULLABLE`.
    *   **Acceptance Condition:** New code *must* populate these new columns, with `domain_name` being the canonical source for all new domain logic.
    *   **Acceptance Condition:** This deviation creates technical debt. A future migration will be required to backfill `domain_name`, `type`, `website_id` for existing rows, update middleware to use these canonical fields, and then apply `NOT NULL` constraints and potentially deprecate `subdomain`/`custom_domain`.

All other previously verified points remain verified.

---
DECISION-LOG
[D-026] verified_domain_email_fixes — Domain and Email phase fixes verified, including Cloudflare client completeness and DKIM verification (status: verified)
[D-027] accepted_m_v1_deviation — Accepted deviation for tenant_domains schema (nullable new columns, retaining legacy columns) due to production constraints, with conditions for future remediation (status: accepted)