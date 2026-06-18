import type { ReactNode } from "react";
import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, Eyebrow, Check, CONTAINER, v, btnPrimary, btnGhost, card } from "./Shell";

/**
 * Reusable industry/solution page (one shape across all verticals), built from the Claude Design
 * "Real Estate" exemplar (design-handoffs/realestate/): hero + vertical mock · stat bar · feature
 * cards · navy AI-concierge · how-it-works · testimonial · CTA. Each vertical supplies its data.
 */
export interface IndustryData {
  eyebrow: string; h1: string; sub: string; secondaryCta: { label: string; href: string }; trust: string;
  heroCard: { badge: string; title: string; meta?: string; sub?: string; actions?: string[]; chips: { i: string; name: string; note: string; tag: string }[] };
  stats: { n: string; l: string }[];
  featuresEyebrow: string; featuresTitle: string; featuresSub: string; features: { title: string; bullets: string[] }[];
  conciergeEyebrow: string; conciergeTitle: string; conciergeSub: string; conciergeChecks: string[];
  concierge: { name: string; sub: string; status: string; msgs: { from: "bot" | "user"; t: string }[]; confirm: string };
  stepsTitle: string; steps: { n: string; title: string; body: string }[];
  testimonial: { quote: string; initials: string; name: string; role: string };
  cta: { heading: string; sub: string };
}

function Bubble({ from, t }: { from: "bot" | "user"; t: string }) {
  const bot = from === "bot";
  return (
    <div style={{ alignSelf: bot ? "flex-start" : "flex-end", maxWidth: "84%", background: bot ? "rgba(255,255,255,.10)" : v("--white"), color: bot ? v("--white") : v("--navy-900"), borderRadius: bot ? "14px 14px 14px 4px" : "14px 14px 4px 14px", padding: "12px 15px", fontSize: v("--text-sm"), lineHeight: 1.5, fontWeight: bot ? 400 : 500 }}>{t}</div>
  );
}

