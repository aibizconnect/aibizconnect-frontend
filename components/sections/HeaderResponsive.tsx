"use client";

import { useEffect, useRef, useState } from "react";
import { roleStyleFor, type ThemeTokens } from "@/lib/sections/theme";

/** A single nav item pulled from the header's menu element. */
export interface HeaderNavItem {
  label?: string;
  href?: string;
  children?: { label?: string; href?: string }[];
}

/**
 * Responsive HEADER wrapper (Ali's ruling): on mobile + tablet the header collapses to a
 * bar — logo on the left, a hamburger (☰) on the right — and the nav links PLUS any CTA
 * buttons (e.g. "Sign in") move INSIDE the hamburger panel. On desktop it renders the
 * normal row untouched.
 *
 * Two switching modes:
 *  - Editor (cssMode=false): the active device `bp` decides which layout shows (JS).
 *  - Public site (cssMode=true): BOTH layouts render and CSS media queries toggle them at
 *    1024px, so it's correct without JS / before hydration.
 */
export default function HeaderResponsive({
  desktop, logo, cta, navItems, theme, bp, cssMode, uid = 0,
}: {
  desktop: React.ReactNode;
  logo: React.ReactNode;
  cta: React.ReactNode;
  navItems: HeaderNavItem[];
  theme?: ThemeTokens;
  bp?: "desktop" | "tablet" | "mobile";
  cssMode?: boolean;
  uid?: number;
}) {
  const [winCompact, setWinCompact] = useState(false);
  useEffect(() => {
    const check = () => setWinCompact(typeof window !== "undefined" && window.innerWidth <= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // CSS-toggle mode (public): emit a scoped media query and render both layers.
  if (cssMode) {
    const d = `hdr-d-${uid}`;
    const c = `hdr-c-${uid}`;
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html:
          `.${d}{display:block}.${c}{display:none}@media (max-width:1024px){.${d}{display:none}.${c}{display:block}}` }} />
        <div className={d}>{desktop}</div>
        <div className={c}><Bar logo={logo} cta={cta} navItems={navItems} theme={theme} /></div>
      </>
    );
  }

  // Editor mode: pick a single layout from the active device (fall back to viewport).
  const compact = bp === "tablet" || bp === "mobile" || (!bp && winCompact);
  return compact ? <Bar logo={logo} cta={cta} navItems={navItems} theme={theme} /> : <>{desktop}</>;
}

function Bar({ logo, cta, navItems, theme }: {
  logo: React.ReactNode; cta: React.ReactNode; navItems: HeaderNavItem[]; theme?: ThemeTokens;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const ref = useRef<HTMLDivElement | null>(null);
  const sub = roleStyleFor(theme, "submenu");
  const menu = roleStyleFor(theme, "menu");
  const color = menu.color || theme?.colors.text || "#0f172a";
  const panelBg = sub.backgroundColor || "#ffffff";
  const linkColor = sub.color || color;

  // Close the panel on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>{logo}</div>
      <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, flex: "0 0 auto", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color, fontSize: 22, lineHeight: 1, cursor: "pointer" }}>
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, left: 0, marginTop: 8, zIndex: 2000,
          background: panelBg, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 12,
          boxShadow: "0 14px 36px rgba(0,0,0,0.18)", padding: 10, display: "flex", flexDirection: "column", gap: 4,
        }}>
          {navItems.map((item, i) => {
            const kids = item.children ?? [];
            const hasKids = kids.length > 0;
            const isOpen = !!expanded[i];
            return (
              <div key={i}>
                {hasKids ? (
                  // Parent with a submenu: tapping toggles the (initially collapsed) children.
                  <button type="button" onClick={() => setExpanded((e) => ({ ...e, [i]: !e[i] }))}
                    style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", textAlign: "left", color: linkColor, fontWeight: 600, fontSize: "1em", cursor: "pointer" }}>
                    <span>{item.label}</span>
                    <span style={{ fontSize: "0.7em", opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                  </button>
                ) : (
                  <a href={item.href || "#"} onClick={() => setOpen(false)}
                    style={{ display: "block", padding: "10px 12px", borderRadius: 8, textDecoration: "none", color: linkColor, fontWeight: 600 }}>
                    {item.label}
                  </a>
                )}
                {hasKids && isOpen && kids.map((s, j) => (
                  <a key={j} href={s.href || "#"} onClick={() => setOpen(false)}
                    style={{ display: "block", padding: "8px 12px 8px 26px", borderRadius: 8, textDecoration: "none", color: linkColor, opacity: 0.85, fontSize: "0.95em" }}>
                    {s.label}
                  </a>
                ))}
              </div>
            );
          })}
          {/* CTA buttons (e.g. "Sign in") moved inside the menu, full-width. */}
          {cta != null && (
            <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: 8 }} onClick={() => setOpen(false)}>
              {cta}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
