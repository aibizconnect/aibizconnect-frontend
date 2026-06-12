import { getImpersonation } from "@/lib/auth/platform-admin";
import SettingsHub from "./SettingsHub";

/**
 * Tenant-level Settings hub. Connections made here (Social, Twilio, Shopify, payments) are
 * tenant-scoped and reusable across ALL of this tenant's sites/websites/automations/CRM.
 * Per-website concerns (a site's own domain + sending identity) live in Website Settings.
 *
 * The page NEVER throws: every load is fenced and failures render as readable text
 * (production masks thrown server errors, which made the crash undiagnosable).
 */
export default async function TenantSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  let isAdmin = false;
  let pageDiag: string | null = null;
  try {
    const imp = await getImpersonation();
    isAdmin = imp.realRole === "superadmin" || imp.realRole === "admin";
  } catch (e: any) {
    pageDiag = `getImpersonation failed: ${e?.message ?? "unknown"}`;
  }

  // Server-side self-diagnosis (direct call — immune to action-invocation failures).
  let diagLine: string | null = pageDiag;
  if (!diagLine) {
    try {
      const { diagnoseSettingsAccess } = await import("./diag-actions");
      const d = await diagnoseSettingsAccess(tenantId);
      if (d.access !== "ok" || !d.socialLoad.startsWith("ok")) {
        diagLine = `access: ${d.access}; social load: ${d.socialLoad}; role: ${d.role ?? "none"}; token: ${d.hasToken ? "present" : "MISSING"}; enforcement: ${d.enforce ? "on" : "off"}${d.note ? `; ${d.note}` : ""}`;
      }
    } catch (e: any) {
      diagLine = `diagnosis itself failed: ${e?.message ?? "unknown"}`;
    }
  }

  return (
    <>
      {diagLine && (
        <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Settings diagnosis: {diagLine}
        </div>
      )}
      <SettingsHub tenantId={tenantId} isAdmin={isAdmin} />
    </>
  );
}