export default function IndustryPage({ d }: { d: IndustryData }) {
  return (
    <AbcPage>
      {/* HERO */}
      <section style={{ background: "radial-gradient(100% 60% at 70% 0%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 80, paddingBottom: 72 }}>
          <div>
            <Eyebrow>{d.eyebrow}</Eyebrow>
            <h1 style={{ fontSize: "clamp(32px,4.2vw,52px)", color: v("--text-strong") }}>{d.h1}</h1>
            <p style={{ marginTop: 18, fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 540, lineHeight: 1.6 }}>{d.sub}</p>
            <div className="flex flex-wrap items-center gap-3" style={{ marginTop: 30 }}>
              <Link href="/start" style={btnPrimary}>Start free</Link>
              <Link href={d.secondaryCta.href} style={btnGhost}>{d.secondaryCta.label}</Link>
            </div>
            <p style={{ marginTop: 16, fontSize: v("--text-sm"), color: v("--text-muted") }}>{d.trust}</p>
          </div>
          {/* vertical mock card */}
          <div style={{ ...card, padding: 0, overflow: "hidden", boxShadow: v("--shadow-xl") }}>
            <div style={{ background: v("--gradient-brand"), padding: "18px 20px", color: v("--white") }}>
              <div style={{ fontSize: v("--text-xs"), fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", opacity: 0.85 }}>{d.heroCard.badge}</div>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-xl"), marginTop: 4 }}>{d.heroCard.title}</div>
              {d.heroCard.meta && <div style={{ fontSize: v("--text-lg"), fontWeight: 600, marginTop: 2 }}>{d.heroCard.meta}</div>}
              {d.heroCard.sub && <div style={{ fontSize: v("--text-xs"), opacity: 0.85, marginTop: 4 }}>{d.heroCard.sub}</div>}
              {d.heroCard.actions && (
                <div className="flex gap-2" style={{ marginTop: 14 }}>
                  {d.heroCard.actions.map((a, i) => (
                    <span key={a} style={{ fontSize: v("--text-xs"), fontWeight: 600, borderRadius: v("--radius-md"), padding: "7px 12px", background: i === 0 ? v("--white") : "rgba(255,255,255,.18)", color: i === 0 ? v("--color-primary") : v("--white") }}>{a}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              {d.heroCard.chips.map((c) => (
                <div key={c.name} className="flex items-center gap-3" style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: "10px 12px" }}>
                  <span style={{ flex: "none", display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 999, background: v("--blue-50"), color: v("--color-primary"), fontSize: 11, fontWeight: 700 }}>{c.i}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: v("--text-sm"), fontWeight: 600, color: v("--text-strong") }}>{c.name}</span>
                    <span style={{ display: "block", fontSize: v("--text-xs"), color: v("--text-muted") }}>{c.note}</span>
                  </span>
                  <span style={{ marginLeft: "auto", flex: "none", fontSize: v("--text-xs"), fontWeight: 600, color: v("--green-600"), background: v("--green-100"), borderRadius: 999, padding: "3px 10px" }}>{c.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STAT BAR */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`} style={{ paddingTop: 48, paddingBottom: 48, textAlign: "center" }}>
          {d.stats.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-3xl"), color: v("--color-primary") }}>{s.n}</div>
              <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted") }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow={d.featuresEyebrow} title={d.featuresTitle} sub={d.featuresSub} />
          <div className="grid gap-6 md:grid-cols-2" style={{ marginTop: 48 }}>
            {d.features.map((f) => (
              <div key={f.title} style={card}>
                <h3 style={{ fontSize: v("--text-lg"), color: v("--text-strong") }}>{f.title}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 10 }}>
                  {f.bullets.map((b) => <li key={b} className="flex items-center gap-2.5" style={{ fontSize: v("--text-sm"), color: v("--text-body") }}><Check />{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI CONCIERGE (navy) */}
      <section style={{ background: "linear-gradient(165deg, var(--navy-900) 0%, var(--blue-700) 100%)" }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div>
            <Eyebrow onDark>{d.conciergeEyebrow}</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: v("--white") }}>{d.conciergeTitle}</h2>
            <p style={{ marginTop: 16, fontSize: v("--text-md"), color: v("--blue-200"), maxWidth: 520, lineHeight: 1.6 }}>{d.conciergeSub}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 14 }}>
              {d.conciergeChecks.map((t) => <li key={t} className="flex items-center gap-3" style={{ fontSize: v("--text-base"), color: v("--white") }}><Check />{t}</li>)}
            </ul>
          </div>
          <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: v("--radius-2xl"), boxShadow: v("--shadow-xl"), padding: 24, color: v("--white") }}>
            <div className="flex items-center gap-3" style={{ paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,.12)" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: v("--radius-lg"), background: "rgba(255,255,255,.12)", fontSize: 20 }}>✨</span>
              <div>
                <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-md"), color: v("--white") }}>{d.concierge.name}</div>
                <div style={{ fontSize: v("--text-xs"), color: v("--blue-200") }}>{d.concierge.sub}</div>
              </div>
              <span className="flex items-center gap-1.5" style={{ marginLeft: "auto", fontSize: v("--text-xs"), fontWeight: 700, color: "rgb(91,224,168)" }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "rgb(91,224,168)" }} />{d.concierge.status}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
              {d.concierge.msgs.map((m, i) => <Bubble key={i} from={m.from} t={m.t} />)}
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: 16, padding: "13px 15px", borderRadius: v("--radius-md"), background: "rgba(91,224,168,.14)", border: "1px solid rgba(91,224,168,.3)", fontSize: v("--text-xs"), fontWeight: 600, color: "rgb(91,224,168)" }}>
              <span>✓</span> {d.concierge.confirm}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="How it works" title={d.stepsTitle} />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 48 }}>
            {d.steps.map((s) => (
              <div key={s.n} style={{ ...card, background: v("--surface-page") }}>
                <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: v("--radius-lg"), background: v("--gradient-brand"), color: v("--white"), fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-lg") }}>{s.n}</span>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{s.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 72, paddingBottom: 72 }}>
          <div style={{ ...card, maxWidth: 760, margin: "0 auto", textAlign: "center", padding: 36 }}>
            <p style={{ fontSize: v("--text-xl"), color: v("--text-strong"), lineHeight: 1.5 }}>&ldquo;{d.testimonial.quote}&rdquo;</p>
            <div className="flex items-center justify-center gap-3" style={{ marginTop: 22 }}>
              <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 999, background: v("--gradient-brand"), color: v("--white"), fontWeight: 700, fontSize: v("--text-sm") }}>{d.testimonial.initials}</span>
              <span style={{ textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 600, color: v("--text-heading"), fontSize: v("--text-sm") }}>{d.testimonial.name}</span>
                <span style={{ display: "block", color: v("--text-muted"), fontSize: v("--text-xs") }}>{d.testimonial.role}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <CtaBand heading={d.cta.heading} sub={d.cta.sub} note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
