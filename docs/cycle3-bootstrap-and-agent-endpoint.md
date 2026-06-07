# Cycle 3 — Tenant/Admin Bootstrap + Agent Execution Endpoint

> Symbolic only. `TENANT_UUID` is a placeholder — no real UUIDs, no execution,
> no DDL applied. Any schema thoughts are quarantined at the bottom.

## 0. Grounding constraints (from the live audit)

- Auth is **external** (custom JWT against `NEXT_PUBLIC_API_URL`), **not** Supabase Auth.
- There is **no `tenants` table, no `users` table, no `roles` table, no FK on `tenant_id`**
  in this Supabase. Tenant + user identity live in the external backend.
- Therefore the admin/membership scripts below are **templates with explicit wiring
  points** (external API or a future table). They refuse to run until configured.
  They do **not** assume tenant identity and do **not** fabricate ids.

---

## 1. Role matrix

| Role | Scope | Pages/Sections | Brand/Theme | Nav | Global blocks | Media | Users/Roles | Billing | Publish | Agent exec |
|------|-------|----------------|-------------|-----|---------------|-------|-------------|---------|---------|-----------|
| **superadmin** | all tenants | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD (any tenant) | manage | yes | yes |
| **admin** | own tenant | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD (own tenant) | manage | yes | yes |
| **editor** | own tenant | CRUD | edit | CRUD | CRUD | CRUD | none | none | yes | yes (own tenant) |
| **viewer** | own tenant | read | read | read | read | read | none | none | no | no |

Notes:
- Roles are **tenant-scoped** except `superadmin` (cross-tenant).
- Enforcement today is the external backend's job (interim-open RLS). A future phase
  can move this into JWT claims / verified policies.
- Canonical role identifiers: `superadmin | admin | editor | viewer`.

---

## 2–4. Bootstrap scripts

See the runnable script files:
- `scripts/create-admin-user.mjs` — creates `admin@aibizconnect.app` (template; external-auth wiring point).
- `scripts/attach-admin-to-tenant.mjs` — attaches a user to `TENANT_UUID` with a role.
- `scripts/bootstrap-brand-settings.mjs` — upserts default brand/theme for `TENANT_UUID` (optional).

## 5–6. Seed + rollback (ALREADY EXIST — not regenerated)
- `scripts/cycle2-build.mjs` — seeds the Cycle-2 pages/sections/blocks/nav (`--dry-run` + live; rejects non-UUID tenants).
- `scripts/cycle2-rollback.mjs` — deletes all builder rows for a tenant (`--yes` to commit).

---

## 7. Cycle 3 — Internal Agent Execution Endpoint

### 7.1 Endpoint spec

```
POST /api/agent/execute        (internal; same-origin only)
Auth:  Authorization: Bearer <external JWT>   (extractUserId -> sub)
Body:  { tenantId: string(uuid), plan: AgentPlan }
```

- Resolves the caller via the external JWT; **403** unless the caller's role for
  `tenantId` is `admin | editor | superadmin`.
- Executes a **whitelisted** Builder-Agent plan (no SQL, no DDL, no arbitrary code).
- `dryRun: true` short-circuits all writes and returns the resolved plan.

### 7.2 Zod validation schema

Hard limits (anti-abuse): `MAX_ACTIONS = 50` (plan size cap) and
`MAX_REF_DEPTH = 5` (max `$ref` resolution depth — prevents circular/malicious refs).

```ts
import { z } from "zod";

export const MAX_ACTIONS = 50;     // reject plans with more than 50 actions
export const MAX_REF_DEPTH = 5;    // max depth when resolving "$name.id" chains

const uuid = z.string().uuid();
// $ref to a prior step output, e.g. "$home.id"
const ref = z.string().regex(/^\$[a-zA-Z0-9_.-]+$/);
const idOrRef = z.union([uuid, ref]);

// Whitelisted tools ONLY. Anything else is rejected.
const action = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("createPage"), bind: z.string().optional(),
    args: z.object({ title: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), isHome: z.boolean().optional() }) }),
  z.object({ tool: z.literal("saveDraft"),
    args: z.object({ pageId: idOrRef, draft_sections: z.array(z.any()).optional(), draft_title: z.string().optional(), draft_slug: z.string().optional(), draft_seo: z.record(z.any()).optional() }) }),
  z.object({ tool: z.literal("createGlobalBlock"), bind: z.string().optional(),
    args: z.object({ name: z.string(), type: z.string(), content: z.any() }) }),
  z.object({ tool: z.literal("attachBlockToPage"),
    args: z.object({ pageId: idOrRef, blockId: idOrRef }) }),
  z.object({ tool: z.literal("createNavItem"), bind: z.string().optional(),
    args: z.object({ menuKey: z.string().default("primary"), label: z.string(), page_id: idOrRef.optional(), url: z.string().optional() }) }),
  z.object({ tool: z.literal("publishGlobalBlock"), args: z.object({ blockId: idOrRef }) }),
  z.object({ tool: z.literal("publishPage"),         args: z.object({ pageId: idOrRef }) }),
]);

export const agentPlanSchema = z.object({
  goal: z.string().optional(),
  dryRun: z.boolean().default(false),
  actions: z.array(action).min(1).max(MAX_ACTIONS),
});
export type AgentPlan = z.infer<typeof agentPlanSchema>;
```

