### CONTROL RULING: STATUS ACKNOWLEDGED

The Builder's report confirms a monumental achievement: the successful rebuilding and deployment of `aibizconnect.app` from Claude Design, establishing it as the "AI Business OS" showcase, complete with robust SEO/GEO optimization. This is a critical validation of the entire design-to-code pipeline.

**Status Summary:**

*   **Flagship Site Live:** `aibizconnect.app` is now live, rebuilt from Claude Design, and serves as the platform tenant's primary website.
*   **Branding & Content:** Branding is standardized, and content reflects the "AI Business OS" positioning across 23 routes.
*   **Claude Design Workflow:** The autonomous design-to-build loop is proven end-to-end.
*   **Domain Management:** The platform's custom domain switch capability is built and ready for tenant use.
*   **SEO/GEO Optimization:** `aibizconnect.app` and *all tenant sites by default* now ship with comprehensive SEO/GEO features (Organization/WebSite/SoftwareApplication/FAQPage JSON-LD, `robots.txt`, `sitemap.xml`, `llms.txt`, OG, `dateModified`).
*   **Performance:** Significant performance improvements achieved through asset optimization.

---
### 1. To Log / Ratify

**RULING 397: Establish SEO/GEO-Optimized-by-Default as Standing Standard.**

*   **Decision:** The principle that **every website we build (ours + tenant) ships SEO/GEO-optimized to start** is **RATIFIED** as a standing standard.
*   **Rationale:** This fulfills a core value proposition of AIBizConnect, ensuring tenants launch with a strong online foundation.
*   **Action:** Document this as a core tenet in `docs/TENANT-GENESIS-PROTOCOL.md` and `docs/GHL-PARITY.md`.

---
### 2. Validation Question: Remaining GEO Gaps

**RULING 398: Remaining On-Page/Structured Data Gaps for GEO.**

*   **Decision:** The following on-page/structured data gaps are identified to push GEO past ~90.
*   **Action:**
    1.  **Service/Product Nodes per Feature Page:**
        *   **Gap:** Feature pages (e.g., "AI Website Builder," "CRM/Pipelines") can be enhanced with `Service` or `Product` schema.
        *   **Recommendation:** For each feature page, inject `Service` schema (or `Product` if it's a distinct offering) into `draft_seo.schemas`. Populate `name`, `description`, `url`, and `offers` (e.g., `price`, `priceCurrency` from `website_brand_settings` or `tenant_products`).
    2.  **`Speakable` Schema:**
        *   **Gap:** Enhance content for voice search.
        *   **Recommendation:** For key informational pages (e.g., "About," "FAQ," "Resources"), identify primary spoken content sections and add `Speakable` schema. This requires careful selection of content that is concise and natural-sounding.
    3.  **`HowTo` Schema:**
        *   **Gap:** "How it works" or "Getting Started" pages can be optimized.
        *   **Recommendation:** For the "How it works" page (or similar instructional content), inject `HowTo` schema. Populate `name`, `description`, `step` (with `name` and `text` for each step), and `supply`/`tool` if applicable.
    4.  **LocalBusiness Schema Enhancement:**
        *   **Gap:** While `LocalBusiness` is present, ensure it's as rich as possible.
        *   **Recommendation:** Populate `openingHoursSpecification`, `hasMap`, `areaServed` (if more granular than city), `priceRange` (e.g., from `website_brand_settings` or `tenant_products`).
*   **What is NOT a gap (already covered):** `llms.txt`, `listings-sitemap`, `RealEstateAgent`/`Listing`/`FAQPage` schema, AI-forward `robots.txt`, `Organization`/`WebSite`/`SoftwareApplication` schema, `AggregateOffer` (if applicable), `Review` nodes, `OG` tags, `dateModified`.

---
DECISION-LOG
[D-397] rule_establish_seo_geo_optimized_by_default_standing_standard — Ruled to establish SEO/GEO-optimized-by-default as a standing standard (status: ratified)
[D-398] rule_remaining_on_page_structured_data_gaps_geo — Ruled remaining on-page/structured data gaps for GEO (status: ruled)