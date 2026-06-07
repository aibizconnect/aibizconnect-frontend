import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

export interface SiteNavItem {
  label: string;
  href: string;
  active?: boolean;
}

/**
 * Public-facing site navigation. Theme-aware. variant "footer" renders a muted
 * footer bar. Renders nothing when there are no items.
 */
export default function SiteNav({
  items,
  theme = DEFAULT_THEME,
  variant = "header",
  brandHref,
  tone = "light",
}: {
  items: SiteNavItem[];
  theme?: ThemeTokens;
  variant?: "header" | "footer";
  /** When set (header), shows the AI Biz Connect logo linking here. */
  brandHref?: string;
  /** Background tone behind the logo: "light" -> blue logo, "dark" -> white logo. */
  tone?: "light" | "dark";
}) {
  if (!items.length) return null;

  const isFooter = variant === "footer";
  // Background-aware logo: blue wordmark on light backgrounds, white on dark.
  const logoSrc = tone === "dark" ? "/logos/wordmark-white.png" : "/logos/wordmark-blue.png";
  return (
    <nav
      className="flex flex-wrap items-center"
      style={{
        gap: theme.spacing.md,
        padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
        borderTop: isFooter ? "1px solid rgba(0,0,0,0.08)" : undefined,
        borderBottom: isFooter ? undefined : "1px solid rgba(0,0,0,0.08)",
        backgroundColor: isFooter ? theme.colors.secondary + "10" : undefined,
        fontFamily: theme.fonts.body,
        justifyContent: isFooter ? "center" : "flex-start",
      }}
    >
      {!isFooter && brandHref && (
        <a href={brandHref} style={{ marginRight: "auto", display: "inline-flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="AI Biz Connect" style={{ height: 30, width: "auto" }} />
        </a>
      )}
      {items.map((item, i) => (
        <a
          key={i}
          href={item.href}
          className="text-sm"
          style={{
            color: item.active ? theme.colors.accent : theme.colors.text,
            fontWeight: item.active ? 700 : 500,
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
