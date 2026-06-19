import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Coupons engine over the existing `tenant_coupons` table (migration 0058). Tenant-scoped
 * discount codes used with subscriptions / invoices. Reads guard the missing table by
 * returning empty so the Coupons tab renders even before 0058 is applied.
 */

export type CouponType = "percentage" | "fixed_amount";
export interface Coupon {
  id: string; code: string; type: CouponType; value: number; currency: string;
  expiresAt: string | null; maxRedemptions: number | null; redemptions: number; isActive: boolean;
}
export interface CouponInput {
  code: string; type?: CouponType; value?: number; currency?: string;
  expiresAt?: string | null; maxRedemptions?: number | null; isActive?: boolean;
}

function map(r: any): Coupon {
  return {
    id: r.id, code: r.code, type: (r.type ?? "percentage") as CouponType, value: Number(r.value ?? 0),
    currency: r.currency ?? "USD", expiresAt: r.expires_at ?? null, maxRedemptions: r.max_redemptions ?? null,
    redemptions: r.redemptions_count ?? 0, isActive: r.is_active !== false,
  };
}

export async function listCoupons(tenantId: string): Promise<Coupon[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_coupons").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(map);
}

export async function upsertCoupon(tenantId: string, input: CouponInput & { id?: string }): Promise<void> {
  const sb = createSupabaseServiceClient();
  const row: Record<string, unknown> = {
    tenant_id: tenantId, code: input.code.trim().toUpperCase(), type: input.type ?? "percentage",
    value: Math.max(0, input.value ?? 0), currency: input.currency ?? "USD",
    expires_at: input.expiresAt ?? null, max_redemptions: input.maxRedemptions ?? null,
    is_active: input.isActive ?? true, updated_at: new Date().toISOString(),
  };
  if (input.id) {
    const { error } = await sb.from("tenant_coupons").update(row).eq("id", input.id).eq("tenant_id", tenantId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("tenant_coupons").insert(row);
    if (error) throw new Error(error.message);
  }
}

export async function deleteCoupon(tenantId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_coupons").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}
