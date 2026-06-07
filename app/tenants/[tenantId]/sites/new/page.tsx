import Link from "next/link";
import WebsiteWizard from "@/components/sites/WebsiteWizard";

/** New-website onboarding wizard (draft-only). Reached from the Sites hub. */
export default async function NewWebsitePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return (
    <div className="mx-auto max-w-3xl py-2">
      <div className="mb-6">
        <Link href={`/tenants/${tenantId}/sites`} className="text-sm text-slate-400 hover:text-slate-600">← Sites</Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Create a new website</h1>
        <p className="text-sm text-slate-500">A few quick questions and we&apos;ll scaffold your draft site.</p>
      </div>
      <WebsiteWizard tenantId={tenantId} />
    </div>
  );
}
