import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Contact — AIBizConnect",
  description: "Talk to us about building your site, custom domains, or agency and white-label plans.",
};

const REASONS = [
  { title: "Build my site", body: "Ready to launch? Pick a template and get a free draft in minutes.", href: "/login", cta: "Get started" },
  { title: "Agency & white-label", body: "Multi-tenant, multiple brands, per-seat billing — let's talk about your setup.", href: "mailto:hello@aibizconnect.app?subject=Agency%20plan", cta: "Email us" },
  { title: "Custom domains", body: "Point a domain you own or buy one through us, with real DNS verification.", href: "/pricing", cta: "See pricing" },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Let's talk</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--abc-color-muted)]">Whether you're launching your first site or rolling out hundreds across a franchise, we'd love to help.</p>
        <a href="mailto:hello@aibizconnect.app" className="mt-8 inline-block rounded-xl bg-[var(--abc-color-primary)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">hello@aibizconnect.app</a>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {REASONS.map((r) => (
            <div key={r.title} className="flex flex-col rounded-2xl border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)]/50 p-6">
              <h3 className="text-lg font-medium">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm text-[var(--abc-color-muted)]">{r.body}</p>
              {r.href.startsWith("mailto:") ? (
                <a href={r.href} className="mt-5 block rounded-xl border border-[var(--abc-color-border)] px-4 py-2 text-center text-sm font-medium transition hover:bg-[var(--abc-color-bg)]">{r.cta}</a>
              ) : (
                <Link href={r.href} className="mt-5 block rounded-xl border border-[var(--abc-color-border)] px-4 py-2 text-center text-sm font-medium transition hover:bg-[var(--abc-color-bg)]">{r.cta}</Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
