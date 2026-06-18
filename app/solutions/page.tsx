import type { Metadata } from "next";
import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, Eyebrow, CONTAINER, v, btnPrimary, btnGhost, card } from "@/components/marketing/abc/Shell";

/** Solutions hub — built from the Claude Design "Solutions" page (design-handoffs/solutions/). */
export const metadata: Metadata = {
  title: "Solutions by industry — AIBizConnect OS",
  description: "Pre-built CRM workflows, websites, and AI automations tuned to real estate, mortgage, insurance, legal, coaching, and agencies — not a generic toolkit.",
};

const INDUSTRIES = [
  { slug: "real-estate", name: "Real Estate", body: "Capture buyer & seller leads, automate showings, and nurture every listing to close.", tags: ["Listings", "IDX websites", "Showings"], icon: "🏡" },
  { slug: "mortgage", name: "Mortgage", body: "Turn rate-shoppers into funded loans with application funnels and milestone follow-ups.", tags: ["Applications", "Pre-qual", "Pipeline"], icon: "💰" },
  { slug: "insurance", name: "Insurance", body: "Quote faster, win renewals, and keep policyholders close with automated touchpoints.", tags: ["Quotes", "Renewals", "Policies"], icon: "🛡️" },
  { slug: "legal", name: "Legal", body: "Intake matters, book consults, and follow up on retainers without the manual chase.", tags: ["Intake", "Consults", "Matters"], icon: "⚖️" },
  { slug: "coaching", name: "Coaching", body: "Fill your calendar with discovery calls and keep clients engaged between sessions.", tags: ["Booking", "Programs", "Nurture"], icon: "🎯" },
  { slug: "agencies", name: "Agencies", body: "Run many client brands from one login with white-label sub-accounts and reporting.", tags: ["Sub-accounts", "White-label", "Reports"], icon: "🏢" },
];
const WHY = [
  { title: "Workflows that fit", body: "Pipeline stages, forms, and tasks pre-mapped to your industry — edit, don't build from zero." },
  { title: "Copy in your language", body: "Email, SMS, and page templates written around matters, renewals, listings — your world." },
  { title: "AI that knows your job", body: "The concierge qualifies and books using the questions your industry actually asks." },
  { title: "Live the same day", body: "Pick your industry, answer a few questions, and publish a working platform in minutes." },
];
const STATS = [
  { n: "4,000+", l: "businesses run on AIBizConnect" },
  { n: "8+ hrs", l: "saved per week, on average" },
  { n: "6", l: "industries with tailored playbooks" },
  { n: "1", l: "login for your entire business" },
];

export default function SolutionsPage() {
  return (
    <AbcPage>
      {/* HERO */}
      <section style={{ background: "radial-gradient(110% 70% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 72, textAlign: "center" }}>
          <Eyebrow>Solutions by industry</Eyebrow>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,56px)", color: v("--text-strong"), maxWidth: 800, margin: "0 auto" }}>One platform, tuned to your industry</h1>
          <p style={{ margin: "20px auto 0", fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 640, lineHeight: 1.6 }}>
            Pre-built CRM workflows, websites, and AI automations made for the way your business actually runs — not a generic toolkit you have to bend into shape.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 30 }}>
            <Link href="/start" style={btnPrimary}>Start free</Link>
            <Link href="#industries" style={btnGhost}>Find your industry</Link>
          </div>
        </div>
      </section>

      {/* INDUSTRY CARDS */}
      <section id="industries" style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 64, paddingBottom: 80 }}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((ind) => (
              <Link key={ind.slug} href={`/solutions/${ind.slug}`} className="abc-card-lift" style={{ ...card, display: "block", textDecoration: "none" }}>
                <div style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 24 }}>{ind.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-xl"), color: v("--text-strong") }}>{ind.name}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{ind.body}</p>
                <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
                  {ind.tags.map((t) => <span key={t} style={{ fontSize: v("--text-xs"), fontWeight: 600, color: v("--color-primary"), background: v("--blue-50"), borderRadius: v("--radius-pill"), padding: "4px 12px" }}>{t}</span>)}
                </div>
                <span style={{ display: "inline-block", marginTop: 16, fontSize: v("--text-sm"), fontWeight: 600, color: v("--color-primary") }}>Explore {ind.name} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY A VERTICAL OS (navy) */}
      <section style={{ background: "linear-gradient(165deg, var(--navy-900) 0%, var(--blue-700) 100%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <SectionHead onDark eyebrow="Why a vertical OS" title="Generic tools make you do the translating" sub="AIBizConnect ships knowing your pipeline stages, your forms, and your follow-ups — so you're selling on day one, not configuring for a month." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 48 }}>
            {WHY.map((w) => (
              <div key={w.title} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: v("--radius-xl"), padding: 22 }}>
                <h3 style={{ fontSize: v("--text-md"), color: v("--white") }}>{w.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--blue-200"), lineHeight: 1.6 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STAT BAR */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`} style={{ paddingTop: 56, paddingBottom: 56, textAlign: "center" }}>
          {STATS.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-3xl"), color: v("--color-primary") }}>{s.n}</div>
              <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted") }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand heading="Don't see your industry? You'll still feel at home." sub="Start free and the AI shapes the platform around your business in minutes." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
