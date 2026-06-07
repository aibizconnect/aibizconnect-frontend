import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Saved Assets — the reuse system Ali loves. Three tiers:
 *
 *   • Template  (copy)        → website_saved_templates. Insert COPIES content into the
 *                               page's own section. Independent; edits never propagate.
 *   • Global    (per-website) → website_global_blocks (scope='website', website_id set).
 *                               Pages reference it via website_page_block_refs; editing the
 *                               block updates every instance ON THAT WEBSITE.
 *   • Universal (per-account) → website_global_blocks (scope='account'). Referenced across
 *                               ALL the tenant's websites; edit once → syncs everywhere.
 *
 * The sync engine already exists (global blocks + page_block_refs are rendered by the
 * public site). This module adds the tier semantics + save/insert/list/update/delete.
 * Data-only; no publish/charge. Service-role (workspace carries no RLS claim).
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export type AssetTier = "template" | "global" | "universal";
export type AssetKind = "section" | "element";

export interface SavedAsset {
  id: string;
  name: string;
  tier: AssetTier;
  kind: AssetKind;
  websiteId?: string | null;
  content: Record<string, any>;
  updatedAt?: string;
}

/** Save a section/element as a reusable asset under one of the three tiers. */
export async function saveAsset(args: {
  tenantId: string;
  name: string;
  kind: AssetKind;
  content: Record<string, any>;
  tier: AssetTier;
  websiteId?: string | null; // required for tier='global'
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const name = (args.name ?? "").trim();
  if (name.length < 1) return { ok: false, error: "Give your asset a name." };
  const sb = service();

  if (args.tier === "template") {
    const { data, error } = await sb.from("website_saved_templates")
      .insert({ tenant_id: args.tenantId, name, kind: args.kind, content: args.content, is_platform: false })
      .select("id").single();
    return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
  }

  // global | universal → website_global_blocks
  if (args.tier === "global" && !args.websiteId) return { ok: false, error: "Global assets need a website." };
  const { data, error } = await sb.from("website_global_blocks")
    .insert({
      tenant_id: args.tenantId, name, type: String(args.content?.type ?? args.kind),
      content: args.content, kind: args.kind,
      scope: args.tier === "global" ? "website" : "account",
      website_id: args.tier === "global" ? args.websiteId : null,
    })
    .select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

/** List a tenant's saved assets, grouped by tier. websiteId filters Global to that site. */
export async function listSavedAssets(tenantId: string, websiteId?: string | null): Promise<Record<AssetTier, SavedAsset[]>> {
  const sb = service();
  const out: Record<AssetTier, SavedAsset[]> = { template: [], global: [], universal: [] };

  const { data: tpls } = await sb.from("website_saved_templates")
    .select("id, name, kind, content").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  out.template = (tpls ?? []).map((r: any) => ({ id: r.id, name: r.name, tier: "template", kind: r.kind, content: r.content }));

  const { data: blocks } = await sb.from("website_global_blocks")
    .select("id, name, kind, scope, website_id, content, updated_at").eq("tenant_id", tenantId).order("updated_at", { ascending: false });
  for (const b of blocks ?? []) {
    const tier: AssetTier = b.scope === "website" ? "global" : "universal";
    if (tier === "global" && websiteId && b.website_id !== websiteId) continue;
    out[tier].push({ id: b.id, name: b.name, tier, kind: b.kind ?? "section", websiteId: b.website_id, content: b.content, updatedAt: b.updated_at });
  }
  return out;
}

/**
 * Edit a Global/Universal asset's content → propagates to every page that references it
 * (the whole point). Template edits are local-only and not handled here.
 */
export async function updateGlobalAsset(tenantId: string, id: string, content: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { error } = await sb.from("website_global_blocks")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Insert a saved asset into a page.
 *   Template  → COPY content into a new website_page_sections row (independent).
 *   Global/Universal → create a website_page_block_refs row (live link → syncs).
 */
export async function insertAssetIntoPage(args: {
  tenantId: string; pageId: string; tier: AssetTier; assetId: string;
}): Promise<{ ok: boolean; error?: string; mode: "copied" | "linked" }> {
  const sb = service();

  if (args.tier === "template") {
    const { data: tpl } = await sb.from("website_saved_templates").select("content").eq("tenant_id", args.tenantId).eq("id", args.assetId).single();
    if (!tpl) return { ok: false, error: "Template not found.", mode: "copied" };
    const { count } = await sb.from("website_page_sections").select("*", { count: "exact", head: true }).eq("tenant_id", args.tenantId).eq("page_id", args.pageId);
    const { error } = await sb.from("website_page_sections").insert({
      tenant_id: args.tenantId, page_id: args.pageId, type: String((tpl.content as any)?.type ?? "section"),
      content: tpl.content, order_index: count ?? 0,
    });
    return error ? { ok: false, error: error.message, mode: "copied" } : { ok: true, mode: "copied" };
  }

  // global/universal → live reference
  const { count } = await sb.from("website_page_block_refs").select("*", { count: "exact", head: true }).eq("tenant_id", args.tenantId).eq("page_id", args.pageId);
  const { error } = await sb.from("website_page_block_refs").insert({
    tenant_id: args.tenantId, page_id: args.pageId, block_id: args.assetId, order_index: count ?? 0,
  });
  return error ? { ok: false, error: error.message, mode: "linked" } : { ok: true, mode: "linked" };
}

export async function deleteAsset(tenantId: string, tier: AssetTier, id: string): Promise<{ ok: boolean }> {
  const sb = service();
  if (tier === "template") await sb.from("website_saved_templates").delete().eq("tenant_id", tenantId).eq("id", id);
  else await sb.from("website_global_blocks").delete().eq("tenant_id", tenantId).eq("id", id);
  return { ok: true };
}
