This is a significant milestone. The successful implementation of the Claude Design handoff across the AIBizConnect product UX is a testament to the pipeline's robustness.

---
**RULING 390: Concur with Claude Design Handoff Implementation.**

The Builder's report confirms successful implementation of the Claude Design handoff, including theme foundation, public welcome, rebuilt onboarding wizard, and restyled dashboard/LeftNav. The `tsc` clean status and build confirmation are noted. The `DESIGN.md` commitment is also acknowledged.

---
### 1. Deeper Wiring: Now or Later?

**RULING 391: Wire `goals` and `style` to Genesis Blueprint and Brand Presets NOW.**

*   **Decision:** **WIRE NOW.** The `goals` (→ `tenant_modules`) and `style` (→ `applyBrandPreset`) captured during onboarding **must be applied immediately** while the flow is fresh.
*   **Rationale:** This closes the loop on the onboarding wizard's purpose, ensuring that the tenant's choices directly influence their provisioned resources and brand. Delaying this wiring creates a "capture-but-don't-use" gap that undermines the wizard's value. It's a high-leverage, low-risk integration.
*   **Action:**
    1.  **`goals` → `tenant_modules`:** Map the tenant's selected goals (from the wizard) to the `INDUSTRY_PROFILES` (D-370) to determine the set of default and recommended `tenant_modules`. Update `tenant_modules` entries accordingly during `provisionTenant()`.
    2.  **`style` → `applyBrandPreset`:** Map the tenant's chosen style (from the wizard) to a `lib/design/token-presets/*.json` (D-388) and apply it to `website_brand_settings.brand_tokens_v2` using `applyBrandPreset(tenantId, websiteId, presetKey)` (D-387) during `runGenesisFinisher()`.
    3.  **Files to Change:** `app/onboarding/wizard-actions.ts`, `lib/server/tenant-blueprint.ts`, `lib/server/genesis-finisher.ts`.

---
### 2. `.abc-ds` Scoping vs. Full Migration

**RULING 392: Keep Parallel Scoped System for Now; Plan for Future Consolidation.**

*   **Decision:** **Keep the parallel scoped system (`.abc-ds`) for now**. Plan for a future, phased migration of the app's Tailwind `@theme` to these tokens.
*   **Rationale:** A full migration of the entire app's Tailwind `@theme` to the new design system tokens is a massive undertaking with high regression risk, especially for a live product. It touches every UI component. The current scoped approach provides immediate visual consistency for the new product UX without breaking existing functionality.
*   **Action:**
    1.  **Immediate:** Continue using the `.abc-ds` scope for new UI components and the product UX.
    2.  **Future Plan:** Document a phased plan for migrating existing Tailwind components to use the new design system tokens and CSS variables. This would involve:
        *   Creating a mapping layer from Tailwind classes to design tokens.
        *   Gradually refactoring components.
        *   Eventually deprecating the old Tailwind `@theme` configuration.
*   **What to NOT build:** Do NOT attempt a full, app-wide Tailwind `@theme` migration in this phase.

---
### 3. AI Assistant Drawer

**RULING 393: Wire AI Assistant Drawer to Real Agent with Existing Gating Posture.**

*   **Decision:** The "Ask AIBiz" drawer **must be wired to the real agent** (D-266) with the **existing gating posture** (D-270).
*   **Rationale:** This is a core "AI Business OS" feature. Even with the automations engine gated (G3), the agent can still provide valuable information, execute read-only tools, and perform lead capture/booking (using the `PUBLIC_TOOLSET`).
*   **Action:**
    1.  **Wiring:** The drawer's composer will send user input to `POST /api/agent-chat` (D-271) for the appropriate agent.
    2.  **Gating Posture:** The agent will run with the `PUBLIC_TOOLSET` (D-270) for anonymous interactions. For authenticated users, the agent can potentially access more tools based on user roles/permissions (future enhancement).
    3.  **Conversation Storage:** Agent conversations will be stored in `tenant_agent_conversations` (D-279).
    4.  **Files to Change:** Dashboard UI, `components/ChatWidget.tsx` (if reused), `app/api/agent-chat/route.ts`.
*   **What to NOT build:** Do NOT change the `PUBLIC_TOOLSET` or bypass existing `emailReady()`/`twilioReady()` gates. The agent's capabilities are limited by the defined toolset and tenant configurations.

---
**Missing Items:**

*   **Onboarding Wizard Progress:** Ensure the wizard visually tracks progress (e.g., "Step 1 of 4") and persists state across refreshes/browser closes (e.g., via URL params or local storage) so users can resume.

---
DECISION-LOG
[D-390] concur_claude_design_handoff_implementation — Concurred with Claude Design handoff implementation (status: concurred)
[D-391] rule_wire_goals_style_now — Ruled to wire `goals` and `style` to Genesis Blueprint and Brand Presets NOW (status: ruled)
[D-392] rule_keep_parallel_scoped_system_now_plan_consolidation — Ruled to keep parallel scoped system for now, plan for future consolidation (status: ruled)
[D-393] rule_wire_ai_assistant_drawer_real_agent_existing_gating — Ruled to wire AI assistant drawer to real agent with existing gating posture (status: ruled)