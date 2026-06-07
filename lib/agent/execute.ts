import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { agentPlanSchema, MAX_REF_DEPTH, type AgentPlan } from "./plan-schema";

/**
 * Agent execution (Path B): the SUPERVISED agent write path. Writes run via a
 * SERVICE-ROLE client, scoped to the verified tenantId — only after the
 * supervisor pre-commit gate has confirmed tenant ownership + safety, and only
 * when allowLive (AGENT_EXEC_LIVE) AND plan.dryRun === false. RLS stays strict
 * for everyone else; the supervisor is the gate that protects the service role.
 *
 * Dry-run simulates everything (no client, no writes), synthesizing ids so $refs
 * resolve.
 */

function service(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── $ref resolution (depth-capped) ───────────────────────────────────────────
function resolveValue(value: unknown, ctx: Record<string, any>, depth = 0): unknown {
  if (typeof value === "string" && value.startsWith("$")) {
    if (depth >= MAX_REF_DEPTH) throw new Error(`ref depth exceeded for ${value}`);
    const [name, key] = value.slice(1).split(".");
    if (!(name in ctx)) throw new Error(`unresolved ref: ${value}`);
    const resolved = ctx[name]?.[key];
    if (resolved === undefined) throw new Error(`unresolved ref: ${value}`);
    return resolveValue(resolved, ctx, depth + 1);
  }
  return value;
}
function resolveArgs(args: Record<string, any>, ctx: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(args)) out[k] = resolveValue(v, ctx, 0);
  return out;
}

export type StepResult =
  | { step: number; tool: string; ok: true; result: unknown }
  | { step: number; tool: string; ok: false; error: string };

