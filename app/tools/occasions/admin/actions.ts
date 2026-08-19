"use server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  listAllAccounts, setAccountActive, setAccountSiteCap, setAccountPlan, adminUpsertAccount,
  type WidgetPlan,
} from "@/lib/server/occasion-widget-accounts";

/**
 * Staff-only server actions for the Occasions admin panel. Every call re-checks isPlatformAdmin()
 * on the server (admin or superadmin) — the page gate is not enough on its own. These manage the
 * EXISTING GHL accounts: activate/suspend, switch free/paid, and set a custom per-account domain cap.
 */
async function guard(): Promise<void> {
  if (!(await isPlatformAdmin())) throw new Error("Not authorized.");
}

export async function adminListAccountsAction() {
  await guard();
  return listAllAccounts();
}

export async function adminSetActiveAction(locationId: string, active: boolean) {
  await guard();
  return setAccountActive(locationId, active);
}

export async function adminSetPlanAction(locationId: string, plan: WidgetPlan) {
  await guard();
  await setAccountPlan(locationId, plan);
  return { ok: true };
}

/** cap = a number to override the plan default, or null to fall back to the plan default. */
export async function adminSetCapAction(locationId: string, cap: number | null) {
  await guard();
  return setAccountSiteCap(locationId, cap);
}

export async function adminAddAccountAction(locationId: string, name: string) {
  await guard();
  return adminUpsertAccount({ locationId, name });
}
