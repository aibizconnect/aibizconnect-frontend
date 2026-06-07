import type { CSSProperties } from "react";
import type { HeroContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";
import { BrandText } from "@/components/website/BrandText";

/**
 * Premium hero. Theme-driven (each tenant's palette + font pairing applies), upgraded
 * with frontend-design principles: atmospheric depth (radial brand glows + faint grid),
 * a staggered page-load reveal (CSS-only, works on the published static page), and a
 * refined split composition. Full-bleed image variant gets a directional gradient veil.
 */

// 6-digit hex → rgba string with alpha (so brand colors can wash the background softly).
function rgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return `rgba(15,23,42,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// One shared keyframe set + a tiny grid texture. Duplicated harmlessly if multiple heroes.
const ATMOSPHERE_CSS = `
@keyframes abcHeroUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes abcHeroFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
.abc-hero-rise { opacity: 0; animation: abcHeroUp .7s cubic-bezier(.2,.7,.2,1) forwards; }
.abc-hero-float { animation: abcHeroFloat 6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .abc-hero-rise { animation: none; opacity: 1; }
  .abc-hero-float { animation: none; }
}`;

export default function HeroSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: HeroContent;
  theme?: ThemeTokens;
}) {
  const headingFont = `${theme.fonts.heading}, system-ui, -apple-system, "Segoe UI", sans-serif`;
  const bodyFont = `${theme.fonts.body}, system-ui, -apple-system, "Segoe UI", sans-serif`;
  const primary = theme.colors.primary || "#1e3a8a";
  const accent = theme.colors.accent || "#2563eb";
  const text = theme.colors.text || "#0f172a";

  const PrimaryBtn = content.primaryCta && (
    <a
      href={content.primaryCta.href}
      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ backgroundColor: accent, boxShadow: `0 10px 30px -10px ${rgba(accent, 0.6)}` }}
    >
      {content.primaryCta.label}
      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </a>
  );
  const SecondaryBtn = content.secondaryCta && (
    <a
      href={content.secondaryCta.href}
      className="inline-flex items-center gap-2 rounded-xl border bg-white/70 px-6 py-3.5 text-base font-semibold backdrop-blur transition hover:bg-white"
      style={{ borderColor: rgba(primary, 0.25), color: text }}
    >
      <span aria-hidden style={{ color: accent }}>▷</span>
      {content.secondaryCta.label}
    </a>
  );

  // Full-bleed image hero (when a background image is set) — directional gradient veil
  // tinted by the brand for cohesion, with a staggered reveal.
  if (content.backgroundImageUrl) {
    const bg: CSSProperties = {
      backgroundImage: `url(${content.backgroundImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
    return (
      <section style={{ ...bg, fontFamily: bodyFont }} className="relative overflow-hidden px-6 py-32 text-center text-white">
        <style dangerouslySetInnerHTML={{ __html: ATMOSPHERE_CSS }} />
        <div className="absolute inset-0" aria-hidden style={{ background: `linear-gradient(120deg, ${rgba(primary, 0.82)} 0%, rgba(2,6,23,0.55) 55%, ${rgba(accent, 0.45)} 100%)` }} />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="abc-hero-rise text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl" style={{ fontFamily: headingFont, animationDelay: "60ms" }}>
            <BrandText>{content.heading}</BrandText>
          </h1>
          {content.subheading && <p className="abc-hero-rise mx-auto mt-5 max-w-2xl text-lg text-white/90" style={{ animationDelay: "180ms" }}><BrandText>{content.subheading}</BrandText></p>}
          <div className="abc-hero-rise mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: "300ms" }}>{PrimaryBtn}{SecondaryBtn}</div>
        </div>
      </section>
    );
  }

  // Default premium split hero — atmospheric background washed with brand color.
  return (
    <section className="relative overflow-hidden" style={{ fontFamily: bodyFont, backgroundColor: "#ffffff" }}>
      <style dangerouslySetInnerHTML={{ __html: ATMOSPHERE_CSS }} />
      {/* atmosphere: dual radial brand glows + faint grid for depth (not flat white) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden style={{
        background: `radial-gradient(60% 80% at 85% 10%, ${rgba(accent, 0.14)} 0%, transparent 60%), radial-gradient(55% 70% at 0% 100%, ${rgba(primary, 0.10)} 0%, transparent 55%)`,
      }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]" aria-hidden style={{
        backgroundImage: `linear-gradient(${rgba(primary, 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(primary, 0.05)} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        maskImage: "radial-gradient(70% 60% at 50% 30%, #000 0%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, #000 0%, transparent 80%)",
      }} />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 lg:py-32">
        <div>
          <h1
            className="abc-hero-rise text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-[3.75rem]"
            style={{ fontFamily: headingFont, color: text, animationDelay: "60ms" }}
          >
            <BrandText>{content.heading}</BrandText>
          </h1>
          {content.subheading && (
            <p className="abc-hero-rise mt-6 max-w-xl text-lg leading-relaxed" style={{ color: rgba(text, 0.62), animationDelay: "170ms" }}>
              <BrandText>{content.subheading}</BrandText>
            </p>
          )}
          <div className="abc-hero-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "280ms" }}>{PrimaryBtn}{SecondaryBtn}</div>
          <div className="abc-hero-rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: rgba(text, 0.55), animationDelay: "380ms" }}>
            <span className="inline-flex items-center gap-1.5"><Check accent={accent} /> No credit card required</span>
            <span className="inline-flex items-center gap-1.5"><Check accent={accent} /> Full access</span>
            <span className="inline-flex items-center gap-1.5"><Check accent={accent} /> Cancel anytime</span>
          </div>
        </div>

        {/* Right-side visual — brand-tinted gradient panel, gently floating */}
        <div className="relative abc-hero-rise" style={{ animationDelay: "240ms" }}>
          <div className="abc-hero-float overflow-hidden rounded-2xl p-5 shadow-2xl ring-1 ring-black/10"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, #0f172a 55%, ${rgba(accent, 0.85)} 100%)` }}>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
                  <div className="mb-2 h-2 w-10 rounded bg-white/30" />
                  <div className="h-12 rounded" style={{ background: `linear-gradient(to top, ${rgba(accent, 0.5)}, ${rgba(accent, 0.08)})` }} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10"><div className="mb-2 h-2 w-12 rounded bg-white/30" /><div className="h-8 rounded bg-white/10" /></div>
              <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10"><div className="mb-2 h-2 w-12 rounded bg-white/30" /><div className="h-8 rounded bg-white/10" /></div>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-xl bg-white px-4 py-3 text-sm shadow-xl ring-1 ring-black/5">
            <div className="font-semibold text-slate-800">AI Concierge</div>
            <div className="text-slate-500">3 new leads qualified</div>
          </div>
          <div className="absolute -right-3 -top-3 rounded-xl bg-white px-4 py-2 text-sm shadow-xl ring-1 ring-black/5">
            <div className="text-xs text-slate-400">This week</div>
            <div className="font-bold" style={{ color: accent }}>+47% pipeline</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke={accent} strokeWidth="2.5">
      <path d="M5 10.5l3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
