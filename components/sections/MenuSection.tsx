"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { roleStyleFor, type RoleStyle, type ThemeTokens } from "@/lib/sections/theme";
import type { MenuContent } from "@/lib/sections/schemas";

// Z-index scale: the menu dropdown floats above ALL page elements, but stays BELOW the
// editor popups/modals (which use ~2.1e9). 2000 is comfortably above section content.
const MENU_DROPDOWN_Z = 2000;

/** RoleStyle → inline CSS (font family/size/weight/italic/spacing/transform). */
function roleCss(r: RoleStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (r.fontFamily) css.fontFamily = `${r.fontFamily}, system-ui, sans-serif`;
  if (r.fontSize) css.fontSize = r.fontSize;
  if (r.fontWeight) css.fontWeight = r.fontWeight as any;
  if (r.italic) css.fontStyle = "italic";
  if (r.letterSpacing) css.letterSpacing = r.letterSpacing;
  if (r.lineHeight) css.lineHeight = r.lineHeight;
  if (r.textTransform) css.textTransform = r.textTransform;
  if (r.backgroundColor) css.backgroundColor = r.backgroundColor;
  return css;
}

/**
 * Navigation menu element. Top-level items render in a row (or column); any item with a
 * submenu (children) reveals its dropdown on hover/focus. The dropdown is rendered in a
 * PORTAL to <body> with a fixed position so it floats above every page section (which now
 * each create their own stacking context) — yet remains below the editor modals.
 */
