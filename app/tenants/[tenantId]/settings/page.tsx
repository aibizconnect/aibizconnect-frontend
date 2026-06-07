import { getImpersonation } from "@/lib/auth/platform-admin";
import SettingsHub from "./SettingsHub";

/**
 * Tenant-level Settings hub. Connections made here (Social, Twilio, Shopify, payments) are
 * tenant-scoped and reusable across ALL of this tenant's sites/websites/automations/CRM.
 * Per-website concerns (a site's own domain + sending identity) live in Website Settings.
 */
export default async function TenantSettingsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const imp = await getImpersonation();
  const isAdmin = imp.realRole === "superadmin" || imp.realRole === "admin";
  return <SettingsHub tenantId={tenantId} isAdmin={isAdmin} />;
}
