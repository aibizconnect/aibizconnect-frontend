import Link from "next/link";
import WebsiteWizard from "@/components/sites/WebsiteWizard";
import { getBusinessProfile } from "@/app/tenants/[tenantId]/settings/business-actions";

/** New-website onboarding wizard (draft-only). Reached from the Sites hub. */
export default async function NewWebsitePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  // D-267 (Ali): with multiple staff on a tenant, every website build starts from the SAME
  // tenant information — pre-fill the wizard from the Business Profile (editable, never forced).
  let initialProfile: { businessName?: string; industry?: string; country?: string; city?: string; website?: string } = {};
  try {
    const p = await getBusinessProfile(tenantId);
    initialProfile = {
      businessName: p.business_name || undefined,
      industry: p.business_niche || undefined,
      country: p.address_country || undefined,
      city: p.address_city || undefined,
      website: p.business_website || undefined,
    };
  } catch { /* profile unreadable → wizard starts blank, as before */ }
  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-6">
        <Link href={`/tenants/${tenantId}/sites`} className="text-sm text-slate-400 hover:text-slate-600">← Sites</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Create a new website</h1>
        <p className="text-sm text-slate-500">A few quick questions and we&apos;ll scaffold your draft site.</p>
      </div>
      <WebsiteWizard tenantId={tenantId} initialProfile={initialProfile} />
    </div>
  );
}
