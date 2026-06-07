import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Pricing — AIBizConnect",
  description: "Start free with a subdomain and industry templates. Upgrade for custom domains, campaigns, and multi-brand agency features.",
};

const TIERS = [
  { name: "Starter", price: "Free", period: "", tagline: "For getting online fast.", features: ["1 website", "Free name.aibizconnect.app subdomain", "All industry templates", "AI quality critic", "Per-tenant design control"], cta: "Get started", highlight: false },
  { name: "Pro", price: "Coming soon", period: "", tagline: "For growing businesses.", features: ["Everything in Starter", "Multiple websites", "Custom domains + DNS verification", "Email & social campaigns", "Brand design system"], cta: "Get started", highlight: true },
  { name: "Agency", price: "Contact us", period: "", tagline: "For teams, franchises & resellers.", features: ["Everything in Pro", "Multi-tenant & white-label", "Multiple brands", "Per-seat entitlements & billing", "Agents can own their domains"], cta: "Contact us", highlight: false },
];

const FAQ = [
  { q: "Do I need a credit card to start?", a: "No. Starter is free and includes a subdomain — you can build and publish without entering payment details." },
  { q: "Who decides what features users get?", a: "The top of the account does. A business, franchise, or enterprise can include a feature for everyone, make it optional and paid by the tenant, or paid by individual users — with per-user overrides." },
  { q: "Can I use my own domain?", a: "Yes — point a domain you own or buy one through us. Custom domains are a paid upgrade with real DNS verification." },
  { q: "Does anything go live automatically?", a: "Never. The AI prepares everything; you approve and publish. Spend, send, and publish always require your explicit yes." },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Simple pricing that grows with you</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--abc-color-muted)]">Start free. Upgrade when you're ready. The top of the account decides what's included — or who pays.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`flex flex-col rounded-2xl border p-6 ${t.highlight ? "border-[var(--abc-color-primary)] bg-[var(--abc-color-primary)]/10" : "border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50"}`}>
              {t.highlight && <span className="mb-3 inline-block w-fit rounded-full bg-[var(--abc-color-primary)] px-2.5 py-0.5 text-[11px] font-medium text-white">Most popular</span>}
              <h3 className="text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-[var(--abc-color-muted)]">{t.tagline}</p>
              <p className="mt-4 text-3xl font-semibold">{t.price}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><span className="mt-0.5 text-[var(--abc-color-accent)]">✓</span> {f}</li>
                ))}
              </ul>
              <Link href={t.name === "Agency" ? "/contact" : "/login"} className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-medium transition ${t.highlight ? "bg-[var(--abc-color-primary)] text-white hover:opacity-90" : "border border-[var(--abc-color-border)] hover:bg-[var(--abc-color-bg)]"}`}>{t.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Questions, answered</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-5">
              <h3 className="text-base font-medium">{f.q}</h3>
              <p className="mt-2 text-sm text-[var(--abc-color-muted)]">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
