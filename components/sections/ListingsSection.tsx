import type { ListingsContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

/**
 * Listings element. In the public site this `type:"listings"` (source:"idx") is intercepted and
 * rendered live by components/website/SiteListings (it needs the tenantId + a client fetch). Here
 * in the editor canvas / preview — where there's no tenant data context — an IDX-bound element shows
 * a labelled placeholder describing its bound search, and a legacy "manual" element renders its
 * static items as before.
 */
export default function ListingsSection({ content, theme = DEFAULT_THEME }: { content: ListingsContent; theme?: ThemeTokens }) {
  const accent = theme.colors?.primary ?? "#1e3a8a";

  if (content.source === "idx") {
    const f = content.filter ?? {};
    const bits = [
      f.transactionType, f.propertyClass, f.propertyUse,
      f.city || f.municipality || f.community,
      f.minPrice != null ? `from $${Number(f.minPrice).toLocaleString()}` : null,
      f.maxPrice != null ? `to $${Number(f.maxPrice).toLocaleString()}` : null,
      f.beds != null ? `${f.beds}+ bed` : null,
    ].filter(Boolean);
    return (
      <section style={{ background: theme.colors?.background, color: theme.colors?.text, fontFamily: theme.fonts?.body }} className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          {content.heading && <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: accent, fontFamily: theme.fonts?.heading }}>{content.heading}</h2>}
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">● Live MLS listings</div>
          <p className="mt-1 text-sm text-slate-500">{bits.length ? `Bound to: ${bits.join(" · ")}` : "Bound to: all active listings (newest first)"} — renders live on your published site.</p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: Math.min(content.count ?? 6, 6) }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-3xl text-slate-300">🏠</div>
                <div className="space-y-2 p-3">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-3 w-32 rounded bg-slate-100" />
                  <div className="h-3 w-24 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Legacy manual mode — static cards.
  const items = content.items ?? [];
  return (
    <section style={{ padding: `${theme.spacing.lg}px ${theme.spacing.md}px`, backgroundColor: theme.colors.background, color: theme.colors.text, fontFamily: theme.fonts.body }}>
      <div className="mx-auto max-w-6xl">
        {content.heading && <h2 className="text-3xl font-bold" style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}>{content.heading}</h2>}
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: theme.spacing.md }}>
          {items.map((item, i) => {
            const card = (
              <div className="overflow-hidden border border-gray-200" style={{ borderRadius: theme.radii.md }}>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
                )}
                <div style={{ padding: theme.spacing.sm * 1.5 }}>
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.location && <p className="text-sm opacity-60">{item.location}</p>}
                  {item.price && <p className="mt-1 font-medium" style={{ color: theme.colors.accent }}>{item.price}</p>}
                </div>
              </div>
            );
            return item.href ? <a key={i} href={item.href} className="block">{card}</a> : <div key={i}>{card}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