export function MenuSection({ content, theme, bp }: { content: MenuContent; theme?: ThemeTokens; bp?: "desktop" | "tablet" | "mobile" }) {
  const items = Array.isArray(content.items) ? content.items : [];
  const vertical = content.orientation === "vertical";
  const menuRoleStyle = roleStyleFor(theme, "menu");
  const subRoleStyle = roleStyleFor(theme, "submenu");
  // Text color: explicit element color > Menu role color > theme text. Submenu uses its role.
  const color = content.color || menuRoleStyle.color || theme?.colors.text || "#0f172a";
  // Submenu (dropdown) formatting: per-element fields win over the Submenu role, then defaults.
  const subColor = (content as any).submenuColor || subRoleStyle.color || color;
  const subBg = (content as any).submenuBg || subRoleStyle.backgroundColor || "#ffffff";
  const subHoverBg = (content as any).submenuHoverBg || "#f1f5f9";
  const subRadius = (content as any).submenuRadius ?? 10;
  const accent = content.activeColor || theme?.colors.accent || "#2563eb";
  const justify = content.align === "center" ? "center" : content.align === "right" ? "flex-end" : "flex-start";
  const menuRole = roleCss(menuRoleStyle);
  const subRole = roleCss(subRoleStyle);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<{ idx: number; left: number; top: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setMounted(true); return () => { if (closeTimer.current) clearTimeout(closeTimer.current); }; }, []);

  // Responsive: collapse to a hamburger on tablet/mobile. In the editor the breakpoint comes
  // from the device preview (bp); on the public site we watch the viewport width.
  const [winNarrow, setWinNarrow] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<Record<number, boolean>>({});
  const navRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const check = () => setWinNarrow(typeof window !== "undefined" && window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const compact = bp === "tablet" || bp === "mobile" || (!bp && winNarrow) || (bp === "desktop" && winNarrow);

  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => setOpen(null), 140); };
  const openAt = (idx: number, el: HTMLElement) => {
    cancelClose();
    const r = el.getBoundingClientRect();
    // Below the item (horizontal menu) or to its right (vertical menu); clamp to viewport.
    const top = vertical ? r.top : r.bottom + 6;
    let left = vertical ? r.right + 6 : r.left;
    if (typeof window !== "undefined") left = Math.min(left, window.innerWidth - 200);
    setOpen({ idx, left: Math.max(8, left), top });
  };

  // ── Compact (tablet/mobile): hamburger toggle + vertical panel ──────────────
  if (compact) {
    return (
      <nav ref={navRef} style={{ position: "relative", display: "flex", justifyContent: justify, ...menuRole, color }}>
        <button type="button" aria-label="Menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color, fontSize: 20, lineHeight: 1, cursor: "pointer" }}>
          {mobileOpen ? "✕" : "☰"}
        </button>
        {mobileOpen && (
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8, zIndex: MENU_DROPDOWN_Z,
            minWidth: 220, maxWidth: "90vw", background: subBg, border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: subRadius, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", padding: 8,
            display: "flex", flexDirection: "column", gap: 2, ...subRole,
          }}>
            {items.map((item, i) => {
              const kids = Array.isArray(item.children) ? item.children : [];
              const hasKids = kids.length > 0;
              const isOpen = !!mobileExpanded[i];
              return (
                <div key={i}>
                  {hasKids ? (
                    // Parent with a submenu: collapsed until tapped, then expands.
                    <button type="button" onClick={() => setMobileExpanded((e) => ({ ...e, [i]: !e[i] }))}
                      style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 6, border: "none", background: "transparent", textAlign: "left", color: subColor, fontWeight: 600, fontSize: "1em", cursor: "pointer" }}>
                      <span>{item.label}</span>
                      <span style={{ fontSize: "0.7em", opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                    </button>
                  ) : (
                    <a href={item.href || "#"} onClick={() => setMobileOpen(false)}
                      style={{ display: "block", padding: "9px 10px", borderRadius: 6, textDecoration: "none", color: subColor, fontWeight: 600 }}>
                      {item.label}
                    </a>
                  )}
                  {hasKids && isOpen && kids.map((sub, j) => (
                    <a key={j} href={sub.href || "#"} onClick={() => setMobileOpen(false)}
                      style={{ display: "block", padding: "7px 10px 7px 22px", borderRadius: 6, textDecoration: "none", color: subColor, opacity: 0.85, fontSize: "0.95em" }}>
                      {sub.label}
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav
      style={{
        position: "relative", zIndex: 50,
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        flexWrap: vertical ? "nowrap" : "wrap",
        alignItems: vertical ? "stretch" : "center",
        justifyContent: vertical ? "flex-start" : justify,
        gap: typeof content.gap === "number" ? content.gap : 18,
        ...menuRole,
        fontFamily: content.fontFamily ? `${content.fontFamily}, system-ui, sans-serif` : (menuRole.fontFamily || theme?.fonts.body),
        fontSize: content.fontSize ? `${content.fontSize}px` : (menuRole.fontSize ?? 14),
        fontWeight: (content.fontWeight as any) || menuRole.fontWeight || 500,
      }}
    >
      {items.map((item, i) => {
        const kids = Array.isArray(item.children) ? item.children : [];
        const hasKids = kids.length > 0;
        const isOpen = open?.idx === i;
        return (
          <div
            key={i}
            style={{ position: "relative" }}
            onMouseEnter={(e) => hasKids && openAt(i, e.currentTarget)}
            onMouseLeave={() => hasKids && scheduleClose()}
          >
            <a
              href={item.href || "#"}
              style={{ color, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", whiteSpace: "nowrap" }}
              onFocus={(e) => hasKids && openAt(i, e.currentTarget.parentElement as HTMLElement)}
            >
              {item.label}
              {hasKids && (
                <span style={{ fontSize: "0.7em", opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
              )}
            </a>
            {/* Submenu rendered via portal (see below) so it escapes section stacking. */}
            {hasKids && isOpen && mounted && createPortal(
              <div
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                style={{
                  position: "fixed", left: open!.left, top: open!.top, zIndex: MENU_DROPDOWN_Z,
                  minWidth: 180, background: subBg, border: "1px solid rgba(0,0,0,0.08)", borderRadius: subRadius,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)", padding: 6, display: "flex", flexDirection: "column",
                  color: subColor, ...subRole,
                }}
              >
                {kids.map((sub, j) => (
                  <a
                    key={j}
                    href={sub.href || "#"}
                    style={{ color: subColor, padding: "7px 10px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = subHoverBg; (e.currentTarget as HTMLElement).style.color = accent; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = subColor; }}
                  >
                    {sub.label}
                  </a>
                ))}
              </div>,
              document.body,
            )}
          </div>
        );
      })}
    </nav>
  );
}
