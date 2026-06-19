"use server";

import { isPlatformAdmin, getCurrentUser } from "@/lib/auth/platform-admin";
import {
  deleteUserAccount, setUserBanned, deleteTenantCascade,
  setSubscriberPlan, extendSubscriberTrial, setSubscriberComp, setSubscriberStatus, setSubscriberAmount,
  type BillingStatus,
} from "@/lib/server/admin-directory";
import { logPlatformEvent } from "@/lib/audit/platform-audit";

/** All actions here are platform-admin-only (admin or superadmin). */
async function gate() {
  if (!(await isPlatformAdmin())) throw new Error("Platform admin only.");
}

export async function adminDeleteUser(userId: string): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await deleteUserAccount(userId); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Delete failed." }; }
}

export async function adminSetUserBanned(userId: string, banned: boolean): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await setUserBanned(userId, banned); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}

export async function adminDeleteTenant(tenantId: string): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await deleteTenantCascade(tenantId); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Delete failed." }; }
}

// ── Subscriber billing (platform-level) ──────────────────────────────────────
async function audit(action: string, tenantId: string, meta: Record<string, unknown>) {
  const actor = await getCurrentUser().catch(() => null);
  await logPlatformEvent({ action, actorEmail: actor?.email ?? null, meta: { tenantId, ...meta } });
}

export async function adminSetTenantPlan(tenantId: string, plan: string): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await setSubscriberPlan(tenantId, plan); await audit("subscriber.plan_changed", tenantId, { plan }); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}

export async function adminExtendTrial(tenantId: string, days: number): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await extendSubscriberTrial(tenantId, days); await audit("subscriber.trial_extended", tenantId, { days }); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}

export async function adminSetFreeToPlay(tenantId: string, comp: boolean): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await setSubscriberComp(tenantId, comp); await audit("subscriber.comp_set", tenantId, { comp }); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}

export async function adminSetBillingStatus(tenantId: string, status: BillingStatus, nextDue?: string | null): Promise<{ ok: boolean; message?: string }> {
  try { await gate(); await setSubscriberStatus(tenantId, status, nextDue); await audit("subscriber.status_set", tenantId, { status, nextDue: nextDue ?? null }); return { ok: true }; }
  catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}

export async function adminSetMonthlyAmount(tenantId: string, dollars: number | null): Promise<{ ok: boolean; message?: string }> {
  try {
    await gate();
    const cents = dollars === null || Number.isNaN(dollars) ? null : Math.round(dollars * 100);
    await setSubscriberAmount(tenantId, cents);
    await audit("subscriber.amount_set", tenantId, { cents });
    return { ok: true };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Update failed." }; }
}
