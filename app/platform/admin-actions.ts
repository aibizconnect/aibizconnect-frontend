"use server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { deleteUserAccount, setUserBanned, deleteTenantCascade } from "@/lib/server/admin-directory";

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
