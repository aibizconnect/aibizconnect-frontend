"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  listPlans, upsertPlan, deletePlan, reorderPlans,
  listSubscriptions, createSubscription, activateSubscription, renewSubscription,
  extendSubscriptionTrial, compSubscription, setSubscriptionStatus, changeSubscriptionPlan,
  setSubscriptionAmount, deleteSubscription,
  type SubscriptionPlan, type SubscriptionRow, type PlanInput, type SubStatus,
} from "@/lib/server/subscriptions";
import { listCoupons, upsertCoupon, deleteCoupon, type Coupon, type CouponInput } from "@/lib/server/coupons";

// ── Plans (Subscriptions tab) ─────────────────────────────────────────────────
export async function savePlanAction(tenantId: string, input: PlanInput & { id?: string }): Promise<SubscriptionPlan[]> {
  await requireTenantAccess(tenantId); await upsertPlan(tenantId, input); return listPlans(tenantId);
}
export async function deletePlanAction(tenantId: string, id: string): Promise<SubscriptionPlan[]> {
  await requireTenantAccess(tenantId); await deletePlan(tenantId, id); return listPlans(tenantId);
}
export async function reorderPlansAction(tenantId: string, orderedIds: string[]): Promise<SubscriptionPlan[]> {
  await requireTenantAccess(tenantId); await reorderPlans(tenantId, orderedIds); return listPlans(tenantId);
}

// ── Subscriptions (Orders + Recurring tabs) ──────────────────────────────────
export async function createSubscriptionAction(tenantId: string, contactId: string, planId: string): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await createSubscription(tenantId, { contactId, planId }); return listSubscriptions(tenantId);
}
export async function activateSubscriptionAction(tenantId: string, id: string): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await activateSubscription(tenantId, id); return listSubscriptions(tenantId);
}
export async function renewSubscriptionAction(tenantId: string, id: string): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await renewSubscription(tenantId, id); return listSubscriptions(tenantId);
}
export async function extendTrialAction(tenantId: string, id: string, days: number): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await extendSubscriptionTrial(tenantId, id, days); return listSubscriptions(tenantId);
}
export async function compSubscriptionAction(tenantId: string, id: string, comp: boolean): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await compSubscription(tenantId, id, comp); return listSubscriptions(tenantId);
}
export async function subscriptionStatusAction(tenantId: string, id: string, status: SubStatus): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await setSubscriptionStatus(tenantId, id, status); return listSubscriptions(tenantId);
}
export async function changePlanAction(tenantId: string, id: string, planId: string): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await changeSubscriptionPlan(tenantId, id, planId); return listSubscriptions(tenantId);
}
export async function subscriptionAmountAction(tenantId: string, id: string, dollars: number | null): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId);
  const cents = dollars === null || Number.isNaN(dollars) ? null : Math.round(dollars * 100);
  await setSubscriptionAmount(tenantId, id, cents); return listSubscriptions(tenantId);
}
export async function deleteSubscriptionAction(tenantId: string, id: string): Promise<SubscriptionRow[]> {
  await requireTenantAccess(tenantId); await deleteSubscription(tenantId, id); return listSubscriptions(tenantId);
}

// ── Coupons (Coupons tab) ────────────────────────────────────────────────────
export async function saveCouponAction(tenantId: string, input: CouponInput & { id?: string }): Promise<Coupon[]> {
  await requireTenantAccess(tenantId); await upsertCoupon(tenantId, input); return listCoupons(tenantId);
}
export async function deleteCouponAction(tenantId: string, id: string): Promise<Coupon[]> {
  await requireTenantAccess(tenantId); await deleteCoupon(tenantId, id); return listCoupons(tenantId);
}
