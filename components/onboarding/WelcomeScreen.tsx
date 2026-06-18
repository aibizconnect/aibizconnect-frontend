"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Public-facing Welcome screen — the AIBizConnect product entry, built to match the Claude
 * Design handoff (AIBizConnect.dc.html · "import" screen). Wrapped by a `.abc-ds` parent so it
 * wears the ABC design system. It does NOT provision anything anonymously (honors the onboarding
 * spine): the URL/handle a visitor enters is carried as a `seed` into sign-up → /onboarding.
 */

export default function WelcomeScreen({ authed }: { authed: boolean }) {
  const router = useRouter();
  const [site, setSite] = useState("");

  function go(seedValue?: string) {
    const seed = (seedValue ?? site).trim();
    const dest = seed ? `/onboarding?seed=${encodeURIComponent(seed)}` : "/onboarding";
    router.push(authed ? dest : `/login?next=${encodeURIComponent(dest)}`);
  }

  const navLink: React.CSSProperties = { cursor: "pointer" };
  const connectBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px",
    border: "1px solid var(--border-default)", borderRadius: "var(--radius-pill)", background: "var(--surface-card)",
    fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" as unknown as number,
    color: "var(--text-strong)", cursor: "pointer", boxShadow: "var(--shadow-xs)",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(120% 80% at 50% -10%, var(--blue-50) 0%, var(--surface-page) 55%)" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/abc/app-icon.png" alt="AIBizConnect" style={{ width: 34, height: 34, display: "block" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em", color: "var(--navy-900)" }}>
            AIBiz<span style={{ color: "var(--color-primary)" }}>Connect</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)" as unknown as number, color: "var(--gray-600)" }}>
          <a href="/#how" style={{ ...navLink, color: "inherit" }}>Features</a>
          <a href="/#pricing" style={{ ...navLink, color: "inherit" }}>Pricing</a>
          <a href="/#industries" style={{ ...navLink, color: "inherit" }}>Examples</a>
          <a href="/login" style={{ color: "var(--color-primary)", cursor: "pointer" }}>Sign in</a>
        </div>
      </div>

      {/* Center */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px 70px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xs)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-bold)" as unknown as number, letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 26 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)" }} />
          Your whole business online · in minutes
        </div>

        <h1 style={{ fontSize: "var(--text-5xl)", maxWidth: 780, color: "var(--navy-900)", lineHeight: 1.05, marginBottom: 18 }}>
          Tell us about your business.<br />We build the rest.
        </h1>
        <p style={{ fontSize: "var(--text-lg)", color: "var(--text-body)", maxWidth: 560, marginBottom: 34 }}>
          Paste your website or social handle. Our AI reads what you already have, then generates a site, shop, lead funnels and social posts — ready to launch.
        </p>

        {/* Analyze input card */}
        <div style={{ width: "100%", maxWidth: 560, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 6px 6px 16px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" /></svg>
            <input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") go(); }}
              placeholder="yourbusiness.com"
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "var(--font-sans)", fontSize: "var(--text-md)", color: "var(--text-strong)", background: "transparent", minWidth: 0 }}
            />
            <button onClick={() => go()} style={{ height: 46, padding: "0 22px", border: "none", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: "var(--weight-semibold)" as unknown as number, fontSize: "var(--text-sm)", cursor: "pointer", boxShadow: "var(--shadow-brand)", display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              Analyze
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>

        {/* Connect row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>or connect</span>
          <button onClick={() => go()} style={connectBtn}>📸 Instagram</button>
          <button onClick={() => go()} style={connectBtn}>Facebook</button>
          <button onClick={() => go("")} style={{ ...connectBtn, color: "var(--text-muted)" }}>Start from scratch</button>
        </div>

        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 30 }}>
          No credit card · Free to build · Trusted by 12,000+ solo pros &amp; small businesses
        </p>
      </div>
    </div>
  );
}
