import type { Metadata } from "next";
import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, Eyebrow, Check, CONTAINER, v, btnPrimary, btnGhost, card } from "@/components/marketing/abc/Shell";

/**
 * Public marketing home for aibizconnect.app — a faithful build of the Claude Design "Home"
 * (design-handoffs/home/), on the shared AIBizConnect OS chrome. Copy + band treatment match the
 * design 1:1: hero + dashboard mock · AI concierge chat card · industries · why · navy modules band ·
 * testimonials · pricing teaser · how-it-works · CTA.
 */
export const metadata: Metadata = {
  title: "AIBizConnect OS — run your entire business with AI",
  description:
    "AIBizConnect OS builds your site, fills your CRM, books your calendar, and markets for you — so you can spend your time selling, not juggling software. 14-day free trial, no credit card.",
  openGraph: {
    title: "AIBizConnect OS — run your entire business with AI",
    description: "One platform — website, CRM, funnels, calendar, marketing, and a 24/7 AI concierge. Live the same day.",
  },
};

const INDUSTRIES = ["Real Estate", "Mortgage", "Insurance", "Legal", "Advisors", "Coaches", "Agencies"];
const PILLARS = [
  { icon: "🧩", title: "One unified OS", body: "Site, CRM, calendar, and marketing in a single place — no more stitching five tools together." },
  { icon: "🤖", title: "AI does the work", body: "Your concierge answers, qualifies, books, and follows up around the clock so nothing slips." },
  { icon: "⚡", title: "Live in minutes", body: "Answer a few questions and AI builds your whole platform — publish the same day." },
  { icon: "🏢", title: "Team & agency ready", body: "Roles, sub-accounts, and white-label so you can scale from solo to a full agency." },
];
const MODULES = [
  { icon: "🌐", title: "Website Builder", body: "AI-generated, on-brand sites and landing pages that publish in one click." },
  { icon: "👥", title: "CRM & Pipelines", body: "Every lead, contact, and deal tracked through stages that move themselves." },
  { icon: "🧭", title: "Websites & Funnels", body: "High-converting funnels, forms, and checkout wired straight to your CRM." },
  { icon: "🪄", title: "AI Builder", body: "Describe what you need; AI builds pages, emails, and automations in seconds." },
  { icon: "⚙️", title: "Automations", body: "Triggers and sequences that nurture, remind, and follow up on autopilot." },
  { icon: "🚪", title: "Consumer Portal", body: "A branded client portal for bookings, documents, payments, and messages." },
];
const TESTIMONIALS = [
  { initials: "MR", quote: "I replaced my website host, CRM, and email tool with AIBizConnect — and my AI books showings while I sleep.", name: "Marcus Reyes", role: "Realtor · Austin, TX" },
  { initials: "DW", quote: "Setup took an afternoon. The concierge qualifies leads better than the VA I was paying $2k a month for.", name: "Dana Whitfield", role: "Insurance Agent · Tampa" },
  { initials: "PA", quote: "We run six client brands from one login. White-label sub-accounts are a game changer for our agency.", name: "Priya Anand", role: "Founder · Northbeam Agency" },
];
const LOGOS = ["Eastside Realty", "Hale Advisory", "Summit Mortgage", "Olive & Ember", "Northbeam"];
const TEASER = [
  { name: "Starter", price: "$39", tagline: "For solo pros getting online fast.", highlight: false },
  { name: "Pro", price: "$89", tagline: "For growing teams that sell.", highlight: true },
  { name: "Agency", price: "$199", tagline: "Manage many clients & brands.", highlight: false },
];
const STEPS = [
  { n: "1", title: "Sign up free", body: "Create your account in seconds — no credit card, no setup call required." },
  { n: "2", title: "AI builds your OS", body: "Answer a few questions and AI generates your site, CRM, funnels, and automations." },
  { n: "3", title: "Publish & grow", body: "Go live the same day and let your AI fill the pipeline while you focus on selling." },
];

