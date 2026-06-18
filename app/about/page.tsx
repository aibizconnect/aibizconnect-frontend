import type { Metadata } from "next";
import { AbcPage, CtaBand, SectionHead, Eyebrow, CONTAINER, v, card } from "@/components/marketing/abc/Shell";

export const metadata: Metadata = {
  title: "About — AIBizConnect OS",
  description: "AIBizConnect is the AI Business OS for small business — one platform that builds your site, fills your CRM, and markets for you, so owners can spend their time selling.",
};

const STATS = [
  { n: "4,000+", l: "businesses run on AIBizConnect" },
  { n: "5+", l: "tools replaced by one OS" },
  { n: "8+ hrs", l: "saved per week, on average" },
  { n: "1 day", l: "from sign-up to live" },
];
const VALUES = [
  { icon: "🤝", title: "Owners first", body: "Built for solo pros and small teams — not enterprises. Power without the complexity." },
  { icon: "🤖", title: "AI that does the work", body: "Not another dashboard to manage. The AI answers, qualifies, books, and follows up for you." },
  { icon: "🧩", title: "One place, not five", body: "Site, CRM, funnels, calendar, and marketing share one record — no stitching tools together." },
  { icon: "🚀", title: "Live in minutes", body: "Answer a few questions and your whole platform is generated, on-brand, ready to publish." },
];

export default function AboutPage() {
  return (
    <AbcPage>
      <section style={{ background: "radial-gradient(110% 60% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 56, textAlign: "center" }}>
          <Eyebrow>Our mission</Eyebrow>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,56px)", color: v("--text-strong"), maxWidth: 820, margin: "0 auto" }}>Run your whole business from one platform</h1>
          <p style={{ margin: "20px auto 0", fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 640, lineHeight: 1.6 }}>
            Small businesses shouldn&apos;t need five tools and a tech team to compete. AIBizConnect OS gives every owner an AI that builds the website, fills the CRM, books the calendar, and markets — so they can spend their time selling, not juggling software.
          </p>
        </div>
      </section>

      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`} style={{ paddingTop: 52, paddingBottom: 52, textAlign: "center" }}>
          {STATS.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-3xl"), color: v("--color-primary") }}>{s.n}</div>
              <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted") }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="What we believe" title="Built around how owners actually work" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 48 }}>
            {VALUES.map((val) => (
              <div key={val.title} style={card}>
                <div style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 22 }}>{val.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{val.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{val.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand heading="Ready to run your business on AIBizConnect OS?" sub="Start free in minutes. Your AI gets to work immediately." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
