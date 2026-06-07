import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import { listIndustryTemplates } from "@/lib/design/templates";

export const metadata: Metadata = {
  title: "Templates — AIBizConnect",
  description: "Premium, conversion-ready website templates for every industry. Each is quality-gated and re-themes instantly to your brand.",
};

export default function TemplatesPage() {
  const templates = listIndustryTemplates();
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/60 px-3 py-1 text-xs text-[var(--abc-color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--abc-color-accent)]" /> {templates.length} industry templates
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">A premium starting point for every business</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--abc-color-muted)]">Every template is conversion-ready, accessibility-aware, and passes our AI quality critic. Pick one and your brand colors and fonts apply automatically.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.key} className="flex flex-col rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-6 transition hover:border-[var(--abc-color-primary)]/60">
              {/* mini brand-swatch preview */}
              <div className="mb-4 overflow-hidden rounded-xl border border-[var(--abc-color-border)]">
                <div className="h-16 w-full" style={{ background: `linear-gradient(135deg, ${t.brandHint.primary}, ${t.brandHint.accent})` }} />
                <div className="flex items-center gap-2 bg-[var(--abc-color-bg)] p-3">
                  <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/10" style={{ background: t.brandHint.primary }} />
                  <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/10" style={{ background: t.brandHint.accent }} />
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--abc-color-muted)]/70">{t.brandHint.mood}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">{t.label}</h3>
                <span className="rounded bg-[var(--abc-color-bg)] px-1.5 py-0.5 text-[10px] text-[var(--abc-color-muted)]">{t.pageCount} pg</span>
              </div>
              <p className="mt-1.5 text-sm text-[var(--abc-color-muted)]">{t.tagline}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-[var(--abc-color-muted)]/70">{t.industry}</p>
              <Link href="/start" className="mt-5 block rounded-xl border border-[var(--abc-color-border)] px-4 py-2 text-center text-sm font-medium transition hover:bg-[var(--abc-color-bg)]">Use this template</Link>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/start" className="rounded-xl bg-[var(--abc-color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Build my site free</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
