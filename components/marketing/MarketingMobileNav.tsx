"use client";

import { useState } from "react";
import Link from "next/link";

/** Mobile hamburger for the (legacy) MarketingShell nav — md:hidden slide-down panel.
 *  Inherits the shell's --abc-color-* tokens, so it matches the dark house theme. */
export default function MarketingMobileNav({ nav, cta }: { nav: { href: string; label: string }[]; cta: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--abc-color-border)] bg-[var(--abc-color-surface)] text-[var(--abc-color-fg)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-x-0 bottom-0 top-[60px] z-40 bg-black/50" />
          <div className="fixed inset-x-0 top-[60px] z-50 border-b border-[var(--abc-color-border)] bg-[var(--abc-color-bg)] px-4 pb-5 pt-2 shadow-2xl">
            <nav className="grid">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className="border-b border-[var(--abc-color-border)]/60 px-2 py-3.5 text-base font-semibold text-[var(--abc-color-fg)]">{n.label}</Link>
              ))}
            </nav>
            <div className="mt-4 grid gap-2">
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--abc-color-border)] py-3 text-center text-sm font-semibold text-[var(--abc-color-fg)]">Sign in</Link>
              <Link href={cta} onClick={() => setOpen(false)} className="rounded-xl bg-[var(--abc-color-primary)] py-3 text-center text-sm font-semibold text-white">Build my site</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
