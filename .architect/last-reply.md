Here is the concrete, ranked, phased production architecture for a fully autonomous website pipeline.

---
### 1. Render Bridge Hosting

**RULING 158: Self-Host `render-server.mjs` as a Small, Always-On Container (Fly.io / Render.com).**

*   **Rank:** (b) Self-host `render-server.mjs` as a small always-on container (Fly.io / Render.com / Railway).
*   **Rationale:**
    *   **Cost & Control:** Offers the best balance of cost-effectiveness and complete control over our custom `data-cs` annotation script and Tailwind resolution logic. Managed headless services (a) might require complex workarounds or custom function deployments, adding cost and complexity. Serverless containers (c) can have cold start issues and higher costs for persistent Chromium.
    *   **Fidelity:** We own the entire rendering and annotation process, ensuring maximum fidelity.
    *   **Ops:** Fly.io/Render.com provide managed container hosting, simplifying deployment and scaling for a small, dedicated service.
*   **Default Pick:** **Fly.io** for its global distribution capabilities (low latency) and generous free tier for small instances.
*   **Action:**
    1.  Create a Dockerfile for `scripts/render-server.mjs`.
    2.  Deploy this Docker image to Fly.io (or Render.com).
    3.  Configure `SITE_RENDER_URL` in our Vercel Next.js app to point to the public URL of this deployed service.

---
### 2. Autonomous Agent Execution in Production

**RULING 159: Hybrid Worker Service Wrapping Agent SDK and Direct API Calls.**

*   **Rank:** (c) A hybrid worker service that wraps both.
*   **Rationale:**
    *   **Stitch MCP Blocker:** The current Stitch MCP screen generation issue (no programmatic HTML retrieval) means we *cannot* fully rely on the Claude Agent SDK for the *entire* Stitch flow programmatically.
    *   **Future-Proofing:** Stitch *will* eventually have a REST API for screen generation. A hybrid worker allows us to transition seamlessly.
    *   **Control & Reliability:** A dedicated worker service (e.g., a Node.js application running on Fly.io/Render.com, or a Supabase Edge Function for simpler tasks) provides a robust environment for orchestration.
    *   **Cost:** Running an Agent SDK continuously can be expensive. A worker can optimize calls.
*   **Default Pick:** A **Node.js worker service deployed on Fly.io/Render.com** (potentially co-located with the render bridge for efficiency, but logically separate services).
*   **Action:**
    1.  Create a new Node.js worker service (e.g., `services/agent-orchestrator/`).
    2.  This worker will:
        *   **Receive Triggers:** Listen for triggers via a Supabase Queue (or a dedicated webhook endpoint from the Next.js app).
        *   **Orchestrate:**
            *   For Stitch, it will initially call the *Claude Agent SDK* (if the MCP issue is resolved) or directly call the *Stitch REST API* (once available and we have platform credentials).
            *   For our app's `wizard-actions.generateWizardPages` (which includes `importStitchScreen`), it will make direct server-to-server API calls to our Vercel Next.js backend.
        *   **Manage State:** Update `websites.wizard_pipeline_state` and `platform_audit_log`.
    3.  Deploy this worker service to Fly.io/Render.com.

---
### 3. Credentials & Secrets

**RULING 160: Centralized Secrets Management.**

All secrets will be managed centrally and securely.

*   **`website_brand_settings` (Vercel App):**
    *   `SITE_RENDER_URL`: Environment variable pointing to the deployed render bridge.
    *   `CLAUDE_API_KEY`: Environment variable for calling the Claude Agent SDK (if used directly by worker).
*   **Render Bridge Service (Fly.io/Render.com):**
    *   No specific secrets needed beyond its own deployment credentials.
*   **Agent Orchestrator Worker (Fly.io/Render.com):**
    *   `SUPABASE_SERVICE_ROLE_KEY`: Environment variable to interact with Supabase (for `websites.wizard_pipeline_state`, `platform_audit_log`).
    *   `APP_BASE_URL`: Environment variable pointing to our Vercel Next.js app (for server-to-server calls to `wizard-actions`).
    *   `STRIPE_IDENTITY_SECRET_KEY`, `SHOPIFY_API_SECRET`, etc.: Environment variables for direct API calls to providers (if not using Claude Agent SDK for these).
    *   `CLAUDE_API_KEY`: Environment variable for calling Claude Agent SDK (if used).
    *   `PLATFORM_TENANT_ID`: Constant UUID for platform secrets.
    *   `SETTINGS_ENCRYPTION_KEY`: Environment variable for decrypting platform secrets from `tenant_secrets`.
*   **Supabase (Database):**
    *   `tenant_secrets` table: Stores encrypted platform-level secrets (Stripe Identity, Shopify, etc.) and tenant-level secrets.
*   **R2 (Media Storage):**
    *   Access via Supabase service role key (managed by Supabase).

---
### 4. Minimal First Deployment & Upgrade Path

**RULING 161: Minimal First Deployment & Upgrade Path.**

**A. Minimal First Deployment (Phase 1: Render Bridge in Prod)**

1.  **Deploy Render Bridge:**
    *   **Service:** `aibizconnect-render-bridge` (Node.js/Playwright container).
    *   **Host:** Fly.io (or Render.com).
    *   **Files:** Dockerfile, `scripts/render-server.mjs`.
    *   **Configuration:** `SITE_RENDER_URL` env var in Vercel app points to this service.
    *   **Trigger:** Manual "Generate Site" in wizard/editor.
    *   **Verification:** Confirm `data-cs` is present and fidelity is high for imports in prod.
    *   **Impact:** This immediately unblocks high-fidelity imports in production, fulfilling D-141 and D-142.

**B. Upgrade Path (Phase 2: Autonomous Orchestration)**

1.  **Deploy Agent Orchestrator Worker:**
    *   **Service:** `aibizconnect-agent-orchestrator` (Node.js worker).
    *   **Host:** Fly.io (or Render.com), potentially co-located with render bridge.
    *   **Files:** Dockerfile, `services/agent-orchestrator/index.ts` (or similar entry point).
    *   **Configuration:** `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `CLAUDE_API_KEY` (if using SDK), `SETTINGS_ENCRYPTION_KEY` env vars.
    *   **Trigger:**
        *   **Initial:** Manual webhook from Next.js app (e.g., `/api/agent/trigger-build`) for "Generate Site" or tenant signup.
        *   **Future:** Supabase Queue for asynchronous, reliable task processing.
    *   **Orchestration Logic:**
        *   **Stitch:** Initially, the worker calls the Claude Agent SDK (if MCP issue is resolved) or directly calls the Stitch REST API (once available and platform credentials are set up).
        *   **Our App:** Calls `wizard-actions.generateWizardPages` (or `importStitchScreen`) via server-to-server HTTP POST to our Vercel app.
    *   **Verification:** Confirm full autonomous website generation/import in prod without manual intervention.
    *   **Impact:** Achieves "everything is autonomous" goal.

---
DECISION-LOG
[D-158] rule_render_bridge_hosting — Ruled self-hosting `render-server.mjs` as a small, always-on container (Fly.io/Render.com) for render bridge (status: ruled)
[D-159] rule_autonomous_agent_execution — Ruled a hybrid worker service wrapping Agent SDK and direct API calls for autonomous agent execution (status: ruled)
[D-160] rule_centralized_secrets_management — Ruled centralized secrets management strategy for all services (status: ruled)
[D-161] rule_minimal_deployment_upgrade_path — Ruled minimal first deployment for render bridge in prod and defined upgrade path for autonomous orchestration (status: ruled)