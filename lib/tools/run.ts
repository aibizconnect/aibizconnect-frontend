import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getBrandMemory, brandContextForPrompt } from "../design/brand-memory";
import { resolveEntitlement } from "../entitlements";
import { llm } from "../agent/llm";
import { getTool, EMPTY_PROFILE, type ToolProfile } from "./registry";

/**
 * Tools runner — the brand-aware, draft-only, entitlement-gated execution seam for the
 * Tools suite. Every run:
 *   1) checks the tool's entitlement tier (canUseFeature) — disabled tools never run
 *   2) loads the tenant's brand memory and injects brand voice/tokens into the prompt
 *      (this is our #1 edge over Revven — no re-entering business info)
 *   3) calls the LLM seam; on no-key/error returns a graceful deterministic stub so the
 *      UI always works (L-3 fallback)
 *   4) returns the output as a DRAFT — nothing here publishes, sends, or charges.
 *
 * Persistence (shared profile + saved runs) degrades gracefully if the DDL
 * (QUEUED_tools.sql) is not yet applied — reads return defaults, writes no-op.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface RunResult {
  ok: boolean;
  status: "draft";
  output: string;
  source: "llm" | "fallback" | "blocked";
  error?: string;
}

export async function runTool(args: {
  tenantId: string;
  userId?: string | null;
  toolKey: string;
  inputs: Record<string, string>;
}): Promise<RunResult> {
  const tool = getTool(args.toolKey);
  if (!tool) return { ok: false, status: "draft", output: "", source: "blocked", error: "Unknown tool." };

  // Wave 2 media tools are stubbed + key/G-gated (Ali's financial/keys boundary).
  if (tool.comingSoon) {
    return { ok: false, status: "draft", output: "", source: "blocked", error: "This tool needs a third-party model key. It's gated until keys are connected." };
  }

  // Entitlement gate. Real gating once tenant policies are seeded; but if NO policy row
  // exists yet (source "none"), allow basic/pro so unseeded tenants aren't bricked.
  const ent = await resolveEntitlement(args.tenantId, args.userId ?? null, tool.tier);
  const allowed = ent.enabled || (ent.source === "none" && tool.tier !== "tools_media");
  if (!allowed) {
    return { ok: false, status: "draft", output: "", source: "blocked", error: `This tool is on a higher plan (${tool.tier}). Upgrade to unlock.` };
  }

  // Required-field validation.
  for (const f of tool.fields) {
    if (f.required && !(args.inputs[f.key] || "").trim()) {
      return { ok: false, status: "draft", output: "", source: "blocked", error: `Missing required field: ${f.label}` };
    }
  }

  // Brand-aware prompt assembly.
  const { memory } = await getBrandMemory(args.tenantId);
  const brand = brandContextForPrompt(memory);
  const system = `${tool.system}\n\nBrand context (always honor this): ${brand}\nWrite drafts only — never imply anything is published or sent.`;
  const user = tool.buildUser(args.inputs);

  const text = await llm.complete({ system, user, temperature: 0.6 }, args.tenantId);
  if (text && text.trim()) {
    return { ok: true, status: "draft", output: text.trim(), source: "llm" };
  }

  // Deterministic fallback so the tool always returns something useful without a key.
  return { ok: true, status: "draft", source: "fallback", output: fallbackOutput(tool.name, user) };
}

function fallbackOutput(toolName: string, user: string): string {
  return [
    `> **Draft preview — ${toolName}**`,
    `>`,
    `> No AI model key is connected yet, so here is a structured draft based on your inputs.`,
    `> Connect a model key in Settings to generate full AI output.`,
    ``,
    `**Your inputs**`,
    ``,
    "```",
    user,
    "```",
    ``,
    `_This draft is private and unpublished. Nothing was sent or charged._`,
  ].join("\n");
}

// ---------------- Shared saved profile (reused across all tools) ----------------

export async function getToolProfile(tenantId: string): Promise<ToolProfile> {
  try {
    const { data, error } = await service()
      .from("tenant_tool_profile")
      .select("business_name, industry, product, audience, price_point, geo")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !data) return { ...EMPTY_PROFILE };
    return {
      businessName: data.business_name ?? "",
      industry: data.industry ?? "",
      product: data.product ?? "",
      audience: data.audience ?? "",
      pricePoint: data.price_point ?? "Mid-Market",
      geo: data.geo ?? "",
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export async function saveToolProfile(tenantId: string, p: ToolProfile): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service()
      .from("tenant_tool_profile")
      .upsert({
        tenant_id: tenantId,
        business_name: p.businessName, industry: p.industry, product: p.product,
        audience: p.audience, price_point: p.pricePoint, geo: p.geo,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ---------------- Saved runs (draft outputs) ----------------

export interface SavedRun {
  id: string;
  toolKey: string;
  inputs: Record<string, string>;
  output: string;
  createdAt: string;
}

export async function saveRun(tenantId: string, toolKey: string, inputs: Record<string, string>, output: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service()
      .from("tenant_tool_runs")
      .insert({ tenant_id: tenantId, tool_key: toolKey, inputs, output, status: "draft" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteRun(tenantId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service().from("tenant_tool_runs").delete().eq("tenant_id", tenantId).eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function listRuns(tenantId: string, toolKey?: string): Promise<SavedRun[]> {
  try {
    let q = service().from("tenant_tool_runs")
      .select("id, tool_key, inputs, output, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (toolKey) q = q.eq("tool_key", toolKey);
    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r) => ({ id: r.id, toolKey: r.tool_key, inputs: r.inputs ?? {}, output: r.output ?? "", createdAt: r.created_at }));
  } catch {
    return [];
  }
}
