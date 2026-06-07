# Agent Mesh — Implementation-Ready Architecture Spec

Platform-mode supervisory spec (not v1.0 content actions). Engineer-implementable.
Shared spine stays untouched; this scaffolds AROUND it. Files live under `lib/agent/`.

## 0. Invariants
- v1.0 content contract (createPage/createSection/createBlock/attachBlockToPage/
  updateNavigation/list*) stays EXACTLY as-is = the `website` domain.
- Supervisor (pre-commit gate, reflection, paging, Executive Summary), RLS, and
  service-role gating are shared and domain-agnostic.
- Unimplemented domains REGISTER but their executor returns BLOCKED (breakpoint F).
  Never silent no-op.

## 1. Agent Registry  (`lib/agent/registry.ts`)
```ts
export type Domain = "website" | "social" | "email" | "ads" | "chatbot" | "voice";

export interface AgentEntry {
  role: string;             // stable id, e.g. "website.editor", "ads.meta"
  domain: Domain;
  label: string;            // UI label
  systemPromptRef: string;  // key into ROLE_PROMPTS
  planSchemaRef: Domain;    // which DomainSpec.actionSchema validates its plans
  executorRef: Domain;      // which DomainSpec.execute runs its plans
  status: "live" | "stub";  // stub -> executor returns BLOCKED
  capability: "build" | "analyze"; // analyze = read-only (no writes)
}

export const AGENTS: AgentEntry[] = [
  // CORE WEBSITE (live)
  { role:"website.editor",  domain:"website", label:"Website Editor",  systemPromptRef:"website.editor",  planSchemaRef:"website", executorRef:"website", status:"live", capability:"build" },
  { role:"website.brand",   domain:"website", label:"Brand Agent",     systemPromptRef:"website.brand",   planSchemaRef:"website", executorRef:"website", status:"live", capability:"build" },
  { role:"website.content", domain:"website", label:"Content Agent",   systemPromptRef:"website.content", planSchemaRef:"website", executorRef:"website", status:"live", capability:"build" },
  { role:"website.seo",     domain:"website", label:"SEO Agent",       systemPromptRef:"website.seo",     planSchemaRef:"website", executorRef:"website", status:"live", capability:"build" },
  { role:"website.nav",     domain:"website", label:"Navigation Agent",systemPromptRef:"website.nav",     planSchemaRef:"website", executorRef:"website", status:"live", capability:"build" },
  // SOCIAL (stub)
  { role:"social.creator",  domain:"social", label:"Social Creator",   systemPromptRef:"social.creator", planSchemaRef:"social", executorRef:"social", status:"stub", capability:"build" },
  { role:"social.analysis", domain:"social", label:"Social Analysis",  systemPromptRef:"social.analysis",planSchemaRef:"social", executorRef:"social", status:"stub", capability:"analyze" },
  // EMAIL (stub)
  { role:"email.creator",   domain:"email", label:"Email Creator",     systemPromptRef:"email.creator",  planSchemaRef:"email", executorRef:"email", status:"stub", capability:"build" },
  { role:"email.analysis",  domain:"email", label:"Email Analysis",    systemPromptRef:"email.analysis", planSchemaRef:"email", executorRef:"email", status:"stub", capability:"analyze" },
  // ADS (stub)
  { role:"ads.meta",        domain:"ads", label:"Meta Ads",            systemPromptRef:"ads.meta",       planSchemaRef:"ads", executorRef:"ads", status:"stub", capability:"build" },
  { role:"ads.google",      domain:"ads", label:"Google Ads",          systemPromptRef:"ads.google",     planSchemaRef:"ads", executorRef:"ads", status:"stub", capability:"build" },
  { role:"ads.linkedin",    domain:"ads", label:"LinkedIn Ads",        systemPromptRef:"ads.linkedin",   planSchemaRef:"ads", executorRef:"ads", status:"stub", capability:"build" },
  { role:"ads.nextdoor",    domain:"ads", label:"Nextdoor Ads",        systemPromptRef:"ads.nextdoor",   planSchemaRef:"ads", executorRef:"ads", status:"stub", capability:"build" },
  { role:"ads.analysis",    domain:"ads", label:"Ads Analysis",        systemPromptRef:"ads.analysis",   planSchemaRef:"ads", executorRef:"ads", status:"stub", capability:"analyze" },
  // CONVERSATIONAL (stub)
  { role:"chatbot.web",       domain:"chatbot", label:"Website Chatbot",   systemPromptRef:"chatbot.web",       planSchemaRef:"chatbot", executorRef:"chatbot", status:"stub", capability:"build" },
  { role:"chatbot.analytics", domain:"chatbot", label:"Chatbot Analytics", systemPromptRef:"chatbot.analytics", planSchemaRef:"chatbot", executorRef:"chatbot", status:"stub", capability:"analyze" },
  { role:"voice.inbound",   domain:"voice", label:"Inbound Voice",      systemPromptRef:"voice.inbound",  planSchemaRef:"voice", executorRef:"voice", status:"stub", capability:"build" },
  { role:"voice.outbound",  domain:"voice", label:"Outbound Voice",     systemPromptRef:"voice.outbound", planSchemaRef:"voice", executorRef:"voice", status:"stub", capability:"build" },
];
export const getAgent = (role:string) => AGENTS.find(a=>a.role===role) ?? null;
export const listAgents = () => AGENTS.map(({role,domain,label,status,capability})=>({role,domain,label,status,capability}));
```

