"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { shopifyReady, normalizeShopDomain, makeShopifyState, buildShopifyAuthorizeUrl } from "@/lib/server/shopify";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}
async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action, actorEmail: await getCurrentUserEmail(), meta });
  } catch { /* best effort */ }
}

export interface ShopifyStoreView {
  id: string; shop_domain: string; shop_name: string | null; plan_name: string | null;
  status: string; scopes: string[]; hasTokens: boolean;
}

export async function listShopifyStores(tenantId: string): Promise<{ ready: boolean; stores: ShopifyStoreView[] }> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_shopify_stores")
    .select("id, shop_domain, shop_name, plan_name, status, scopes, encrypted_tokens")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  const stores: ShopifyStoreView[] = (data ?? []).map((r: any) => ({
    id: r.id, shop_domain: r.shop_domain, shop_name: r.shop_name, plan_name: r.plan_name,
    status: r.status, scopes: r.scopes ?? [], hasTokens: !!r.encrypted_tokens, // never the blob
  }));
  return { ready: await shopifyReady(), stores };
}

/** Begin Shopify OAuth for a specific shop. Admin-gated. */
export async function getShopifyStartUrl(tenantId: string, shopInput: string): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  if (!(await shopifyReady())) return { ok: false, message: "Shopify is not configured yet (add the app API key + secret)." };
  const shop = normalizeShopDomain(shopInput);
  if (!shop) return { ok: false, message: "Enter a valid shop (e.g. mystore or mystore.myshopify.com)." };
  const state = makeShopifyState(tenantId, shop);
  if (!state) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to connect Shopify." };
  const res = await buildShopifyAuthorizeUrl(shop, state);
  if (!res.ok) return { ok: false, message: res.error };
  await audit("shopify.oauth_start", { tenantId, shop });
  return { ok: true, url: res.url };
}

export async function disconnectShopifyStore(tenantId: string, storeId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_shopify_stores").select("shop_domain").eq("tenant_id", tenantId).eq("id", storeId).maybeSingle();
  if (!row) return { ok: false, message: "Store not found." };
  const { error } = await supabase.from("tenant_shopify_stores").delete().eq("tenant_id", tenantId).eq("id", storeId);
  if (error) return { ok: false, message: error.message };
  const { count } = await supabase.from("tenant_shopify_stores").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  await supabase.from("tenant_integrations").upsert(
    { tenant_id: tenantId, provider: "shopify", status: (count ?? 0) > 0 ? "connected" : "disconnected", config: { kind: "ecommerce", store_count: count ?? 0 }, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" }
  );
  await audit("shopify.disconnect", { tenantId, shop: row.shop_domain });
  return { ok: true };
}
