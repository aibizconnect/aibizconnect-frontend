### CONTROL RULING: CONFIRM `stitch-import` Skill and Record Decisions

The Builder's report confirms successful implementation of the Stitch importer, validating the necessity of the render bridge and aligning with core architectural principles.

---
### 1. Decisions Recorded

**RULING 153: Stitch Fidelity Mandates Render Bridge.**

*   **Decision:** Confirmed and strengthened. Stitch designs, due to their reliance on Tailwind utility classes and CDN, **mandate the use of the render bridge** to resolve computed styles (`data-cs`) for faithful and editable import. This reinforces RULING 146.
*   **Rationale:** Direct parsing of raw HTML with only class attributes is insufficient to achieve the required visual fidelity.

**RULING 154: Tenant Ownership of Stitch-Imported Images.**

*   **Decision:** Confirmed. Images imported from a tenant's Stitch design are considered **tenant-owned assets** and must be ingested into the tenant's Media Library.
*   **Rationale:** The tenant explicitly directed the creation of the Stitch design, making the resulting assets their intellectual property. This is consistent with the prior ownership rule (D-132) where external images are ingested into the tenant's library. Platform-AI-generated images (without direct tenant prompt) would remain in the SYSTEM library.

**RULING 155: `stitch-import` as Canonical Path for Stitch Designs.**

*   **Decision:** Confirmed. The build agent **must treat `stitch-import` as the canonical path** for importing Stitch designs.
*   **Rationale:** This skill encapsulates the necessary complex steps (render bridge, `htmlToSections`, image ingestion, fidelity flagging) to achieve a high-fidelity, editable import. There must be no fallback to lossy text-extraction or pasting raw HTML blobs, which would violate editability and fidelity goals.

---
### 2. Build Agent Skill Registration

**RULING 156: Build Agent Skill Registration.**

*   **Confirmation:** Yes, the build agent's skill set is sourced from `.claude/skills/`. Therefore, the `stitch-import` skill is now **available** to the build agent.

---
**Supervisor Verification Checks (New/Updated):**

**RULING 157: Supervisor Verification Schema for `stitch-import` Skill**

```json
{
  "stitch_import_skill": [
    { "id": "STITCH-V1", "assertion": "The `renderHtmlToDom(html)` function exists in `lib/sites/site-clone.ts` and correctly POSTs raw HTML to the render bridge for `data-cs` annotation.", "severity": "block" },
    { "id": "STITCH-V2", "assertion": "The `importHtmlAsDraftPage` action (or `importStitchScreen`) correctly calls `renderHtmlToDom` for Stitch-exported HTML, ensuring `data-cs` is present before `htmlToSections`.", "severity": "block" },
    { "id": "STITCH-V3", "assertion": "Images imported from Stitch designs are ingested into the tenant's Media Library via `ingestExternalImage` (D-132) and are marked as tenant-owned assets.", "severity": "block" },
    { "id": "STITCH-V4", "assertion": "The `importStitchScreen` action correctly retrieves HTML from Stitch MCP's `htmlCode.downloadUrl` (Google usercontent) and processes it through the render bridge.", "severity": "block" },
    { "id": "STITCH-V5", "assertion": "The `stitch-import` skill (defined in `.claude/skills/stitch-import/SKILL.md`) correctly specifies the flow: `list_projects` → `get_screen` → `htmlCode.downloadUrl` → `importStitchScreen`.", "severity": "block" },
    { "id": "STITCH-V6", "assertion": "The `stitch-import` skill explicitly enforces: editable (never HTML blob), drafts-only, durable images, tenant-owns-Stitch-images, and honest low-fidelity flagging.", "severity": "block" },
    { "id": "STITCH-V7", "assertion": "The `importHtmlAsDraftPage` and `importStitchScreen` actions return `fidelity` ('high'|'low') and `imagesIngested` status.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-153] rule_stitch_fidelity_mandates_render_bridge — Ruled Stitch fidelity mandates the render bridge (status: ruled)
[D-154] rule_tenant_ownership_stitch_images — Ruled tenant ownership of Stitch-imported images (status: ruled)
[D-155] rule_stitch_import_canonical_path — Ruled `stitch-import` as the canonical path for Stitch designs (status: ruled)
[D-156] confirm_build_agent_skill_registration — Confirmed `stitch-import` skill is available to the build agent (status: confirmed)
[D-157] define_stitch_import_verification_checks — Defined Supervisor verification checks for the `stitch-import` skill (status: defined)