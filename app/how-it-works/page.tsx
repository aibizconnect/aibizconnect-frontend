import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "How it works — AIBizConnect",
  description: "Pick your industry, generate a complete draft site, and publish when it's perfect. Every change is checked by an AI quality critic and approved by you.",
};

const STEPS = [
  { n: "1", title: "Pick your industry", body: "Choose a premium, conversion-ready template built for your business — real estate, restaurant, dental, law, fitness and more. No blank page." },
  { n: "2", title: "Generate your draft site", body: "One click builds a full, multi-section website. Your brand colors and fonts are applied automatically, and the copy is tailored to your industry." },
  { n: "3", title: "Review & refine", body: "Tweak anything. Behind the scenes, an AI mesh of brand, content, SEO, and UX agents keeps everything cohesive and on-brand." },
  { n: "4", title: "Approve & publish", body: "A quality critic scores every page against brand, structure, SEO, and accessibility. It must pass — and you must say go. Nothing ships without you." },
];

const GATES = [
  { title: "Quality critic (O-3)", body: "Every page is scored before it can go live. Below the bar? It's blocked, with the exact reasons — never a broken or off-brand site." },
  { title: "Human approval (G)", body: "Anything that spends, sends, or publishes pauses for your explicit yes. The AI proposes; you decide." },
  { title: "Proven dry-run (S-2)", body: "Email and social campaigns are fully simulated and logged before any live path is even possible." },
];

export default function HowItWorks() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/60 px-3 py-1 text-xs text-[var(--abc-color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--abc-color-accent)]" /> How it works
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">From idea to live site, supervised</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--abc-color-muted)]">AIBizConnect does the heavy lifting and keeps you in control at every step. Here's the whole flow.</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--abc-color-primary)]/20 text-lg font-bold text-[var(--abc-color-accent)]">{s.n}</span>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Safety is built in, not bolted on</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--abc-color-muted)]">Three gates stand between the AI and anything that matters.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {GATES.map((g) => (
            <div key={g.title} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-bg)] p-6">
              <div className="h-1.5 w-12 rounded-full bg-[var(--abc-color-accent)]" />
              <h3 className="mt-4 text-lg font-medium">{g.title}</h3>
              <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{g.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/templates" className="rounded-xl bg-[var(--abc-color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Browse templates</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
