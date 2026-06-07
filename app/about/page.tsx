import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Why AIBizConnect — Supervised AI for real businesses",
  description: "We believe AI should do the work and you should stay in control. Brand-first, safety-gated, and built for businesses of every size.",
};

const PILLARS = [
  { title: "Supervised AI, not chaos", body: "Every change passes a quality critic and a human-approval gate. The AI proposes; you decide. Spend, send, and publish always wait for your yes." },
  { title: "Brand-first by design", body: "Brand tokens drive everything — your colors, type, and voice carry across your website, email, and social automatically. Re-theme by swapping tokens, not rewriting content." },
  { title: "Built for real businesses", body: "Free subdomain on day one. Custom domains with real DNS verification. Entitlements, templates, and multi-channel campaigns — all wired and ready to grow." },
];

const STATS = [
  { value: "12", label: "Industry templates" },
  { value: "6", label: "Agent domains" },
  { value: "100%", label: "Pages quality-gated" },
  { value: "0", label: "Surprise actions" },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">AI should do the work. <span className="bg-gradient-to-r from-[var(--abc-color-primary)] to-[var(--abc-color-accent)] bg-clip-text text-transparent">You should stay in control.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--abc-color-muted)]">AIBizConnect is a supervised AI platform that builds world-class websites and runs multi-channel campaigns for businesses of every size — without ever taking an action you didn't approve.</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-6">
              <div className="h-1.5 w-12 rounded-full bg-[var(--abc-color-accent)]" />
              <h3 className="mt-4 text-lg font-medium">{p.title}</h3>
              <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 gap-6 rounded-3xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/30 p-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-semibold text-[var(--abc-color-accent)]">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-[var(--abc-color-muted)]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">A whole AI team, one platform</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--abc-color-muted)]">Brand, content, UX, SEO, navigation, social, email, and more — agents that collaborate to produce cohesive, premium output across every channel, all coordinated and quality-checked.</p>
        <Link href="/start" className="mt-8 inline-block rounded-xl bg-[var(--abc-color-primary)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">Build my site free</Link>
      </section>
    </MarketingShell>
  );
}
