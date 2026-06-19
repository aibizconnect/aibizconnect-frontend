import type { Metadata } from "next";
import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, Eyebrow, Check, CONTAINER, v, btnPrimary, btnGhost, card } from "@/components/marketing/abc/Shell";

/**
 * Platform — built faithfully from the Claude Design "Platform" page (design-handoffs/platform/),
 * on the shared AIBizConnect OS chrome. Hero · product tour (CRM mock) · modules · navy AI-concierge ·
 * workflow automations mock · built-in grid · how-it-works · logos · CTA.
 */
export const metadata: Metadata = {
  title: "Platform — AIBizConnect OS",
  description: "CRM, marketing automation, a website builder, analytics, and a 24/7 AI concierge — one operating system that replaces 5+ tools for solo pros and small teams.",
};

const CONTACTS = [
  { i: "DR", n: "Dana Ruiz", c: "Ruiz Law", s: "Qualified", val: "$4,200" },
  { i: "MK", n: "Marcus Kane", c: "Kane Realty", s: "Follow-up", val: "$12,500" },
  { i: "PA", n: "Priya Anand", c: "Northbeam", s: "Won", val: "$8,900" },
  { i: "SL", n: "Sofia Lin", c: "Lin Insurance", s: "New", val: "$2,400" },
  { i: "TP", n: "Theo Park", c: "Park Advisory", s: "Qualified", val: "$6,750" },
];
const STAGE_COLOR: Record<string, string> = { Qualified: "--blue-500", "Follow-up": "--amber-500", Won: "--green-500", New: "--gray-500" };
const MODULES = [
  { icon: "👥", title: "CRM & Contacts", body: "Every lead, contact, and deal in pipelines that move themselves.", href: "/crm" },
  { icon: "📣", title: "Marketing Automation", body: "Email & SMS sequences that nurture every lead on autopilot.", href: "/automations" },
  { icon: "🌐", title: "Website & Funnel Builder", body: "AI-built, on-brand sites and funnels that publish in one click.", href: "/websites-funnels" },
  { icon: "✨", title: "AI Concierge", body: "A 24/7 assistant that answers, qualifies, and books in your voice.", href: "/ai-builder" },
  { icon: "⚙️", title: "Workflow Automations", body: "Triggers, waits, and branches that run the busywork for you.", href: "/automations" },
  { icon: "📊", title: "Analytics & Reporting", body: "Revenue, leads, and win rate — the numbers that actually matter.", href: "/crm" },
];
const BUILTIN = [
  { icon: "🔗", title: "Unified data", body: "One contact record shared across every module — no syncing, ever." },
  { icon: "👤", title: "Roles & teams", body: "Invite teammates with the right permissions and shared pipelines." },
  { icon: "🏷️", title: "White-label", body: "Run client sub-accounts under your own brand and domain." },
  { icon: "🔌", title: "Integrations", body: "Connect email, calendar, and payments — or use what is built in." },
  { icon: "🔒", title: "Security", body: "Encryption, backups, and audit logs on every plan by default." },
  { icon: "📱", title: "Mobile app", body: "Your CRM, pipeline, and inbox in your pocket on iOS and Android." },
];
const STEPS = [
  { n: "1", title: "Sign up free", body: "Create your account in seconds — no credit card, no setup call required." },
  { n: "2", title: "AI builds your OS", body: "Answer a few questions and AI generates your site, CRM, funnels, and automations." },
  { n: "3", title: "Publish & grow", body: "Go live the same day and let your AI fill the pipeline while you focus on selling." },
];
const LOGOS = ["Eastside Realty", "Hale Advisory", "Summit Mortgage", "Olive & Ember", "Northbeam"];
const FLOW = [
  { t: "New lead captured", tag: "Trigger", c: "--blue-500" },
  { t: "Send welcome email", tag: "Immediately", c: "--gray-500" },
  { t: "Wait 2 days", tag: "Delay", c: "--gray-500" },
  { t: "Send SMS check-in", tag: "Text", c: "--gray-500" },
  { t: "Book the call", tag: "Goal reached", c: "--green-500" },
];

