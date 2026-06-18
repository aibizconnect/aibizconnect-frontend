import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getPlatformRole } from "@/lib/auth/platform-admin";
import { PREBUILT_TEMPLATES } from "@/lib/sections/prebuilt-templates";
import { presetTokens } from "@/lib/design/token-presets";
import { tokensToCssVars, type BrandTokens } from "@/lib/design/tokens";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";
import { SectionView } from "@/components/sections/registry";
import SectionLibraryPreview from "@/components/preview/SectionLibraryPreview";

/**
 * Section Library preview (P-C, D-389). Gated internal page. Renders the token-driven variants for
 * BOTH presets as Server Components (no react-dom/server), passed to a client toggle so one switch
 * re-skins the whole set.
 */

// The P-B token-driven, re-skinnable variants (legacy self-contained prebuilts are excluded — they
// intentionally don't re-skin, so showing them under the switcher would mislead).
const RESKINNABLE = new Set([
  "nav-simple", "nav-cta", "hero-split", "hero-minimal", "header-page",
  "cta-banner", "cta-inline", "about-me", "about-team", "about-split", "features-3up", "stats-bar",
  "form-contact", "form-lead", "booking-inline", "booking-intro", "survey-single", "survey-multi",
  "pricing-3", "pricing-2", "faq-short", "faq-detailed", "testimonials-grid", "testimonials-carousel",
  "footer-minimal", "footer-full",
]);

function brandTokensToTheme(t: BrandTokens): ThemeTokens {
  return {
    ...DEFAULT_THEME,
    colors: { primary: t.colors.primary, secondary: t.colors.muted, accent: t.colors.accent, background: t.colors.background, text: t.colors.foreground },
    fonts: { heading: t.typography.fontHeading, body: t.typography.fontBody },
    radii: { ...DEFAULT_THEME.radii, md: t.spacing.radiusPx },
  };
}

function RenderedLibrary({ tokens, items }: { tokens: BrandTokens; items: { id: string; name: string; category: string; sections: any[] }[] }) {
  const theme = brandTokensToTheme(tokens);
  const vars = tokensToCssVars(tokens) as CSSProperties;
  let id = 0;
  const cssSink = { nextId: () => ++id };
  return (
    <div style={vars} className="space-y-8">
      {items.map((it) => (
        <section key={it.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <span className="text-sm font-medium text-slate-800">{it.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{it.category}</span>
          </div>
          <div style={{ background: theme.colors.background, color: theme.colors.text, fontFamily: theme.fonts.body }}>
            {it.sections.map((s: any, i: number) => <SectionView key={i} content={s} theme={theme} cssSink={cssSink} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function SectionLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/section-library");
  const role = await getPlatformRole();
  if (!role) redirect("/platform");

  const re = presetTokens("realestate")!;
  const nu = presetTokens("neutral")!;
  const items = PREBUILT_TEMPLATES.filter((p) => RESKINNABLE.has(p.id)).map((p) => ({ id: p.id, name: p.name, category: p.category, sections: p.sections }));

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-4">
        <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
      </div>
      <SectionLibraryPreview
        count={items.length}
        realestate={<RenderedLibrary tokens={re} items={items} />}
        neutral={<RenderedLibrary tokens={nu} items={items} />}
      />
    </div>
  );
}
