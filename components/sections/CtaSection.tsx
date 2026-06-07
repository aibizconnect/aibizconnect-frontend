import type { CtaContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";
import { BrandText } from "@/components/website/BrandText";

export default function CtaSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: CtaContent;
  theme?: ThemeTokens;
}) {
  return (
    <section
      className="text-center text-white"
      style={{
        backgroundColor: theme.colors.primary,
        padding: `${theme.spacing.lg}px ${theme.spacing.md}px`,
        fontFamily: theme.fonts.body,
      }}
    >
      <div className="mx-auto max-w-2xl">
        <h2
          className="text-3xl font-bold"
          style={{ fontFamily: theme.fonts.heading }}
        >
          <BrandText>{content.heading}</BrandText>
        </h2>
        {content.subheading && (
          <p className="mt-3 text-white/90">
            <BrandText>{content.subheading}</BrandText>
          </p>
        )}
        <a
          href={content.cta.href}
          className="mt-8 inline-block px-6 py-3 font-medium text-white"
          style={{
            backgroundColor: theme.colors.accent,
            borderRadius: theme.radii.md,
          }}
        >
          {content.cta.label}
        </a>
      </div>
    </section>
  );
}
