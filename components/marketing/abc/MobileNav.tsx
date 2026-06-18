"use client";

import { useState } from "react";
import Link from "next/link";
import { v, btnPrimary, NAV } from "./Shell";

/** Mobile hamburger menu for the marketing nav (md:hidden). Opens a full-width slide-down panel. */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: v("--radius-md"), border: `1px solid ${v("--border-default")}`, background: v("--surface-card"), cursor: "pointer" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={v("--text-strong")} strokeWidth="2" strokeLinecap="round">
          {open ? <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: "68px 0 0", background: "rgba(9,9,102,.18)", zIndex: 40 }} />
          {/* panel */}
          <div style={{ position: "fixed", top: 68, left: 0, right: 0, zIndex: 41, background: v("--surface-card"), borderBottom: `1px solid ${v("--border-subtle")}`, boxShadow: v("--shadow-lg"), padding: "12px 16px 20px" }}>
            <nav style={{ display: "grid" }}>
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} onClick={() => setOpen(false)}
                  style={{ padding: "14px 8px", fontSize: v("--text-md"), fontWeight: 600, color: v("--text-strong"), textDecoration: "none", borderBottom: `1px solid ${v("--border-subtle")}` }}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="grid gap-2" style={{ marginTop: 16 }}>
              <Link href="/login" onClick={() => setOpen(false)} style={{ textAlign: "center", padding: "12px", fontSize: v("--text-sm"), fontWeight: 600, color: v("--text-strong"), border: `1px solid ${v("--border-default")}`, borderRadius: v("--radius-md"), textDecoration: "none" }}>Log in</Link>
              <Link href="/start" onClick={() => setOpen(false)} style={{ ...btnPrimary, width: "100%" }}>Start free</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
