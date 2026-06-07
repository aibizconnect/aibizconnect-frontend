import type { TestimonialsContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

export default function TestimonialsSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: TestimonialsContent;
  theme?: ThemeTokens;
}) {
  return (
    <section
      style={{
        padding: `${theme.spacing.lg}px ${theme.spacing.md}px`,
        backgroundColor: theme.colors.secondary + "14",
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      <div className="mx-auto max-w-5xl">
        {content.heading && (
          <h2
            className="text-center text-3xl font-bold"
            style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
          >
            {content.heading}
          </h2>
        )}
        <div
          className="mt-10 grid sm:grid-cols-2"
          style={{ gap: theme.spacing.md }}
        >
          {content.items.map((t, i) => (
            <figure
              key={i}
              className="bg-white shadow-sm"
              style={{ borderRadius: theme.radii.md, padding: theme.spacing.md }}
            >
              <blockquote className="opacity-90">“{t.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                {t.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatarUrl}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.role && <div className="text-sm opacity-60">{t.role}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
