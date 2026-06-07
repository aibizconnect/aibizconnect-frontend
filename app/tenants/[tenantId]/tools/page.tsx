import type { Metadata } from "next";
import Link from "next/link";
import { listTools, TIER_LABEL, type ToolDef } from "@/lib/tools/registry";
import ToolThumb from "@/components/tools/ToolThumb";

export const metadata: Metadata = { title: "Tools — AIBizConnect" };

/**
 * Tools — AIBizConnect's premium, AI-native utility suite ("better than Revven").
 * Brand-aware by default, draft-only, entitlement-gated. Grouped by category with a
 * distinct gradient + icon per tool so the suite feels premium, not "clean but dull".
 */

const TIER_STYLE: Record<string, string> = {
  Basic: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Pro: "bg-gradient-to-r from-[#2563eb] to-[#22d3ee] text-white",
  Media: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

// Per-tool icon (emoji) + gradient — gives each card its own identity.
const TOOL_ART: Record<string, { icon: string; grad: string }> = {
  persona: { icon: "🧑‍🤝‍🧑", grad: "from-[#2563eb] to-[#22d3ee]" },
  email: { icon: "✉️", grad: "from-[#6366f1] to-[#a855f7]" },
  social: { icon: "📅", grad: "from-[#ec4899] to-[#f97316]" },
  newsletter: { icon: "📰", grad: "from-[#0ea5e9] to-[#22d3ee]" },
  hooks: { icon: "🪝", grad: "from-[#f59e0b] to-[#ef4444]" },
  "brand-voice": { icon: "🎙️", grad: "from-[#8b5cf6] to-[#2563eb]" },
  "business-plan": { icon: "📊", grad: "from-[#10b981] to-[#0ea5e9]" },
  vsl: { icon: "🎬", grad: "from-[#ef4444] to-[#f59e0b]" },
  ebook: { icon: "📚", grad: "from-[#14b8a6] to-[#6366f1]" },
  "perfect-hire": { icon: "🧑‍💼", grad: "from-[#0ea5e9] to-[#6366f1]" },
  deck: { icon: "📽️", grad: "from-[#f97316] to-[#ec4899]" },
  "app-designer": { icon: "📱", grad: "from-[#6366f1] to-[#22d3ee]" },
  "sora-prompt": { icon: "🎥", grad: "from-[#a855f7] to-[#ec4899]" },
  "prompt-coach": { icon: "🧠", grad: "from-[#2563eb] to-[#8b5cf6]" },
  "business-coach": { icon: "🚀", grad: "from-[#10b981] to-[#2563eb]" },
  logo: { icon: "✨", grad: "from-[#64748b] to-[#334155]" },
  vector: { icon: "🔷", grad: "from-[#64748b] to-[#334155]" },
  "avatar-video": { icon: "🧑‍🦰", grad: "from-[#64748b] to-[#334155]" },
  music: { icon: "🎵", grad: "from-[#64748b] to-[#334155]" },
  "book-cover": { icon: "📕", grad: "from-[#64748b] to-[#334155]" },
  "coloring-book": { icon: "🖍️", grad: "from-[#64748b] to-[#334155]" },
  "morph-me": { icon: "🪞", grad: "from-[#64748b] to-[#334155]" },
  transcription: { icon: "🎧", grad: "from-[#64748b] to-[#334155]" },
  "web-scraper": { icon: "🕸️", grad: "from-[#64748b] to-[#334155]" },
};

const CATEGORY_ORDER: ToolDef["category"][] = ["Strategy", "Copy", "Social", "Media"];
const CATEGORY_LABEL: Record<string, string> = {
  Strategy: "Strategy & Planning", Copy: "Copywriting", Social: "Social & Content", Media: "Media & Creative",
};

export default async function ToolsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const tools = listTools();
  const liveCount = tools.filter((t) => !t.comingSoon).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tools</h1>
            <span className="rounded-full bg-gradient-to-r from-[#2563eb] to-[#22d3ee] px-2 py-0.5 text-[11px] font-medium text-white">Premium</span>
          </div>
          <p className="text-sm text-slate-500">{liveCount} AI tools that already know your brand. Generate, edit, export — drafts only.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/tenants/${tenantId}/tools/library`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Saved drafts</Link>
          <Link href={`/tenants/${tenantId}/tools/profile`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Business Profile</Link>
        </div>
      </div>

      {/* premium hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-[#1e3a8a]/20 bg-gradient-to-br from-[#0a1224] via-[#0f1b33] to-[#1e3a8a] p-7 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#22d3ee]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-[#2563eb]/30 blur-3xl" />
        <div className="relative">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>Your AI toolbox — built into your workspace</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/70">Every tool auto-uses your brand voice &amp; palette, runs fast, and lets you edit &amp; export (PDF, MD, HTML). Outputs stay private drafts behind your approval gates — nothing auto-publishes, sends, or charges.</p>
        </div>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const group = tools.filter((t) => t.category === cat);
        if (!group.length) return null;
        return (
          <section key={cat} className="mb-9">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{CATEGORY_LABEL[cat]}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((t) => {
                const tier = TIER_LABEL[t.tier];
                const art = TOOL_ART[t.key] || { icon: "", grad: "from-[#2563eb] to-[#22d3ee]" };
                const card = (
                  <>
                    <div className="relative p-3">
                      <ToolThumb toolKey={t.key} grad={art.grad} locked={t.comingSoon} />
                      <span className={`absolute right-5 top-5 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm ${t.comingSoon ? "bg-white/90 text-slate-600" : TIER_STYLE[tier]}`}>
                        {t.comingSoon ? "Bring keys" : tier}
                      </span>
                    </div>
                    <div className="px-5 pb-5">
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.blurb}</p>
                      <div className={`mt-3 flex items-center gap-1 text-sm font-medium ${t.comingSoon ? "text-slate-400" : "text-[#1e3a8a]"}`}>
                        {t.comingSoon ? "Coming soon" : "Launch"} {!t.comingSoon && <span className="transition group-hover:translate-x-0.5">→</span>}
                      </div>
                    </div>
                  </>
                );
                return t.comingSoon ? (
                  <div key={t.key} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white opacity-80">{card}</div>
                ) : (
                  <Link key={t.key} href={`/tenants/${tenantId}/tools/${t.key}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#2563eb]/40 hover:shadow-lg hover:shadow-[#2563eb]/10">{card}</Link>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="mt-2 text-center text-xs text-slate-400">Media tools unlock once you connect a model key — they never auto-charge.</p>
    </div>
  );
}
