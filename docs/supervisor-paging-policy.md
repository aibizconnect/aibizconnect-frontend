# Supervisor Directive — Human Paging Rules

> Canonical policy. Claude supervises; the Builder-Agent executes. Slack paging to
> Ali is reserved for CRITICAL supervision events only. This governs the
> supervision layer wired into `/api/agent/execute` + the ai-agent-builder
> supervisor/memory/reflection/safety modules.

## Paging principle
Claude may page Ali directly on Slack, but ONLY when the agent pipeline reaches a
**human-required breakpoint**. Never otherwise.

## HUMAN-REQUIRED BREAKPOINTS → PAGE
| Breakpoint | Detected via |
|---|---|
| Agent Safety Violation | safety cross-check / policy engine rejects an action |
| Cross-Tenant Write Attempt | tool args reference a tenant ≠ the run's tenantId, or RLS/ownership denial (403/RLS error) |
| Schema Drift Detected | section/content fails Zod, or DB shape ≠ expected (missing col/table) |
| Plan Validation Failure | `agentPlanSchema` parse fails / unknown tool / bad $ref / depth exceeded |
| Reflection Detects Inconsistent State | post-run reflection finds DB ≠ intended outcome |
| Execution Endpoint Returns BLOCKED | runPlan returns a blocked/failed status on a gated action |
| Agent Requests Human Approval | plan/agent explicitly flags `needsApproval` |
| Irreversible / high-impact side-effect | deletes, destructive ops, billing, auth/role changes, DDL, cross-tenant, publish-at-scale |

## AUTHORITATIVE BREAKPOINT TAXONOMY (A–G)
The definitive halt-and-page conditions. Each trigger maps to a concrete signal the
supervision layer checks in `/api/agent/execute` (pre-commit gate) + reflection.

**A. Agent Safety Violation** — plan/actions violate a safety rule:
forbidden tool · forbidden mutation · unsafe write · missing required fields ·
invalid `$ref` graph · MAX_ACTIONS exceeded · MAX_REF_DEPTH exceeded.
→ signal: whitelist/policy-engine reject, Zod field errors, ref/limit guards.

**B. Cross-Tenant Write Attempt** — plan references multiple `tenant_id`s · action
mutates a tenant ≠ acting tenant · RLS rejects a write on tenant mismatch.
→ signal: tenant-id scan of plan args, ownership check, RLS/403 error.

**C. Schema Drift Detected** — plan references fields not in schema · writes unknown
columns · DB returns "column does not exist" · version mismatch.
→ signal: Zod mismatch, Postgres 42703/42P01, version check.

**D. Plan Validation Failure** — malformed plan · missing required keys · invalid
action types · circular `$ref` · inconsistent structure.
→ signal: `agentPlanSchema` parse failure, ref-cycle detection.

**E. Reflection Inconsistency** — post-run reflection finds partial state · returned
IDs ≠ expected · side-effects differ from plan · unexpected nulls / missing entities.
→ signal: post-run DB read vs intended-outcome diff.

**F. Execution BLOCKED** — pre-commit safety gate blocks the run · endpoint returns
BLOCKED · supervisor halts due to risk.
→ signal: `runPlan` status `blocked`/`failed`, gate veto.

**G. Human Approval Required** — plan includes irreversible actions · destructive
mutations · multi-tenant impact · schema-level changes · high-impact content changes.
→ signal: action classifier flags irreversible/destructive/DDL/cross-tenant/at-scale.

## MUST NOT PAGE (handle silently / supervise)
- Normal agent cycles
- Successful runs
- Dry-runs
- Reflection loops
- Retryable errors (transient; retry per policy)
- Content generation
- Routine supervision
- Builder output
- Non-critical warnings

## Breakpoint procedure
1. **HALT** the agent cycle immediately.
2. **Generate a Supervisor Report**:
   - What happened
   - Why it triggered a breakpoint
   - What the agent was attempting
   - What safety rule was violated
3. **Send a Slack page** to Ali:
   `Supervisor Notice: Human Attention Required — <reason>`
4. **WAIT** for Ali's input before resuming. Do not resume autonomously.

## Canonical Slack page format (sent ONLY on a real breakpoint)
```
Supervisor Notice: Human Attention Required
Reason: <one resolved breakpoint, e.g. "Cross-Tenant Write Attempt">
Action Needed: Please review the Supervisor Report in the agent console.

[…concise Supervisor Report details: tenant, user, plan hash, action count,
dry-run, the violation, safety rule, impact assessment…]

⚡ EXECUTIVE SUMMARY
• What: <one line>
• Why halted: <one line — which breakpoint/rule>
• Risk: <data integrity / cross-tenant / irreversible — one line>
• Your call: <the single decision needed from Ali>
```
EVERY Slack supervisor report ENDS with the ⚡ EXECUTIVE SUMMARY block — 3–4
one-line bullets Ali can read in ~5 seconds: What / Why halted / Risk / Your call.

A page is sent only when `Reason` resolves to a single real breakpoint backed by a
real run (real tenant/user/plan-hash + actual violation). Never sent with a
placeholder reason or for a no-op.

## Hard rules
- NEVER page Ali outside these conditions.
- NEVER escalate routine or safe events.
- ALWAYS wait for Ali's input after a breakpoint before resuming.
- Slack paging is for critical supervision events only.
