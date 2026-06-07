import type { ListingsContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

export default function ListingsSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: ListingsContent;
  theme?: ThemeTokens;
}) {
  return (
    <section
      style={{
        padding: `${theme.spacing.lg}px ${theme.spacing.md}px`,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <h2
          className="text-3xl font-bold"
          style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
        >
          {content.heading}
        </h2>
        <div
          className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3"
          style={{ gap: theme.spacing.md }}
        >
          {content.items.map((item, i) => {
            const card = (
              <div
                className="overflow-hidden border border-gray-200"
                style={{ borderRadius: theme.radii.md }}
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-44 w-full object-cover"
                  />
                )}
                <div style={{ padding: theme.spacing.sm * 1.5 }}>
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.location && (
                    <p className="text-sm opacity-60">{item.location}</p>
                  )}
                  {item.price && (
                    <p
                      className="mt-1 font-medium"
                      style={{ color: theme.colors.accent }}
                    >
                      {item.price}
                    </p>
                  )}
                </div>
              </div>
            );
            return item.href ? (
              <a key={i} href={item.href} className="block">
                {card}
              </a>
            ) : (
              <div key={i}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
