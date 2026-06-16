import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole } from "@/lib/auth/platform-admin";

/**
 * SEO + GEO analyzer — INTERNAL team tool to audit ANY domain (a prospect, a competitor, or a
 * tenant's site) for traditional SEO and AI / answer-engine (GEO) readiness.
 *
 * The tenant-facing version (Website area) embeds the same analyzer with `?url=<paid domain>&lock=1`
 * so a tenant can only score their own connected domain. This platform entry deliberately omits the
 * lock, so the team can analyze any URL. Gated to any platform team member (staff / admin / superadmin).
 * Note: this does NOT modify the locked analyzer HTML — it only links to it unlocked.
 */
export default async function PlatformSeoToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/seo-tools");
  const role = await getPlatformRole();
  if (!role) redirect("/platform");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
            <span className="text-base font-semibold text-slate-900">SEO + GEO Analyzer</span>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">any domain · {role}</span>
          </div>
          <a href="/tools/seo-geo-analyzer.html" target="_blank" rel="noreferrer" className="text-sm font-medium text-[#1e3a8a] hover:underline">Open full screen ↗</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-5">
        <p className="mb-3 text-sm text-slate-500">
          Internal audit tool for the AI Biz Connect team — analyze <b className="text-slate-700">any</b> domain
          (a prospect, a competitor, or a tenant site) for traditional SEO and AI / answer-engine (GEO)
          readiness, with a prioritized fix list. Unlike the tenant-facing version, this is not locked to a
          single connected domain. Past analyses are kept under the analyzer&apos;s Tracker.
        </p>
        <iframe
          src="/tools/seo-geo-analyzer.html"
          title="SEO &amp; GEO Analyzer"
          className="w-full rounded-xl border border-slate-200 bg-white"
          style={{ height: "calc(100vh - 170px)", minHeight: 680 }}
        />
      </div>
    </main>
  );
}
