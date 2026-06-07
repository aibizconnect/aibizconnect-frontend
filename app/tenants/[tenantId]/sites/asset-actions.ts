"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { listSavedAssets, deleteAsset, updateGlobalAsset, saveAsset, type AssetTier, type SavedAsset } from "@/lib/saved-assets";

/**
 * Server actions for the Saved Assets library (the reuse system). Thin wrappers over
 * lib/saved-assets. Data-only.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function listAssetsAction(tenantId: string): Promise<Record<AssetTier, SavedAsset[]>> {
  return listSavedAssets(tenantId);
}

export async function deleteAssetAction(tenantId: string, tier: AssetTier, id: string): Promise<Record<AssetTier, SavedAsset[]>> {
  await deleteAsset(tenantId, tier, id);
  return listSavedAssets(tenantId);
}

/** Edit a Global/Universal asset's heading → syncs to every page that references it. */
export async function updateAssetHeadingAction(tenantId: string, id: string, currentContent: Record<string, any>, heading: string): Promise<Record<AssetTier, SavedAsset[]>> {
  await updateGlobalAsset(tenantId, id, { ...currentContent, heading });
  return listSavedAssets(tenantId);
}

/** Create a starter Global/Universal block (so the tenant has something to reference). */
export async function createStarterBlockAction(tenantId: string, tier: "global" | "universal", name: string): Promise<{ ok: boolean; error?: string; assets: Record<AssetTier, SavedAsset[]> }> {
  // for global we attach to the tenant's first page's "website" — here website == tenant scope; use null/tenant for v1
  const res = await saveAsset({
    tenantId, name: name || "New block", kind: "section", tier,
    websiteId: tier === "global" ? tenantId : null,
    content: { type: "cta-banner", heading: name || "Your headline", subheading: "Edit me — changes sync everywhere this block is used.", cta: { label: "Get started", href: "#" } },
  });
  return { ok: res.ok, error: res.error, assets: await listSavedAssets(tenantId) };
}

/** Save a page's first section as a reusable asset (the GHL "save this section" flow). */
export async function saveSectionAsAssetAction(tenantId: string, pageId: string, tier: AssetTier, name: string): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("tenant_id", tenantId).eq("id", pageId).single();
  let content: Record<string, any> | null = Array.isArray(page?.draft_sections) && page!.draft_sections.length ? (page!.draft_sections[0] as Record<string, any>) : null;
  if (!content) {
    const { data: live } = await sb.from("website_page_sections").select("content").eq("tenant_id", tenantId).eq("page_id", pageId).order("order_index").limit(1);
    content = (live?.[0]?.content as Record<string, any>) ?? null;
  }
  if (!content) return { ok: false, error: "This page has no section to save yet." };
  const res = await saveAsset({ tenantId, name, kind: "section", tier, websiteId: tier === "global" ? tenantId : null, content });
  return { ok: res.ok, error: res.error };
}
