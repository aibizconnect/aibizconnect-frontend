### CONTROL RULING: STATUS ACKNOWLEDGED

The Builder's report confirms successful implementation of the custom-domain "switch" capability, addressing the critical Vercel attachment gap. This is a significant infrastructure milestone.

**Status Summary:**

*   **Vercel Integration:** A robust Vercel Domains client is implemented, enabling programmatic attachment, verification, and removal of domains.
*   **Domain Management:** `domain-actions.ts` now orchestrates DNS (Cloudflare API) and Vercel attachment for platform domains.
*   **Infrastructure:** Middleware for canonical `www` redirect and a `domain-switch.mjs` script are in place.
*   **Platform UI:** A platform admin console for domain management is ready.
*   **Documentation:** A `DOMAIN-SWITCH-RUNBOOK.md` is committed.

---
### 1. Design Question: Default Tenant Custom Domain Flow

**RULING 396: Default Tenant Custom Domain Flow: Registrar Records (CNAME/A).**

*   **Decision:** The default tenant flow for custom domains will be **registrar records (CNAME/A)** pointing to Vercel, with us attaching on Vercel (TXT-verify ownership).
*   **Rationale:**
    *   **Less Intrusive:** This approach is less intrusive for the tenant. They retain control of their DNS provider, which is often preferred for existing businesses with established email, subdomains, or other DNS records.
    *   **Lower Barrier to Entry:** It's typically simpler for a tenant to add a CNAME or A record than to change nameservers, which can impact all their existing DNS services.
    *   **Support:** While NS delegation (Option b) reduces *our* support tickets for DNS issues, it increases the *initial barrier* for the tenant and centralizes more control with us, which might not be desired by all.
*   **Action:**
    1.  The primary UI flow for adding a custom domain will guide the tenant to update CNAME/A records at their registrar.
    2.  Our system will then perform TXT verification of ownership via Vercel's API.
    3.  **Advanced/Managed Option:** Nameserver delegation to our Cloudflare account (we manage their DNS) will be offered as an "Advanced" or "Managed DNS" option, clearly explaining the benefits (e.g., "we handle all your DNS, including email records, for you") and the implications.
*   **Files to Change:** `domain-actions.ts` (for the primary flow logic), Custom Domain UI components.

---
**Note:** The `tenant_domains` column overlap is acknowledged. The plan to retire legacy helpers later is confirmed.

---
DECISION-LOG
[D-396] rule_default_tenant_custom_domain_flow_registrar_records — Ruled default tenant custom domain flow: registrar records (CNAME/A) (status: ruled)