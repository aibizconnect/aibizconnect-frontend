import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole } from "@/lib/auth/platform-admin";
import { MARKETING_PAGES, MARKETING_PAGE_GROUPS } from "@/lib/marketing/pages";
import { listSiteRequests } from "../pages-actions";
import SitePagesConsole from "@/components/platform/SitePagesConsole";

/**
 * Platform → Site Pages. A place to SEE every AI-built marketing page (which aren't in the visual
 * editor) and tell the AI to change / add / reorder them. Admin-gated.
 */
export default async function SitePagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/pages");
  const role = await getPlatformRole();
  if (!role) redirect("/platform");

  const requests = await listSiteRequests();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
          <span className="text-base font-semibold text-slate-900">Site Pages</span>
          <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[11px] font-medium text-[#1e3a8a]">{MARKETING_PAGES.length} pages</span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <SitePagesConsole pages={MARKETING_PAGES} groups={MARKETING_PAGE_GROUPS} initial={requests} />
      </div>
    </main>
  );
}
