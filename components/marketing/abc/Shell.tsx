import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

/**
 * Shared chrome + primitives for the AIBizConnect OS marketing site, built to the Claude Design
 * system (design-handoffs/, DESIGN.md). Everything renders inside `.abc-ds` so the brand tokens
 * resolve. Used by every public page (Home, Pricing, Platform, Solutions, …) so the nav, footer,
 * buttons, and section rhythm are identical across the site. Pure presentational, server-safe.
 */
export const v = (s: string) => `var(${s})`;
export const CONTAINER = "mx-auto w-full max-w-[1120px] px-6";

export const btnPrimary: CSSProperties = {
  background: v("--color-primary"), color: v("--color-primary-contrast"), boxShadow: v("--shadow-brand"),
  borderRadius: v("--radius-md"), padding: "0 22px", height: 50, display: "inline-flex", alignItems: "center",
  justifyContent: "center", fontWeight: 600, fontSize: v("--text-sm"), textDecoration: "none",
};
export const btnGhost: CSSProperties = {
  background: v("--surface-card"), color: v("--text-strong"), border: `1px solid ${v("--border-default")}`,
  boxShadow: v("--shadow-xs"), borderRadius: v("--radius-md"), padding: "0 20px", height: 50,
  display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: v("--text-sm"), textDecoration: "none",
};
export const card: CSSProperties = {
  background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-xl"),
  boxShadow: v("--shadow-xs"), padding: 24,
};

export function Eyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return <div className="eyebrow" style={{ marginBottom: 12, color: onDark ? v("--blue-200") : v("--color-primary") }}>{children}</div>;
}
export function Check() {
  return (
    <span style={{ flex: "none", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 999, background: v("--green-100"), color: v("--green-600") }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );
}
/** Centered eyebrow + heading + optional subhead for a section header. */
export function SectionHead({ eyebrow, title, sub, onDark }: { eyebrow: string; title: ReactNode; sub?: string; onDark?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
      <h2 style={{ fontSize: "clamp(28px,3.4vw,38px)", color: onDark ? v("--white") : v("--text-strong") }}>{title}</h2>
      {sub && <p style={{ margin: "12px auto 0", maxWidth: 580, color: onDark ? v("--blue-200") : v("--text-body") }}>{sub}</p>}
    </div>
  );
}

const NAV = [
  { href: "/platform", label: "Platform" }, { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" }, { href: "/resources", label: "Resources" }, { href: "/about", label: "Company" },
];
const FOOT = {
  PRODUCT: [["Platform", "/platform"], ["CRM", "/crm"], ["Websites & Funnels", "/websites-funnels"], ["AI Builder", "/ai-builder"], ["Automations", "/automations"], ["Consumer Portal", "/consumer-portal"], ["Marketplace", "/marketplace"], ["Templates", "/templates"]],
  SOLUTIONS: [["Real Estate", "/solutions/real-estate"], ["Mortgage", "/solutions/mortgage"], ["Insurance", "/solutions/insurance"], ["Legal", "/solutions/legal"], ["Coaching", "/solutions/coaching"], ["Agencies", "/solutions/agencies"]],
  COMPANY: [["About", "/about"], ["Partners", "/contact"], ["Careers", "/about"], ["Blog", "/blog"], ["Guides", "/guides"], ["Webinars", "/webinars"]],
  LEGAL: [["Privacy", "/privacy"], ["Terms", "/terms"], ["Security", "/privacy"]],
} as const;

export function AbcNav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,.82)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${v("--border-subtle")}` }}>
      <nav className={`${CONTAINER} flex items-center justify-between`} style={{ height: 68 }}>
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/AIBizConnect-logo-primary.png" alt="AIBizConnect" style={{ height: 30, width: "auto", display: "block" }} />
        </Link>
        <div className="hidden items-center gap-8 md:flex" style={{ fontSize: v("--text-sm"), fontWeight: 500, color: v("--text-body") }}>
          {NAV.map((n) => <Link key={n.label} href={n.href} className="abc-navlink" style={{ color: "inherit", textDecoration: "none" }}>{n.label}</Link>)}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:inline" style={{ fontSize: v("--text-sm"), fontWeight: 500, color: v("--text-body"), textDecoration: "none" }}>Log in</Link>
          <Link href="/start" style={btnPrimary}>Start free</Link>
        </div>
      </nav>
    </header>
  );
}

export function AbcFooter() {
  return (
    <footer style={{ background: v("--navy-900"), color: v("--blue-200") }}>
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]`} style={{ paddingTop: 64, paddingBottom: 40 }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/AIBizConnect-logo-white.png" alt="AIBizConnect" style={{ height: 28, width: "auto", display: "block" }} />
          <p style={{ marginTop: 14, maxWidth: 240, fontSize: v("--text-sm"), color: v("--blue-200") }}>The AI Business OS for small business.</p>
        </div>
        {(Object.keys(FOOT) as (keyof typeof FOOT)[]).map((group) => (
          <div key={group}>
            <div style={{ fontSize: v("--text-xs"), fontWeight: 700, letterSpacing: v("--tracking-caps"), textTransform: "uppercase", color: v("--blue-300") }}>{group}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "grid", gap: 10 }}>
              {FOOT[group].map(([label, href]) => (
                <li key={label}><Link href={href} className="abc-foot" style={{ fontSize: v("--text-sm"), color: v("--blue-200"), textDecoration: "none" }}>{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.10)" }}>
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-3`} style={{ paddingTop: 20, paddingBottom: 28, fontSize: v("--text-xs"), color: v("--blue-300") }}>
          <span>© 2026 AIBizConnect. All rights reserved.</span>
          <span>Run your whole business from one platform.</span>
        </div>
      </div>
    </footer>
  );
}

/** Full page wrapper: `.abc-ds` + sticky nav + content + footer. */
export function AbcPage({ children }: { children: ReactNode }) {
  return (
    <div className="abc-ds" style={{ background: v("--surface-page"), color: v("--text-body"), minHeight: "100vh" }}>
      <AbcNav />
      {children}
      <AbcFooter />
    </div>
  );
}

/** Final gradient CTA band (shared across pages). */
export function CtaBand({ heading, sub, note }: { heading: string; sub: string; note?: string }) {
  return (
    <section style={{ background: v("--surface-page") }}>
      <div className={`${CONTAINER}`} style={{ paddingBottom: 96, paddingTop: 24 }}>
        <div style={{ background: "linear-gradient(135deg, var(--blue-600) 0%, var(--navy-900) 100%)", borderRadius: v("--radius-2xl"), boxShadow: v("--shadow-xl"), padding: "64px 32px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,3.6vw,42px)", color: v("--white"), maxWidth: 640, margin: "0 auto" }}>{heading}</h2>
          <p style={{ margin: "16px auto 0", maxWidth: 480, color: v("--blue-200"), fontSize: v("--text-md") }}>{sub}</p>
          <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 32 }}>
            <Link href="/start" style={{ ...btnGhost, background: v("--white"), border: "none" }}>Start free</Link>
            <Link href="/contact" style={{ background: "rgba(255,255,255,.12)", color: v("--white"), border: "1px solid rgba(255,255,255,.28)", borderRadius: v("--radius-md"), padding: "0 20px", height: 50, display: "inline-flex", alignItems: "center", fontWeight: 600, fontSize: v("--text-sm"), textDecoration: "none" }}>Book a demo</Link>
          </div>
          {note && <p style={{ marginTop: 18, fontSize: v("--text-sm"), color: v("--blue-200") }}>{note}</p>}
        </div>
      </div>
    </section>
  );
}