export interface ExecuteOptions {
  /** When false (or unset) NO live writes occur regardless of plan.dryRun. */
  allowLive?: boolean;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Tool implementations (service-role, tenant-scoped) ───────────────────────
async function tool_createPage(sb: SupabaseClient, tenantId: string, a: any) {
  const title = String(a.title ?? "").trim();
  const slug = String(a.slug ?? "").trim().toLowerCase();
  if (!title) throw new Error("title required");
  if (!SLUG_RE.test(slug)) throw new Error("invalid slug");
  if (a.isHome) await sb.from("website_pages").update({ is_home: false }).eq("tenant_id", tenantId).eq("is_home", true);
  const { count } = await sb.from("website_pages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { data, error } = await sb.from("website_pages").insert({
    tenant_id: tenantId, title, slug, order_index: count ?? 0, is_home: !!a.isHome,
    draft_title: title, draft_slug: slug, draft_seo: {}, draft_sections: [],
  }).select("id, title, slug, order_index, is_home").single();
  if (error) throw new Error(error.message);
  return data;
}
async function tool_saveDraft(sb: SupabaseClient, tenantId: string, a: any) {
  const patch: Record<string, any> = {};
  for (const k of ["draft_title", "draft_slug", "draft_seo", "draft_sections"]) if (a[k] !== undefined) patch[k] = a[k];
  const { error } = await sb.from("website_pages").update(patch).eq("id", a.pageId).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function tool_createGlobalBlock(sb: SupabaseClient, tenantId: string, a: any) {
  const { data, error } = await sb.from("website_global_blocks")
    .insert({ tenant_id: tenantId, name: a.name, type: a.type, content: a.content })
    .select("id, name, type").single();
  if (error) throw new Error(error.message);
  return data;
}
async function tool_attachBlockToPage(sb: SupabaseClient, tenantId: string, a: any) {
  const { count } = await sb.from("website_page_block_refs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("page_id", a.pageId);
  const { error } = await sb.from("website_page_block_refs").insert({ tenant_id: tenantId, page_id: a.pageId, block_id: a.blockId, order_index: count ?? 0 });
  if (error) throw new Error(error.message);
  return { ok: true };
}
async function tool_createNavItem(sb: SupabaseClient, tenantId: string, a: any) {
  const menuKey = a.menuKey ?? "primary";
  const { count } = await sb.from("website_navigation").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("menu_key", menuKey);
  const { data, error } = await sb.from("website_navigation").insert({
    tenant_id: tenantId, menu_key: menuKey, label: "New link",
    page_id: a.kind === "internal" ? a.target : null,
    url: a.kind === "external" ? a.target : null,
    order_index: count ?? 0,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data;
}
async function tool_publishGlobalBlock(sb: SupabaseClient, tenantId: string, a: any) {
  const { data: blk } = await sb.from("website_global_blocks").select("draft_content").eq("id", a.blockId).eq("tenant_id", tenantId).single();
  if (blk?.draft_content) {
    await sb.from("website_global_blocks").update({ content: blk.draft_content, draft_content: null, updated_at: new Date().toISOString() }).eq("id", a.blockId).eq("tenant_id", tenantId);
  }
  return { ok: true };
}
async function tool_publishNavItem(sb: SupabaseClient, tenantId: string, a: any) {
  const { data: it } = await sb.from("website_navigation").select("label, url, page_id, draft_label, draft_url, draft_page_id").eq("id", a.itemId).eq("tenant_id", tenantId).single();
  if (!it) throw new Error("nav item not found");
  await sb.from("website_navigation").update({
    label: it.draft_label ?? it.label,
    url: it.draft_url ?? it.url,
    page_id: it.draft_page_id ?? it.page_id,
    draft_label: null, draft_url: null, draft_page_id: null,
  }).eq("id", a.itemId).eq("tenant_id", tenantId);
  return { ok: true };
}
async function tool_publishPage(sb: SupabaseClient, tenantId: string, a: any) {
  const { data: page } = await sb.from("website_pages")
    .select("title, slug, draft_title, draft_slug, draft_seo, draft_sections")
    .eq("tenant_id", tenantId).eq("id", a.pageId).single();
  if (!page) throw new Error("page not found");
  const newSlug = page.draft_slug ?? page.slug;
  if (!SLUG_RE.test(newSlug)) throw new Error("invalid slug on publish");
  const { data: clash } = await sb.from("website_pages").select("id").eq("tenant_id", tenantId).eq("slug", newSlug).neq("id", a.pageId).maybeSingle();
  if (clash) throw new Error("slug already in use");
  const draftSections = Array.isArray(page.draft_sections) ? page.draft_sections : [];
  await sb.from("website_pages").update({
    title: page.draft_title ?? page.title, slug: newSlug,
    is_public: true, published_at: new Date().toISOString(),
    draft_title: null, draft_slug: null, draft_seo: {}, draft_sections: [],
  }).eq("tenant_id", tenantId).eq("id", a.pageId);
  if (draftSections.length) {
    await sb.from("website_page_sections").delete().eq("tenant_id", tenantId).eq("page_id", a.pageId);
    await sb.from("website_page_sections").insert(draftSections.map((content: any, i: number) => ({
      tenant_id: tenantId, page_id: a.pageId, type: content.type, content, order_index: i,
    })));
  }
  return { published: true };
}

const DISPATCH: Record<string, (sb: SupabaseClient, t: string, a: any) => Promise<any>> = {
  createPage: tool_createPage, saveDraft: tool_saveDraft, createGlobalBlock: tool_createGlobalBlock,
  attachBlockToPage: tool_attachBlockToPage, createNavItem: tool_createNavItem,
  publishGlobalBlock: tool_publishGlobalBlock, publishNavItem: tool_publishNavItem, publishPage: tool_publishPage,
};
const BINDABLE = new Set(["createPage", "createGlobalBlock", "createNavItem"]);

export async function runPlan(
  tenantId: string,
  rawPlan: unknown,
  opts: ExecuteOptions = {}
): Promise<{ status: "ok" | "partial" | "failed"; tenantId: string; dryRun: boolean; results: StepResult[] }> {
  const plan: AgentPlan = agentPlanSchema.parse(rawPlan);
  const dryRun = plan.dryRun || !opts.allowLive; // safe-by-default
  const ctx: Record<string, any> = {};
  const results: StepResult[] = [];
  const sb = dryRun ? null : service();

  for (let i = 0; i < plan.actions.length; i++) {
    const step = plan.actions[i];
    const bind = (step as any).bind as string | undefined;
    try {
      const a = resolveArgs(step.args as Record<string, any>, ctx);

      if (dryRun) {
        const result = bind ? { id: `dry:${bind}` } : { ok: true };
        if (bind) ctx[bind] = result;
        results.push({ step: i, tool: step.tool, ok: true, result: { dryRun: true, ...result } });
        continue;
      }

      const fn = DISPATCH[step.tool];
      if (!fn) throw new Error(`unknown tool: ${step.tool}`);
      const out = await fn(sb!, tenantId, a);
      if (bind && BINDABLE.has(step.tool)) ctx[bind] = out;
      results.push({ step: i, tool: step.tool, ok: true, result: out });
    } catch (e: any) {
      results.push({ step: i, tool: step.tool, ok: false, error: e.message });
      return { status: "failed", tenantId, dryRun, results }; // fail-fast
    }
  }
  return { status: results.every((r) => r.ok) ? "ok" : "partial", tenantId, dryRun, results };
}