### 7.3 Execution loop (pseudocode)

```
function execute(tenantId, plan, caller):
  assert role(caller, tenantId) in {admin, editor, superadmin}   // else 403
  parsed = agentPlanSchema.parse(plan)                           // else 400
  ctx = {}            // bind-name -> { id }
  results = []

  for (i, step) in enumerate(parsed.actions):
    args = resolveRefs(step.args, ctx)        // "$home.id" -> ctx.home.id
    if parsed.dryRun:
       results.push({ step:i, tool:step.tool, args, result:"(dry)" }); continue
    try:
       out = await SERVER_ACTIONS[step.tool](tenantId, args)   // whitelist dispatch
       if step.bind: ctx[step.bind] = out                       // e.g. ctx.home = {id}
       results.push({ step:i, tool:step.tool, ok:true, result: out })
    catch e:
       results.push({ step:i, tool:step.tool, ok:false, error: e.message })
       if FATAL_TOOLS.has(step.tool): 
          return { status:"failed", results, rollbackHint: tenantId }
       // else continue (best-effort) per error model

  return { status: allOk(results) ? "ok" : "partial", results }
```

- `resolveRefs` only resolves `$name.id` tokens already produced in `ctx`, to a
  maximum chain depth of `MAX_REF_DEPTH (5)`; deeper/circular refs → **400**. An
  unresolved ref is a **400** (no silent nulls).
- `SERVER_ACTIONS` is a fixed object literal — the `tool` string never reaches
  `eval`/dynamic import.

### 7.4 Error model

```ts
type StepResult =
  | { step: number; tool: string; ok: true;  result: unknown }
  | { step: number; tool: string; ok: false; error: string; code: ErrorCode };

type ErrorCode =
  | "UNAUTHORIZED"      // 401 no/invalid JWT
  | "FORBIDDEN"         // 403 role/tenant mismatch
  | "VALIDATION"        // 400 zod / unresolved ref / unknown tool
  | "CONFLICT"          // 409 slug uniqueness, etc.
  | "ACTION_FAILED"     // 500 server action threw
  | "ABORTED";          // fatal step stopped the run
```

- **No DB transaction** spans server actions (Supabase calls are independent).
  On a fatal failure the endpoint returns a `rollbackHint`; cleanup uses
  `cycle2-rollback.mjs` semantics (delete builder rows for the tenant) — never
  partial magic. Idempotency is the caller's responsibility (re-running may create
  duplicates unless slugs collide and 409).

### 7.5 Security notes

- **Whitelist-only dispatch.** Unknown `tool` → 400. No SQL/DDL/shell ever accepted.
- **Tenant scoping enforced server-side**, not from the body alone: re-resolve the
  caller's role for `tenantId`; reject cross-tenant.
- **Ref-injection safe:** `$ref` regex-restricted; resolution limited to in-run ctx.
- **Limits:** `actions.max(100)`, body size cap, per-tenant rate limit, timeout.
- **No secrets in responses;** error messages sanitized (no raw Postgres internals to clients).
- **dryRun default false** but recommended for first call from any new client.
- Interim-open RLS means the DB won't stop a bug — the endpoint is the gate.

### 7.6 Request / response contract

```jsonc
// Request
{
  "tenantId": "TENANT_UUID",
  "plan": {
    "dryRun": true,
    "actions": [
      { "tool": "createPage", "bind": "home", "args": { "title": "Home", "slug": "home", "isHome": true } },
      { "tool": "saveDraft", "args": { "pageId": "$home.id", "draft_sections": [ /* schema-valid */ ] } },
      { "tool": "publishPage", "args": { "pageId": "$home.id" } }
    ]
  }
}

// Response
{
  "status": "ok",                 // ok | partial | failed
  "tenantId": "TENANT_UUID",
  "dryRun": true,
  "results": [
    { "step": 0, "tool": "createPage", "ok": true, "result": { "id": "..." } },
    { "step": 1, "tool": "saveDraft",  "ok": true, "result": { "ok": true } },
    { "step": 2, "tool": "publishPage","ok": true, "result": { "published": true } }
  ],
  "errors": []
}
```

---

## DDL (quarantined)

> NOT applied. NOT in the DDL queue. Thoughts only — to support roles/membership,
> a future phase MIGHT introduce the following. Requires Ali's review + the
> DDL-queue protocol before anything is generated for real.

- A `tenant_users` membership table: `(tenant_id uuid, user_id uuid, role text check (role in ('superadmin','admin','editor','viewer')), primary key (tenant_id, user_id))`.
- A `roles`/claims source if RLS is later driven by verified JWT claims.
- FKs `tenant_id -> tenants(id)` once a canonical tenants table exists.
- A partial unique index enforcing one `is_home = true` per tenant.

None of the above is created here. If pursued, it goes through the DDL queue and
waits for an explicit "Done".