export default function PlatformPage() {
  return (
    <AbcPage>
      {/* HERO */}
      <section style={{ background: "radial-gradient(110% 70% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 72, textAlign: "center" }}>
          <Eyebrow>The Platform</Eyebrow>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,56px)", color: v("--text-strong"), maxWidth: 820, margin: "0 auto" }}>Your entire business, one operating system</h1>
          <p style={{ margin: "20px auto 0", fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 620, lineHeight: 1.6 }}>
            CRM, marketing automation, a website builder, and analytics — built for solo pros and small teams who&apos;d rather sell than juggle software.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 30 }}>
            <Link href="/start" style={btnPrimary}>Start free</Link>
            <Link href="#tour" style={btnGhost}>Take the tour</Link>
          </div>
          <p style={{ marginTop: 16, fontSize: v("--text-sm"), color: v("--text-muted") }}>Replaces 5+ tools · plans from $39/mo · 14-day free trial</p>
        </div>
      </section>

      {/* PRODUCT TOUR */}
      <section id="tour" style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Product tour" title="See the whole platform in action" />
          <div className="flex flex-wrap justify-center gap-2" style={{ marginTop: 28 }}>
            {["CRM & Pipeline", "Marketing", "Websites", "Analytics"].map((t, i) => (
              <span key={t} style={{ borderRadius: v("--radius-pill"), padding: "8px 16px", fontSize: v("--text-sm"), fontWeight: 600, background: i === 0 ? v("--color-primary") : v("--surface-sunken"), color: i === 0 ? v("--white") : v("--text-muted") }}>{t}</span>
            ))}
          </div>
          {/* CRM mock */}
          <div style={{ maxWidth: 880, margin: "32px auto 0", borderRadius: v("--radius-2xl"), border: `1px solid ${v("--border-subtle")}`, boxShadow: v("--shadow-xl"), overflow: "hidden", background: v("--surface-card") }}>
            <div className="flex items-center gap-2" style={{ padding: "12px 16px", borderBottom: `1px solid ${v("--border-subtle")}`, background: v("--gray-50") }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
              <span style={{ marginLeft: 10, fontFamily: v("--font-mono"), fontSize: 11, color: v("--text-muted"), background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: 6, padding: "2px 10px" }}>app.aibizconnect.com/contacts</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr" }}>
              <div style={{ background: v("--gray-50"), borderRight: `1px solid ${v("--border-subtle")}`, padding: 16 }}>
                <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: 13, color: v("--text-strong") }}>AIBizConnect</div>
                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  {["Contacts", "Marketing", "Websites", "Analytics"].map((it, i) => (
                    <div key={it} className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? v("--color-primary") : v("--text-muted") }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: i === 0 ? v("--color-primary") : v("--gray-300") }} />{it}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: 15, color: v("--text-heading") }}>Contacts</span>
                  <span style={{ fontSize: 11, color: v("--white"), background: v("--color-primary"), borderRadius: v("--radius-md"), padding: "5px 10px", fontWeight: 600 }}>+ Add contact</span>
                </div>
                <div style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), overflow: "hidden" }}>
                  <div className="grid" style={{ gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr", background: v("--gray-50"), padding: "8px 12px", fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: v("--text-muted") }}>
                    <span>NAME</span><span>COMPANY</span><span>STAGE</span><span style={{ textAlign: "right" }}>VALUE</span>
                  </div>
                  {CONTACTS.map((c) => (
                    <div key={c.n} className="grid items-center" style={{ gridTemplateColumns: "1.6fr 1.2fr 1fr 0.8fr", padding: "9px 12px", borderTop: `1px solid ${v("--border-subtle")}`, fontSize: 12 }}>
                      <span className="flex items-center gap-2" style={{ color: v("--text-strong"), fontWeight: 500 }}>
                        <span style={{ flex: "none", display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 999, background: v("--blue-50"), color: v("--color-primary"), fontSize: 9, fontWeight: 700 }}>{c.i}</span>{c.n}
                      </span>
                      <span style={{ color: v("--text-muted") }}>{c.c}</span>
                      <span><span style={{ fontSize: 10, fontWeight: 600, color: v(STAGE_COLOR[c.s]), background: `color-mix(in srgb, ${v(STAGE_COLOR[c.s])} 12%, transparent)`, borderRadius: 999, padding: "2px 8px" }}>{c.s}</span></span>
                      <span style={{ textAlign: "right", fontFamily: v("--font-mono"), color: v("--text-strong"), fontWeight: 600 }}>{c.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: v("--text-sm"), color: v("--text-muted") }}>Every lead, contact, and deal in one place — stages that move themselves.</p>
        </div>
      </section>

      {/* MODULES */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Everything in one place" title="One login. Every tool you run on." sub="Six modules that share the same data — no integrations to wire up, nothing to sync." />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 48 }}>
            {MODULES.map((m) => (
              <div key={m.title} className="abc-card-lift" style={card}>
                <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 22 }}>{m.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{m.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{m.body}</p>
                <Link href={m.href} style={{ display: "inline-block", marginTop: 14, fontSize: v("--text-sm"), fontWeight: 600, color: v("--color-primary") }}>Learn more →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI CONCIERGE (navy) */}
      <section style={{ background: "linear-gradient(165deg, var(--navy-900) 0%, var(--blue-700) 100%)" }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div>
            <Eyebrow onDark>AI Concierge</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: v("--white") }}>An AI teammate that never clocks out</h2>
            <p style={{ marginTop: 16, fontSize: v("--text-md"), color: v("--blue-200"), maxWidth: 520, lineHeight: 1.6 }}>
              It answers visitors, qualifies leads, books appointments, and follows up — in your voice, wired straight into your CRM.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 14 }}>
              {["Answers in seconds", "Qualifies leads", "Books the calendar", "Follows up"].map((t) => (
                <li key={t} className="flex items-center gap-3" style={{ fontSize: v("--text-base"), color: v("--white") }}><Check />{t}</li>
              ))}
            </ul>
          </div>
          {/* concierge card (insurance variant) */}
          <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: v("--radius-2xl"), boxShadow: v("--shadow-xl"), padding: 24, color: v("--white") }}>
            <div className="flex items-center gap-3" style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: v("--radius-lg"), background: "rgba(255,255,255,.12)", fontSize: 20 }}>✨</span>
              <div>
                <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-md"), color: v("--white") }}>AIBiz Concierge</div>
                <div style={{ fontSize: v("--text-xs"), color: v("--blue-200") }}>Online now</div>
              </div>
              <span className="flex items-center gap-1.5" style={{ marginLeft: "auto", fontSize: v("--text-xs"), fontWeight: 700, color: "rgb(91,224,168)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgb(91,224,168)" }} />Qualifying
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: "rgba(255,255,255,.10)", borderRadius: "14px 14px 14px 4px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5 }}>Hi! Looking for a quote on a policy renewal? I can pull options in 2 minutes.</div>
              <div style={{ alignSelf: "flex-end", maxWidth: "84%", background: v("--white"), color: v("--navy-900"), borderRadius: "14px 14px 4px 14px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5, fontWeight: 500 }}>Yes — auto + home bundle.</div>
              <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: "rgba(255,255,255,.10)", borderRadius: "14px 14px 14px 4px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5 }}>Perfect. I&apos;ve got Thursday 2pm or Friday 10am for a 15-min call — which works?</div>
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 16, padding: "13px 15px", borderRadius: v("--radius-md"), background: "rgba(91,224,168,.14)", border: "1px solid rgba(91,224,168,.3)", fontSize: v("--text-xs"), fontWeight: 600, color: "rgb(91,224,168)" }}>
              <span>✓</span> Lead added to CRM · booking confirmed
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW AUTOMATIONS */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div>
            <Eyebrow>Workflow Automations</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: v("--text-strong") }}>Set it once. It runs forever.</h2>
            <p style={{ marginTop: 16, fontSize: v("--text-md"), color: v("--text-body"), maxWidth: 520, lineHeight: 1.6 }}>
              Build email &amp; SMS sequences that nurture every lead on autopilot. Triggers, waits, and branches — no code, no zaps.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 14 }}>
              {["Trigger on any lead action or stage change", "Email and SMS in the same flow", "Recover 8+ hours a week on follow-ups"].map((t) => (
                <li key={t} className="flex items-center gap-3" style={{ fontSize: v("--text-base"), color: v("--text-body") }}><Check />{t}</li>
              ))}
            </ul>
          </div>
          {/* workflow mock */}
          <div style={{ ...card, padding: 22 }}>
            <div style={{ display: "grid", gap: 0 }}>
              {FLOW.map((f, i) => (
                <div key={f.t}>
                  <div className="flex items-center justify-between gap-3" style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: "12px 14px", background: v("--surface-page") }}>
                    <span className="flex items-center gap-3" style={{ fontSize: v("--text-sm"), fontWeight: 600, color: v("--text-strong") }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: v(f.c) }} />{f.t}
                    </span>
                    <span style={{ fontSize: v("--text-xs"), color: v("--text-muted") }}>{f.tag}</span>
                  </div>
                  {i < FLOW.length - 1 && <div style={{ width: 2, height: 16, margin: "0 auto", background: v("--border-default") }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BUILT IN */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Built in, not bolted on" title="The platform handles the plumbing" />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 48 }}>
            {BUILTIN.map((b) => (
              <div key={b.title} style={card}>
                <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 22 }}>{b.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{b.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="How it works" title="Live in minutes, not months" />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 48 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ ...card, background: v("--surface-page") }}>
                <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: v("--radius-lg"), background: v("--gradient-brand"), color: v("--white"), fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-lg") }}>{s.n}</span>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{s.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 56, paddingBottom: 56, textAlign: "center" }}>
          <div className="eyebrow" style={{ color: v("--text-muted") }}>Trusted by 4,000+ businesses</div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3" style={{ marginTop: 24, opacity: 0.7 }}>
            {LOGOS.map((l) => <span key={l} style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-lg"), color: v("--gray-500") }}>{l}</span>)}
          </div>
        </div>
      </section>

      <CtaBand heading="Run your whole business from one platform" sub="Start free in minutes. Your AI gets to work immediately." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
