import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole } from "@/lib/auth/platform-admin";
import { resolveDefaultTenantId } from "@/lib/tenant-resolve";
import { MARKETING_PAGES, MARKETING_PAGE_GROUPS } from "@/lib/marketing/pages";
import { listSiteRequests } from "../pages-actions";
import SitePagesConsole, { type SiteTool } from "@/components/platform/SitePagesConsole";

/**
 * Platform → Site Pages. A place to SEE every AI-built marketing page (which aren't in the visual
 * editor), tell the AI to change / add / reorder them, and reach the tools behind the site
 * (settings, brand/fonts, media, AI agents, forms, calendars, marketing, SEO/GEO). Admin-gated.
 */
const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";

export default async function SitePagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/pages");
  const role = await getPlatformRole();
  if (!role) redirect("/platform");

  const [requests, tid] = await Promise.all([listSiteRequests(), resolveDefaultTenantId()]);
  const t = `/tenants/${tid || PLATFORM_TENANT}`;
  const tools: SiteTool[] = [
    { label: "Settings", href: `${t}/settings`, icon: "⚙️", desc: "Site settings, domains, email." },
    { label: "Brand & fonts", href: `${t}/website`, icon: "🎨", desc: "Logo, fonts, colors, theme." },
    { label: "Media", href: `${t}/media`, icon: "🖼️", desc: "Photos, videos, uploads." },
    { label: "AI Agents & bots", href: `${t}/agents`, icon: "🤖", desc: "AI assistants & chat bots." },
    { label: "Forms", href: `${t}/sites`, icon: "📝", desc: "Forms & surveys → CRM." },
    { label: "Calendars", href: `${t}/calendars`, icon: "📅", desc: "Booking & scheduling." },
    { label: "Marketing", href: `${t}/marketing`, icon: "📣", desc: "Email & SMS campaigns." },
    { label: "SEO / GEO", href: "/platform/seo-tools", icon: "🔍", desc: "Audit SEO + AI visibility." },
  ];

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
        <SitePagesConsole pages={MARKETING_PAGES} groups={MARKETING_PAGE_GROUPS} initial={requests} tools={tools} />
      </div>
    </main>
  );
}