export default function MarketingHome() {
  return (
    <AbcPage>
      {/* HERO */}
      <section style={{ background: "radial-gradient(110% 70% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div>
            <Eyebrow>The AI Business OS</Eyebrow>
            <h1 style={{ fontSize: "clamp(36px,5vw,60px)", color: v("--text-strong") }}>
              One platform to run your entire business — <span style={{ background: v("--gradient-brand"), WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>with AI</span>
            </h1>
            <p style={{ marginTop: 20, fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 540, lineHeight: 1.6 }}>
              AIBizConnect OS builds your site, fills your CRM, books your calendar, and markets for you — so you can spend your time selling, not juggling software.
            </p>
            <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 32 }}>
              <Link href="/start" style={btnPrimary}>Start free</Link>
              <Link href="#how" style={btnGhost}>Watch demo</Link>
            </div>
            <p style={{ marginTop: 18, fontSize: v("--text-sm"), color: v("--text-muted") }}>14-day free trial · no credit card · plans from $39/mo</p>
          </div>
          <HeroDashboard />
        </div>
      </section>

      {/* AI CONCIERGE */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div>
            <Eyebrow>AI Concierge</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: v("--text-strong") }}>Your 24/7 AI assistant, always on the clock</h2>
            <p style={{ marginTop: 16, fontSize: v("--text-md"), color: v("--text-body"), maxWidth: 520, lineHeight: 1.6 }}>
              It answers website visitors, qualifies leads, books appointments, and follows up — in your voice. You wake up to a fuller calendar and a warmer pipeline.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 14 }}>
              {["Replies in seconds, day or night", "Qualifies and routes every lead", "Books straight into your calendar"].map((t) => (
                <li key={t} className="flex items-center gap-3" style={{ fontSize: v("--text-base"), color: v("--text-body") }}><Check />{t}</li>
              ))}
            </ul>
          </div>
          <ConciergeCard />
        </div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Built for your business" title="One OS, tuned to your industry" sub="Pre-built workflows, copy, and automations for the work you actually do." />
          <div className="flex flex-wrap justify-center gap-3" style={{ marginTop: 36 }}>
            {INDUSTRIES.map((i) => (
              <span key={i} style={{ background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, boxShadow: v("--shadow-xs"), borderRadius: v("--radius-pill"), padding: "10px 20px", fontSize: v("--text-sm"), fontWeight: 600, color: v("--text-strong") }}>{i}</span>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <SectionHead eyebrow="Why AIBizConnect OS" title="Five tools' worth of work, one login" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 48 }}>
            {PILLARS.map((p) => (
              <div key={p.title} className="abc-card-lift" style={card}>
                <div style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 22 }}>{p.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{p.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES (navy band) */}
      <section id="modules" style={{ background: "linear-gradient(165deg, var(--navy-900) 0%, var(--blue-700) 100%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <SectionHead onDark eyebrow="Inside the platform" title="Everything your business runs on" sub="Modules that work together out of the box — no integrations to wire up." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 48 }}>
            {MODULES.map((m) => (
              <div key={m.title} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: v("--radius-xl"), padding: 24 }}>
                <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: v("--radius-lg"), background: "rgba(255,255,255,.10)", fontSize: 22 }}>{m.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--white") }}>{m.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--blue-200"), lineHeight: 1.6 }}>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 80 }}>
          <SectionHead eyebrow="Loved by 4,000+ businesses" title="Owners who got their time back" />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 48 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={card}>
                <p style={{ fontSize: v("--text-md"), color: v("--text-strong"), lineHeight: 1.6 }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3" style={{ marginTop: 20 }}>
                  <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 999, background: v("--gradient-brand"), color: v("--white"), fontWeight: 700, fontSize: v("--text-sm") }}>{t.initials}</span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, color: v("--text-heading"), fontSize: v("--text-sm") }}>{t.name}</span>
                    <span style={{ display: "block", color: v("--text-muted"), fontSize: v("--text-xs") }}>{t.role}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3" style={{ marginTop: 56, opacity: 0.7 }}>
            {LOGOS.map((l) => <span key={l} style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-lg"), color: v("--gray-500") }}>{l}</span>)}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section id="pricing" style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <SectionHead eyebrow="Simple pricing" title="Plans that grow with you" sub="Every plan includes your AI-built site, CRM, and concierge. Start free for 14 days." />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 48, alignItems: "start" }}>
            {TEASER.map((t) => (
              <div key={t.name} style={{ ...card, padding: 28, position: "relative", border: t.highlight ? `2px solid ${v("--border-brand")}` : `1px solid ${v("--border-subtle")}`, boxShadow: t.highlight ? v("--shadow-lg") : v("--shadow-xs") }}>
                {t.highlight && <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: v("--color-primary"), color: v("--white"), borderRadius: v("--radius-pill"), padding: "4px 14px", fontSize: v("--text-xs"), fontWeight: 700 }}>Most popular</span>}
                <h3 style={{ fontSize: v("--text-xl"), color: v("--text-strong") }}>{t.name}</h3>
                <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted") }}>{t.tagline}</p>
                <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: v("--font-display"), fontSize: v("--text-4xl"), fontWeight: 700, color: v("--text-strong") }}>{t.price}</span>
                  <span style={{ color: v("--text-muted"), fontSize: v("--text-sm") }}>/mo</span>
                </div>
                <Link href="/pricing" style={{ ...(t.highlight ? btnPrimary : btnGhost), marginTop: 20, width: "100%" }}>See plan</Link>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link href="/pricing" style={{ fontSize: v("--text-sm"), fontWeight: 600, color: v("--color-primary") }}>Compare all features &amp; plans →</Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <SectionHead eyebrow="How it works" title="Live in minutes, not months" />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 48 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={card}>
                <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: v("--radius-lg"), background: v("--gradient-brand"), color: v("--white"), fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-lg") }}>{s.n}</span>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{s.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand heading="Ready to run your business on AIBizConnect OS?" sub="Start free in minutes. Your AI gets to work immediately." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}

/* ── Hero product mock: a clean dashboard screenshot ── */
function HeroDashboard() {
  const kpis = [
    { label: "Pipeline value", value: "$48,920", delta: "▲ 12.4%" },
    { label: "New leads", value: "327", delta: "▲ 28 today" },
    { label: "Bookings", value: "41", delta: "▲ 9 this week" },
  ];
  const bars = [38, 52, 44, 67, 59, 80, 72];
  return (
    <div style={{ borderRadius: v("--radius-2xl"), border: `1px solid ${v("--border-subtle")}`, background: v("--surface-card"), boxShadow: v("--shadow-xl"), overflow: "hidden" }}>
      <div className="flex items-center gap-2" style={{ padding: "12px 16px", borderBottom: `1px solid ${v("--border-subtle")}`, background: v("--gray-50") }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
        <span style={{ marginLeft: 10, fontFamily: v("--font-mono"), fontSize: 11, color: v("--text-muted"), background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: 6, padding: "2px 10px" }}>app.aibizconnect.com/dashboard</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
        <div style={{ background: v("--gray-50"), borderRight: `1px solid ${v("--border-subtle")}`, padding: 14 }}>
          <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: 13, color: v("--text-strong") }}>AIBizConnect</div>
          <div style={{ marginTop: 14, display: "grid", gap: 9 }}>
            {["Overview", "Contacts", "Pipeline", "Marketing"].map((it, i) => (
              <div key={it} className="flex items-center gap-2" style={{ fontSize: 11, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? v("--color-primary") : v("--text-muted") }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: i === 0 ? v("--color-primary") : v("--gray-300") }} />{it}
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: v("--text-heading") }}>Welcome back, Alex 👋</div>
          <div className="grid grid-cols-3 gap-2.5" style={{ marginTop: 12 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: "10px 11px", background: v("--surface-card") }}>
                <div style={{ fontSize: 9.5, color: v("--text-muted") }}>{k.label}</div>
                <div style={{ fontFamily: v("--font-display"), fontWeight: 700, fontSize: 17, color: v("--text-strong"), marginTop: 2 }}>{k.value}</div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: v("--green-600"), marginTop: 1 }}>{k.delta}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: 12 }}>
            <div style={{ fontSize: 10, color: v("--text-muted"), marginBottom: 10 }}>Leads this week</div>
            <div className="flex items-end gap-2" style={{ height: 70 }}>
              {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: v("--gradient-brand"), opacity: 0.55 + (h / 200) }} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AI Concierge chat card (navy panel) — the signature bespoke element ── */
