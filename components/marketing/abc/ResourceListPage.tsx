import Link from "next/link";
import { AbcPage, CtaBand, SectionHead, CONTAINER, v, card } from "./Shell";

/** Shared Resources list page (Blog / Guides / Webinars) — hero + card grid. Placeholder entries. */
export interface ResourceItem { title: string; blurb: string; tag: string; meta: string }
export interface ResourceListData { eyebrow: string; title: string; sub: string; items: ResourceItem[] }

export default function ResourceListPage({ d }: { d: ResourceListData }) {
  return (
    <AbcPage>
      <section style={{ background: "radial-gradient(110% 60% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 72, paddingBottom: 48 }}>
          <SectionHead eyebrow={d.eyebrow} title={d.title} sub={d.sub} />
        </div>
      </section>
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingBottom: 80 }}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {d.items.map((it) => (
              <Link key={it.title} href="/start" className="abc-card-lift" style={{ ...card, display: "block", textDecoration: "none", padding: 0, overflow: "hidden" }}>
                <div style={{ height: 130, background: v("--gradient-brand"), display: "grid", placeItems: "center" }}>
                  <span style={{ fontSize: v("--text-xs"), fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>{it.tag}</span>
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: v("--text-lg"), color: v("--text-strong"), lineHeight: 1.3 }}>{it.title}</h3>
                  <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.55 }}>{it.blurb}</p>
                  <p style={{ marginTop: 14, fontSize: v("--text-xs"), color: v("--text-muted") }}>{it.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <CtaBand heading="Put it into practice — free" sub="Start free and let AI build your platform while you read." note="14-day free trial · no credit card required" />
    </AbcPage>
  );
}
