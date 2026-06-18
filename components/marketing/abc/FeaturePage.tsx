import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, Eyebrow, Check, CONTAINER, v, btnPrimary, btnGhost, card } from "./Shell";

/**
 * Reusable product/feature page (one shape), built from the Claude Design "CRM" exemplar
 * (design-handoffs/crm/): hero · feature grid · split demo (with a mock) · stat bar · CTA.
 */
export interface FeatureData {
  eyebrow: string; h1: string; sub: string; trust: string;
  gridEyebrow: string; gridTitle: string; features: { icon: string; title: string; body: string }[];
  demoEyebrow: string; demoTitle: string; demoSub: string; demoChecks: string[]; mockKind: "kanban" | "panel";
  stats: { n: string; l: string }[];
  cta: { heading: string; sub: string };
}

/* Pipeline kanban mock (CRM) */
function KanbanMock() {
  const cols = [
    { name: "New", n: 2, deals: [{ t: "Eastside 3-bed listing", v: "$12,400", i: "MR" }, { t: "Policy renewal — Tan", v: "$2,100", i: "DW" }] },
    { name: "Qualified", n: 2, deals: [{ t: "Refi — Okonkwo", v: "$8,900", i: "JO" }, { t: "Estate plan — Vega", v: "$5,400", i: "PA" }] },
    { name: "Closing", n: 1, deals: [{ t: "Buyer — Lee family", v: "$18,200", i: "TL" }] },
  ];
  return (
    <div style={{ borderRadius: v("--radius-2xl"), border: `1px solid ${v("--border-subtle")}`, background: v("--surface-card"), boxShadow: v("--shadow-xl"), overflow: "hidden" }}>
      <div className="flex items-center gap-2" style={{ padding: "12px 16px", borderBottom: `1px solid ${v("--border-subtle")}`, background: v("--gray-50") }}>
        {["Pipeline", "Contacts"].map((t, i) => <span key={t} style={{ fontSize: 11, fontWeight: 600, color: i === 0 ? v("--color-primary") : v("--text-muted") }}>{t}</span>)}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3,1fr)", padding: 14 }}>
        {cols.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: v("--text-muted") }}>{c.name.toUpperCase()}</span>
              <span style={{ fontSize: 9, color: v("--text-muted"), background: v("--surface-sunken"), borderRadius: 999, padding: "1px 6px" }}>{c.n}</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {c.deals.map((d) => (
                <div key={d.t} style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: "9px 10px", background: v("--surface-card") }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: v("--text-strong"), lineHeight: 1.3 }}>{d.t}</div>
                  <div className="flex items-center justify-between" style={{ marginTop: 7 }}>
                    <span style={{ fontFamily: v("--font-mono"), fontSize: 10.5, color: v("--color-primary"), fontWeight: 600 }}>{d.v}</span>
                    <span style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: 999, background: v("--blue-50"), color: v("--color-primary"), fontSize: 7.5, fontWeight: 700 }}>{d.i}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Generic stylized product panel mock */
function PanelMock({ checks }: { checks: string[] }) {
  return (
    <div style={{ borderRadius: v("--radius-2xl"), border: `1px solid ${v("--border-subtle")}`, background: v("--surface-card"), boxShadow: v("--shadow-xl"), overflow: "hidden" }}>
      <div className="flex items-center gap-2" style={{ padding: "12px 16px", borderBottom: `1px solid ${v("--border-subtle")}`, background: v("--gray-50") }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#ff5f57" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#febc2e" }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "#28c840" }} />
      </div>
      <div style={{ padding: 18, display: "grid", gap: 12 }}>
        <div style={{ height: 10, width: "45%", borderRadius: 4, background: v("--gradient-brand"), opacity: 0.85 }} />
        {checks.map((c) => (
          <div key={c} className="flex items-center gap-3" style={{ border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-md"), padding: "12px 14px", background: v("--surface-page") }}>
            <Check /><span style={{ fontSize: v("--text-sm"), color: v("--text-strong"), fontWeight: 500 }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeaturePage({ d }: { d: FeatureData }) {
  return (
    <AbcPage>
      {/* HERO */}
      <section style={{ background: "radial-gradient(110% 70% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 72, textAlign: "center" }}>
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <h1 style={{ fontSize: "clamp(32px,4.2vw,52px)", color: v("--text-strong"), maxWidth: 780, margin: "0 auto" }}>{d.h1}</h1>
          <p style={{ margin: "20px auto 0", fontSize: v("--text-lg"), color: v("--text-body"), maxWidth: 600, lineHeight: 1.6 }}>{d.sub}</p>
          <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 30 }}>
            <Link href="/start" style={btnPrimary}>Start free</Link>
            <Link href="/contact" style={btnGhost}>Book a demo</Link>
          </div>
          <p style={{ marginTop: 16, fontSize: v("--text-sm"), color: v("--text-muted") }}>{d.trust}</p>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow={d.gridEyebrow} title={d.gridTitle} />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 48 }}>
            {d.features.map((f) => (
              <div key={f.title} className="abc-card-lift" style={card}>
                <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 22 }}>{f.icon}</div>
                <h3 style={{ marginTop: 16, fontSize: v("--text-lg"), color: v("--text-heading") }}>{f.title}</h3>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPLIT DEMO */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`} style={{ paddingTop: 88, paddingBottom: 88 }}>
          <div>
            <Eyebrow>{d.demoEyebrow}</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: v("--text-strong") }}>{d.demoTitle}</h2>
            <p style={{ marginTop: 16, fontSize: v("--text-md"), color: v("--text-body"), maxWidth: 520, lineHeight: 1.6 }}>{d.demoSub}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "grid", gap: 14 }}>
              {d.demoChecks.map((t) => <li key={t} className="flex items-center gap-3" style={{ fontSize: v("--text-base"), color: v("--text-body") }}><Check />{t}</li>)}
            </ul>
            <Link href="/start" style={{ ...btnPrimary, marginTop: 28 }}>Start free</Link>
          </div>
          {d.mockKind === "kanban" ? <KanbanMock /> : <PanelMock checks={d.demoChecks} />}
        </div>
      </section>

      {/* STAT BAR */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid gap-6 sm:grid-cols-3`} style={{ paddingTop: 52, paddingBottom: 52, textAlign: "center" }}>
          {d.stats.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 700, fontSize: v("--text-3xl"), color: v("--color-primary") }}>{s.n}</div>
              <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted") }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand heading={d.cta.heading} sub={d.cta.sub} note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
