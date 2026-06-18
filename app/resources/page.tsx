import type { Metadata } from "next";
import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, CONTAINER, v, card } from "@/components/marketing/abc/Shell";

export const metadata: Metadata = {
  title: "Resources — AIBizConnect OS",
  description: "Guides, playbooks, and webinars to help you launch, automate, and grow your business on AIBizConnect OS.",
};

const HUBS = [
  { icon: "📝", title: "Blog", body: "Tactics, product news, and small-business playbooks.", href: "/blog" },
  { icon: "📚", title: "Guides", body: "Step-by-step guides to set up your site, CRM, and automations.", href: "/guides" },
  { icon: "🎥", title: "Webinars", body: "Live and on-demand sessions with the AIBizConnect team.", href: "/webinars" },
];

export default function ResourcesPage() {
  return (
    <AbcPage>
      <section style={{ background: "radial-gradient(110% 60% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 72, paddingBottom: 48 }}>
          <SectionHead eyebrow="Resources" title="Everything you need to grow" sub="Guides, playbooks, and webinars to launch fast and get the most out of your AI Business OS." />
        </div>
      </section>
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingBottom: 80 }}>
          <div className="grid gap-6 md:grid-cols-3">
            {HUBS.map((h) => (
              <Link key={h.title} href={h.href} className="abc-card-lift" style={{ ...card, display: "block", textDecoration: "none" }}>
                <div style={{ display: "grid", placeItems: "center", width: 52, height: 52, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 26 }}>{h.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-xl"), color: v("--text-strong") }}>{h.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{h.body}</p>
                <span style={{ display: "inline-block", marginTop: 14, fontSize: v("--text-sm"), fontWeight: 600, color: v("--color-primary") }}>Explore {h.title} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand heading="Stop reading. Start building." sub="Start free and let AI build your platform in minutes." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
