import type { Metadata } from "next";
import { listIndustryTemplates } from "@/lib/design/templates";
import MarketingShell from "@/components/marketing/MarketingShell";

/**
 * New public-facing AIBizConnect marketing site (Home) — the "build my site in one click"
 * story, told premium. Design-forward, token-aligned (house indigo/cyan), and DOGFOODED:
 * the Industries grid is rendered from the real template catalog the platform ships.
 *
 * Structure (ratified with Copilot):
 *   nav · hero (+ draft-preview mock) · how-it-works (3 steps) · industries grid ·
 *   why-different (3 pillars) · pricing (Starter/Pro/Agency) · final CTA · footer
 *
 * Pure presentational + read-only. No auth, no writes, no live actions.
 */

export const metadata: Metadata = {
  title: "AIBizConnect — Your AI builds the website. You just publish.",
  description:
    "Pick your industry and AIBizConnect generates a complete, on-brand website in one click — reviewed by an AI quality critic, published when you say so. Websites, domains, email & social, all supervised.",
  openGraph: {
    title: "AIBizConnect — Your AI builds the website. You just publish.",
    description:
      "One click turns your industry into a complete, on-brand website. Supervised AI across web, email, and social.",
  },
};

const STEPS = [
  { n: "1", title: "Pick your industry", body: "Choose from real estate, restaurant, dental, law, fitness and more. Each is a premium, conversion-ready starting point." },
  { n: "2", title: "Generate your draft site", body: "One click builds a full multi-section website — copy, layout, and your brand colors auto-applied. No blank page, ever." },
  { n: "3", title: "Review, approve, publish", body: "An AI quality critic checks every page. Nothing goes live without you — you publish when it's ready." },
];

const PILLARS = [
  { title: "Supervised AI, not chaos", body: "Every change passes a quality critic and a human-approval gate. Spend, send, and publish always wait for your yes.", accent: "var(--abc-color-accent)" },
  { title: "Brand-first by design", body: "Brand tokens drive everything — your colors, type, and voice carry across your site, email, and social, automatically.", accent: "var(--abc-color-primary)" },
  { title: "Built for real businesses", body: "Free subdomain on day one, custom domains with real DNS verification, entitlements, templates, and multi-channel campaigns — all wired.", accent: "var(--abc-color-accent)" },
];

const TIERS = [
  { name: "Starter", price: "Coming soon", tagline: "For getting online fast.", features: ["1 website", "Free subdomain", "Industry templates", "AI quality critic"], highlight: false },
  { name: "Pro", price: "Coming soon", tagline: "For growing businesses.", features: ["Multiple sites", "Custom domains", "Email & social campaigns", "Brand design system"], highlight: true },
  { name: "Agency", price: "Contact us", tagline: "For teams & franchises.", features: ["Multi-tenant & white-label", "Multiple brands", "Per-seat entitlements", "Agents own their domains"], highlight: false },
];