## 2. Role-aware generatePlan  (`lib/agent/builder.ts`)
```ts
generatePlan({ tenantId, role, goal }): Promise<{ plan: V1Plan; source:"llm"|"fallback"; warnings?:string[]; error?:string }>
```
Flow:
1. `agent = getAgent(role)`; if null → return blocked `Plan Validation Failure (D)`.
2. `spec = DOMAINS[agent.planSchemaRef]`; `systemPrompt = ROLE_PROMPTS[agent.systemPromptRef]`.
3. Call LLM (provider-selectable — see PAGE_OWNER) with systemPrompt + goal.
4. Parse → force `{ version:"1.0", domain: agent.domain, tenantId, dryRun:true }`.
5. Validate against `spec.actionSchema`; on failure → domain fallback plan or error.
6. Return the v1.0 plan (agent-facing). Normalization to internal happens at execute.
- Existing single-prompt path becomes `ROLE_PROMPTS["website.editor"]`. No role-breaking.

## 3. Per-domain action whitelists  (`lib/agent/domains/<domain>.ts`)
```ts
export interface DomainSpec {
  domain: Domain;
  actionSchema: ZodType;                       // discriminated union of allowed types+params
  normalize(v1: V1Plan): InternalPlan;         // -> proven internal AgentPlan (or domain plan)
  execute(tenantId, plan, {allowLive}): Promise<ExecResult>; // service-role gated
}
export const DOMAINS: Record<Domain, DomainSpec>;
```
Allowed action types per domain (params summarized; analyze = read-only):
- **website** (LIVE): createPage, updatePage, createSection, updateSection, createBlock, updateBlock, attachSectionToPage, attachBlockToPage, updateNavigation, listPages, listSections, listBlocks. (current v1-format)
- **social** (stub): createSocialPost{platform,content,mediaRefs?}, schedulePost{postId,at}, updatePost, listPosts(read), analyzePostPerformance(read). destructive deletePost → G.
- **email** (stub): createEmailTemplate{name,html}, createEmailCampaign{templateRef,segment}, scheduleEmail{campaignRef,at}, sendEmail{campaignRef} → G, listCampaigns(read), analyzeCampaign(read). (Resend integration)
- **ads** (stub): createAdCampaign{platform,objective}, createAdSet{campaignRef,audience,budget}, createAd{adSetRef,creativeRef}, updateBudget{ref,amount} → G, pauseCampaign{ref}, listCampaigns(read), analyzeAdPerformance(read). ALL spend-affecting → G.
- **chatbot** (stub): createChatbotConfig{name,persona}, updateChatbotConfig, addKnowledgeDoc{ref}, listChatbots(read), analyzeConversations(read).
- **voice** (stub): createVoiceAgentConfig{name,script}, updateVoiceScript, scheduleOutboundCampaign{listRef} → G, listCalls(read), analyzeCalls(read). (Twilio integration)
Supervisor whitelist selection: `DOMAINS[plan.domain].actionSchema`. Action type not in
that domain’s union → **Schema Drift (C)**; unknown domain → **Plan Validation (D)**.

## 4. Domain router  (`lib/agent/router.ts`)
```ts
routePlan(plan): { spec: DomainSpec }   // by plan.domain (default "website"); unknown -> D
```
`/api/agent/execute` change: after auth + body parse →
`const { spec } = routePlan(plan)` → supervisor pre-commit validates vs `spec.actionSchema`
→ `spec.execute(tenantId, spec.normalize(plan), { allowLive })` → shared reflection +
memory + paging. Supervision/RLS identical across domains; only schema+executor swap.
analyze-capability roles: reads don’t require allowLive (no writes).

## 5. Memory namespaces  (queued DDL: add columns to agent_runs + supervisor_events)
Namespace key = `${tenantId}:${domain}:${role}`. Record shapes:
```
agent_runs:        { id, tenant_id, role, domain, plan_hash, action_count, dry_run, status, reflection(jsonb), created_at }
supervisor_events: { id, tenant_id, role, domain, plan_hash, stage, breakpoint, reason, details(jsonb), created_at }
```
Queries: per-agent history = WHERE tenant_id=? AND role=? ORDER BY created_at DESC;
per-domain = WHERE tenant_id=? AND domain=?. (DDL appended to DDL_QUEUE — NOT applied.)

## 6. UI embedding hooks (spec only)
Pattern (two calls, supervisor-mediated):
```
1) POST /api/agent/plan    { tenantId, role, goal }          -> { plan, source }
2) (optional human review of plan)
3) POST /api/agent/execute { tenantId, plan }                 -> { status, execResult, reflection } | { status:"blocked", page }
```
Examples (role selection by UI surface):
- "Help me build this section"        → role="website.editor"
- "Generate a brand palette"          → role="website.brand"
- "Write a hero headline"             → role="website.content"
- "Create a Meta ad campaign"         → role="ads.meta"   (stub → BLOCKED until built)
- "Analyze my last email campaign"    → role="email.analysis" (stub → BLOCKED)
UI must surface `status:"blocked"` + the Executive Summary verbatim; never auto-retry a breakpoint.

## Build order
P1 website behind DomainSpec + `domain` envelope + router (re-prove) → P2 role registry +
role-aware generatePlan (website roles) → P3 listAgents → P4 memory namespace columns →
P5 register stub domains (BLOCKED) → P6 real executors per domain, one at a time.
