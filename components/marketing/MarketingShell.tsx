import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";

/**
 * Shared chrome for the public marketing site (nav + footer + house theme tokens).
 * Server component, presentational only. Every marketing page wraps its content in this
 * so the new aibizconnect.app site is cohesive and token-aligned end to end.
 */

// House theme — real AIBizConnect brand: royal/navy blue + cyan accent, MontserratAlt1
// display + Poppins body (per the Canva brand kit and the live aibizconnect.ca site).
export const houseVars: CSSProperties = {
  // @ts-expect-error CSS custom properties
  "--abc-color-primary": "#2563eb",
  "--abc-color-accent": "#22d3ee",
  "--abc-color-bg": "#0a1224",
  "--abc-color-surface": "#0f1b33",
  "--abc-color-fg": "#e8eefc",
  "--abc-color-muted": "#93a4c4",
  "--abc-color-border": "#1e2c49",
};

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/templates", label: "Templates" },
  { href: "/about", label: "Why us" },
  { href: "/pricing", label: "Pricing" },
];

export default function MarketingShell({ children, cta = "/start" }: { children: ReactNode; cta?: string }) {
  return (
    <div style={houseVars} className="abc-body min-h-screen bg-[var(--abc-color-bg)] text-[var(--abc-color-fg)] antialiased">
      <style>{`.abc-body h1,.abc-body h2,.abc-body h3{font-family:"MontserratAlt1","Inter",sans-serif;font-weight:900;letter-spacing:-0.01em}`}</style>
      <header className="sticky top-0 z-30 border-b border-[var(--abc-color-border)]/70 bg-[var(--abc-color-bg)]/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-7 w-auto" />
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[var(--abc-color-muted)] md:flex">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[var(--abc-color-muted)] hover:text-white">Sign in</Link>
            <Link href={cta} className="rounded-xl bg-[var(--abc-color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">Build my site</Link>
          </div>
        </nav>
      </header>

      {children}

      <footer className="border-t border-[var(--abc-color-border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--abc-color-muted)]">
          <span>© AIBizConnect. Supervised AI for real businesses.</span>
          <div className="flex flex-wrap gap-6">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>)}
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/login" className="hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
