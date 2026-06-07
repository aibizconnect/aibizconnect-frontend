# Supervisory Architecture Plan — Agent Mesh Scaffolding

Platform-mode deliverable (not a v1.0 executable plan). Specifies what the
engineer/Builder-Agent must implement to support the full mesh, aligned with the
existing v1.0 engine + supervised execution + reflection + memory + RLS.

## 0. Core principle
ONE shared spine, MANY domain-scoped action sets.
- Shared (domain-agnostic, already built): v1.0 envelope, supervisor pre-commit
  gate, reflection, memory writers, RLS, service-role gating, A–G taxonomy + paging.
- Per-domain (new): action whitelist (Zod) + params + executor + role prompts.

## 1. v1.0 envelope change — add `domain`
The envelope gains a `domain` discriminator so the router knows which whitelist +
executor to use. Backward-compatible default `"website"`.
```
{ "version":"1.0", "domain":"website"|"ads"|"email"|"social"|"voice"|"chatbot",
  "tenantId":uuid, "dryRun":bool, "actions":[ {id,type,params,ref} ] }
```
Change: extend `v1PlanSchema` with `domain` (default "website").

## 2. Per-domain action whitelists + domain registry
`lib/agent/domains/<domain>.ts` each exporting:
```
interface DomainSpec {
  domain: string;
  actionSchema: ZodType;                 // valid action types + params for THIS domain
  normalize(v1: V1Plan): InternalPlan;   // domain plan -> its internal executable form
  execute(tenantId, plan, {allowLive}): Promise<ExecResult>; // service-role gated
  reads?: Record<string, ReadFn>;        // list* style read tools
}
export const DOMAINS: Record<string, DomainSpec>
```
- `website` = our current engine (v1-format.normalizeV1Plan + execute.runPlan), refactored behind this interface.
- `ads | email | social | voice | chatbot` = registered with their own whitelists, but
  `execute` starts as a STUB that returns status `blocked` -> breakpoint F (Execution
  BLOCKED) until implemented. This lets the registry list every agent WITHOUT letting
  unimplemented domains write. Safe by construction.

## 3. Role-aware generatePlan(role, goal) + role registry
`lib/agent/roles/registry.ts`:
```
interface AgentRoleDef { role: string; domain: string; label: string; systemPrompt: string; status: "live"|"stub"; }
export const ROLES: Record<string, AgentRoleDef>
```
Roles (initial): website.editor, website.brand, website.content, website.seo,
website.navigation (domain "website", live) + ads.meta, ads.google, ads.linkedin,
ads.nextdoor, ads.analysis, email.creator, email.analysis, social.creator,
social.analysis, chatbot.web, chatbot.analytics, voice.inbound, voice.outbound
(stub).
`generatePlan(role, goal, tenantId)`: look up role -> domain + systemPrompt -> LLM
-> v1.0 plan tagged with that domain -> validate against DOMAINS[domain].actionSchema.
(Current single-prompt generatePlan becomes the website.editor role prompt.)

## 4. Agent registry (the mesh manifest)
`lib/agent/registry.ts`: AGENTS = derived from ROLES, exposes
`listAgents()` (role, domain, label, status) for the UI + supervisor. One source of
truth for "which agents exist and are they live".

## 5. Domain router
`lib/agent/router.ts`:
```
routePlan(plan): { spec: DomainSpec }  // by plan.domain; unknown domain -> Plan Validation Failure (D)
```
Used by BOTH:
- supervisor pre-commit (validate against the RIGHT domain's actionSchema), and
- /api/agent/execute (dispatch to the right domain executor).
Wrong-domain action (e.g. an "ads" action in a "website" plan) -> Schema Drift (C).

## 6. Memory namespaces
Namespace key = `${tenantId}:${domain}:${role}`. The queued `agent_runs` +
`supervisor_events` gain `domain` + `role` columns; memory reads are scoped to the
namespace so each agent is personalized per tenant. (DDL: add `domain text`,
`role text` to those queued tables — append to DDL_QUEUE, not applied.)

## 7. Supervisor alignment (A–G preserved, now domain-aware)
- D Plan Validation: validate against DOMAINS[plan.domain].actionSchema.
- A Safety: whitelist = that domain's allowed types.
- B Cross-Tenant: unchanged (tenant_users membership) — shared.
- C Schema Drift: action type not in the plan's domain whitelist.
- E Reflection: domain executor reports consistency; shared reflector + domain hook.
- F Execution BLOCKED: stub/unimplemented domain executor returns blocked.
- G Human Approval: high-impact per domain (e.g. publishing ads spend = G by default).
Paging + Executive Summary unchanged.

## 8. Build order (phases)
1. Refactor current website engine behind `DomainSpec` (no behavior change) + add
   `domain` to v1 envelope + router. Re-prove the website dry-run/live.
2. Role registry + role-aware generatePlan (website roles first). Re-prove per-role.
3. Agent registry + listAgents (powers UI embedding).
4. Memory namespace columns (DDL queued) + namespaced reads.
5. Register stub domains (ads/email/social/voice/chatbot) returning BLOCKED.
6. (Later, per domain) implement real executors + integrations, one domain at a time,
   each under the same supervisor.

## 9. Open decisions / risks
- `domain` on the envelope vs inferring from role — recommend explicit `domain` (router clarity).
- Stub domains MUST return blocked (F), never silently no-op, so the supervisor halts.
- Per-domain executors that call external APIs (Meta/Google/Resend/Twilio) need their
  own credential handling + are high-impact (G) — gated, not auto-run.
- Keep Path 1 (page-scoped sections) until a Path-2 trigger fires (separate doc).