function ConciergeCard() {
  return (
    <div style={{ background: "linear-gradient(165deg, var(--navy-900) 0%, var(--blue-700) 100%)", borderRadius: v("--radius-2xl"), boxShadow: v("--shadow-xl"), padding: 24, color: v("--white") }}>
      <div className="flex items-center gap-3" style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: v("--radius-lg"), background: "rgba(255,255,255,.12)", fontSize: 20 }}>✨</span>
        <div>
          <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-md"), color: v("--white") }}>AIBiz Concierge</div>
          <div style={{ fontSize: v("--text-xs"), color: v("--blue-200") }}>Online now</div>
        </div>
        <span className="flex items-center gap-1.5" style={{ marginLeft: "auto", fontSize: v("--text-xs"), fontWeight: 700, color: "rgb(91,224,168)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgb(91,224,168)" }} />3 leads qualified
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: "rgba(255,255,255,.10)", borderRadius: "14px 14px 14px 4px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5 }}>Hi! Looking to list your home or buy? I can get you a free valuation in 2 minutes. 🏡</div>
        <div style={{ alignSelf: "flex-end", maxWidth: "84%", background: v("--white"), color: v("--navy-900"), borderRadius: "14px 14px 4px 14px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5, fontWeight: 500 }}>Selling — a 3 bed in Eastside.</div>
        <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: "rgba(255,255,255,.10)", borderRadius: "14px 14px 14px 4px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5 }}>Great — I&apos;ve got Thursday 2pm or Friday 10am for a walkthrough. Which works?</div>
      </div>
      <div className="flex items-center gap-2" style={{ marginTop: 16, padding: "13px 15px", borderRadius: v("--radius-md"), background: "rgba(91,224,168,.14)", border: "1px solid rgba(91,224,168,.3)", fontSize: v("--text-xs"), fontWeight: 600, color: "rgb(91,224,168)" }}>
        <span>✓</span> New lead added to CRM · booking confirmed
      </div>
    </div>
  );
}
