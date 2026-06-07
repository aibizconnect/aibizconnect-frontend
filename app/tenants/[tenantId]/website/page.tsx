import { redirect } from "next/navigation";
import { getPrimaryWebsite } from "./website-actions";

/**
 * Legacy /website entry. Per Copilot ruling, /website is now scoped by websiteId.
 * This route looks up the tenant's PRIMARY website and redirects to its editor at
 * /tenants/{tenantId}/website/{websiteId}. The canonical hub is /tenants/{id}/sites.
 */
export default async function WebsiteRedirect({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const primary = await getPrimaryWebsite(tenantId);
  redirect(`/tenants/${tenantId}/website/${primary.id}`);
}
