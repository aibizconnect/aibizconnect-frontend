"use server";

/**
 * Self-diagnosis for the Settings hub (temporary, shipped after the masked Server
 * Components error on Ali's tenant persisted past the 0050 schema fix). Server actions
 * that THROW get their messages masked in production — so this one never throws: it
 * runs each suspect step in a try/catch and RETURNS the real failure text.
 */
export interface SettingsDiag {
  enforce: boolean;
  hasToken: boolean;
  role: string | null;
  access: string;          // "ok" or the real AccessError message
  socialLoad: string;      // "ok (N providers)" or the real error message
  note?: string;
}

export async function diagnoseSettingsAccess(tenantId: string): Promise<SettingsDiag> {
  const out: SettingsDiag = { enforce: process.env.AUTH_ENFORCE === "true", hasToken: false, role: null, access: "?", socialLoad: "?" };
  try {
    const { cookies } = await import("next/headers");
    out.hasToken = !!(await cookies()).get("token")?.value;
  } catch (e: any) { out.note = `cookies: ${e?.message}`; }
  try {
    const { getPlatformRole } = await import("@/lib/auth/platform-admin");
    out.role = await getPlatformRole();
  } catch (e: any) { out.role = `error: ${e?.message}`; }
  try {
    const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
    await requireTenantAccess(tenantId);
    out.access = "ok";
  } catch (e: any) { out.access = e?.message ?? "failed"; }
  try {
    const { listSocialAccounts } = await import("./social-actions");
    const r = await listSocialAccounts(tenantId);
    out.socialLoad = `ok (${r.length} providers)`;
  } catch (e: any) { out.socialLoad = e?.message ?? "failed"; }
  return out;
}