export default function MarketingHome() {
  const templates = listIndustryTemplates();

  return (
    <MarketingShell cta="/start">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-[var(--abc-color-primary)]/25 blur-[120px]" />
          <div className="absolute right-[-8rem] top-[6rem] h-[20rem] w-[20rem] rounded-full bg-[var(--abc-color-accent)]/20 blur-[100px]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/60 px-3 py-1 text-xs text-[var(--abc-color-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--abc-color-accent)]" /> Supervised AI website builder
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your AI builds the website.
              <span className="block bg-gradient-to-r from-[var(--abc-color-primary)] to-[var(--abc-color-accent)] bg-clip-text text-transparent">You just publish.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[var(--abc-color-muted)]">
              Pick your industry and AIBizConnect generates a complete, on-brand website in one click — checked by an AI quality critic and published only when you say so.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/start" className="rounded-xl bg-[var(--abc-color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Build my site free</a>
              <a href="#how" className="rounded-xl border border-[var(--abc-color-border)] px-6 py-3 text-sm font-medium text-[var(--abc-color-fg)] transition hover:bg-[var(--abc-color-surface)]">See how it works</a>
            </div>
            <p className="mt-4 text-xs text-[var(--abc-color-muted)]">Free <span className="font-mono">name.aibizconnect.app</span> subdomain · No credit card · Nothing goes live without you.</p>
          </div>

          {/* Draft-site preview mock */}
          <div className="relative">
            <div className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)] p-3 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="h-3 w-3 rounded-full bg-red-400/70" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                <span className="ml-3 rounded bg-[var(--abc-color-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--abc-color-muted)]">aliproperties.aibizconnect.app</span>
              </div>
              <div className="overflow-hidden rounded-xl bg-[var(--abc-color-bg)]">
                <div className="bg-gradient-to-br from-[var(--abc-color-primary)]/30 to-[var(--abc-color-accent)]/20 p-6">
                  <div className="h-2.5 w-24 rounded bg-white/30" />
                  <div className="mt-4 h-5 w-3/4 rounded bg-white/80" />
                  <div className="mt-2 h-5 w-1/2 rounded bg-white/60" />
                  <div className="mt-5 flex gap-2">
                    <div className="h-8 w-28 rounded-lg bg-[var(--abc-color-primary)]" />
                    <div className="h-8 w-28 rounded-lg border border-white/30" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-[var(--abc-color-border)] p-3">
                      <div className="h-6 w-6 rounded bg-[var(--abc-color-accent)]/40" />
                      <div className="mt-2 h-2 w-full rounded bg-white/20" />
                      <div className="mt-1 h-2 w-2/3 rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <span className="absolute -bottom-3 -right-3 rounded-full border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--abc-color-fg)] shadow-lg">
              ✨ Generated from: <span className="text-[var(--abc-color-accent)]">Real Estate template</span>
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Live in three steps</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--abc-color-muted)]">From nothing to a polished, on-brand site — without touching a blank page.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--abc-color-primary)]/20 text-lg font-bold text-[var(--abc-color-accent)]">{s.n}</span>
              <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INDUSTRIES (dogfooded from the real catalog) */}
      <section id="industries" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">A head start for every industry</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--abc-color-muted)]">{templates.length} premium templates, each conversion-ready and quality-gated. Your brand, applied automatically.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.key} className="group rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-5 transition hover:border-[var(--abc-color-primary)]/60">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium">{t.label}</span>
                <span className="flex gap-1">
                  <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/10" style={{ background: t.brandHint.primary }} />
                  <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/10" style={{ background: t.brandHint.accent }} />
                </span>
              </div>
              <p className="mt-1.5 text-sm text-[var(--abc-color-muted)]">{t.tagline}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-[var(--abc-color-muted)]/70">{t.industry} · {t.pageCount} page{t.pageCount > 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a href="/start" className="rounded-xl bg-[var(--abc-color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Start with a template</a>
        </div>
      </section>

      {/* WHY DIFFERENT */}
      <section id="why" className="border-y border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Why AIBizConnect is different</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-bg)] p-6">
                <div className="h-1.5 w-12 rounded-full" style={{ background: p.accent }} />
                <h3 className="mt-4 text-lg font-medium">{p.title}</h3>
                <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Simple pricing</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-[var(--abc-color-muted)]">Start free. Upgrade when you grow. The top decides what's included — or who pays.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-6 ${t.highlight ? "border-[var(--abc-color-primary)] bg-[var(--abc-color-primary)]/10" : "border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50"}`}>
              {t.highlight && <span className="mb-3 inline-block rounded-full bg-[var(--abc-color-primary)] px-2.5 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-[var(--abc-color-muted)]">{t.tagline}</p>
              <p className="mt-4 text-2xl font-semibold">{t.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--abc-color-fg)]">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-[var(--abc-color-accent)]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="/start" className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-medium transition ${t.highlight ? "bg-[var(--abc-color-primary)] text-white hover:opacity-90" : "border border-[var(--abc-color-border)] hover:bg-[var(--abc-color-surface)]"}`}>
                {t.name === "Agency" ? "Contact us" : "Get started"}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-3xl border border-[var(--abc-color-border)] bg-gradient-to-br from-[var(--abc-color-primary)]/20 to-[var(--abc-color-accent)]/10 p-10 text-center sm:p-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Build your site in the next five minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-[var(--abc-color-muted)]">Pick an industry, generate a draft, and publish when it's perfect. Your AI team is ready.</p>
          <a href="/start" className="mt-8 inline-block rounded-xl bg-[var(--abc-color-primary)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">Build my site free</a>
        </div>
      </section>

    </MarketingShell>
  );
}
