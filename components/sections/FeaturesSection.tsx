import type { FeaturesContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

/**
 * Premium feature/industry grid (aibizconnect.app-style): generous spacing, a
 * centered bold sans-serif heading, and clean white cards with an accent icon
 * chip and subtle hover lift. Used for "Built for service professionals",
 * "Everything you need…", value props, and step lists.
 */
export default function FeaturesSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: FeaturesContent;
  theme?: ThemeTokens;
}) {
  const headingFont = `${theme.fonts.heading}, system-ui, -apple-system, "Segoe UI", sans-serif`;
  const bodyFont = `${theme.fonts.body}, system-ui, -apple-system, "Segoe UI", sans-serif`;
  const accent = theme.colors.accent || "#2563eb";
  const text = theme.colors.text || "#0f172a";

  return (
    <section className="bg-slate-50 px-6 py-20" style={{ fontFamily: bodyFont }}>
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
          style={{ fontFamily: headingFont, color: text }}
        >
          {content.heading}
        </h2>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.features.map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${accent}, ${shade(accent)})` }}
              >
                {f.icon || f.title.charAt(0)}
              </div>
              <h3 className="text-lg font-bold" style={{ color: text }}>{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Slightly darker/shifted shade of a hex color for the icon-chip gradient. */
function shade(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#0ea5e9";
  const n = parseInt(m[1], 16);
  const r = Math.max(0, ((n >> 16) & 255) - 30);
  const g = Math.min(255, ((n >> 8) & 255) + 20);
  const b = Math.min(255, (n & 255) + 40);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
