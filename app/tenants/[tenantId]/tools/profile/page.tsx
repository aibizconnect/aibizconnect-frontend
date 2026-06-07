import type { Metadata } from "next";
import Link from "next/link";
import { getToolProfile } from "@/lib/tools/run";
import ProfileEditor from "@/components/tools/ProfileEditor";

export const metadata: Metadata = { title: "Business Profile — Tools" };

/** The shared business profile reused across every tool (our edge over Revven, which
 * makes you re-enter business info per tool). */
export default async function ToolProfilePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const profile = await getToolProfile(tenantId);
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <Link href={`/tenants/${tenantId}/tools`} className="text-sm text-[#1e3a8a] hover:underline">← All tools</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Business Profile</h1>
        <p className="text-sm text-slate-500">Fill this once — every tool pre-fills from it, so you never re-type your business.</p>
      </div>
      <ProfileEditor tenantId={tenantId} initial={profile} />
    </div>
  );
}
