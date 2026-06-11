import type { CSSProperties } from "react";
import type { ThemeTokens } from "@/lib/sections/theme";
import { resolveLink, type LinkValue } from "@/lib/sections/links";
import type {
  BulletListContent, NumberCounterContent, ProgressBarContent, PricingContent,
  FaqContent, GalleryContent, LogosContent, SocialContent, SliderContent,
  CountdownContent, MapContent, QrContent, IconContent, AudioContent, TabsContent, TickerContent, SurveyContent, BookingContent,
} from "@/lib/sections/schemas";
import Countdown from "./Countdown";
import Tabs from "./Tabs";
import Slideshow from "./Slideshow";
import Ticker from "./Ticker";
import Gallery from "./Gallery";
import Counter from "./Counter";
import InlineText from "./InlineText";

/** Extended best-in-class element renderers (functional, no external paid keys). */

const primary = (t?: ThemeTokens) => t?.colors.primary ?? "#1e3a8a";

export function BulletListSection({ content, theme, onEditItems }: { content: BulletListContent; theme?: ThemeTokens; onEditItems?: (items: { text: string }[]) => void }) {
  const style = (content as any).bulletStyle ?? "disc";
  const markerColor = (content as any).color || primary(theme);
  // Global text control (Ali): font/size/color for the whole list, falling back to theme.
  const textStyle: CSSProperties = {
    color: (content as any).textColor || theme?.colors.text,
    ...((content as any).fontSize ? { fontSize: (content as any).fontSize } : {}),
    ...((content as any).fontFamily ? { fontFamily: (content as any).fontFamily } : {}),
  };
  // Two-column flow (Ali): items run DOWN column 1 then continue in column 2 (1-5 / 6-10).
  // CSS multi-columns does exactly that; with a start number the numbering continues across.
  const cols = Number((content as any).columns) >= 2 ? 2 : 1;
  const colStyle: CSSProperties = cols === 2 ? { columnCount: 2, columnGap: 32 } : {};
  const startAt = Number((content as any).startAt) >= 0 && (content as any).startAt != null ? Number((content as any).startAt) : 1;
  // Direction: rtl puts the bullet/icon on the RIGHT and right-aligns text (for
  // Arabic/Hebrew etc.); ltr (default) keeps the icon on the left.
  const rtl = (content as any).direction === "rtl";
  const dir = rtl ? "rtl" : undefined;
  // In-place editing: each item's text is editable; commit writes the items array.
  const setItem = (i: number, text: string) =>
    onEditItems?.(content.items.map((it, j) => (j === i ? { ...it, text } : it)));
  // D-219: list items may carry links (footer link groups are Lists, not Menus). View mode
  // renders the real <a>; the editing path stays unwrapped so clicks edit instead of navigating.
  const itemNode = (it: { text: string; link?: LinkValue }, i: number) => {
    if (onEditItems) return <InlineText as="span" text={it.text} onChange={(t) => setItem(i, t)} style={textStyle} />;
    const { href, target } = resolveLink(it.link);
    return href
      ? <a href={href} target={target || "_self"} rel={target === "_blank" ? "noopener noreferrer" : undefined} className="hover:underline" style={textStyle}>{it.text}</a>
      : <span style={textStyle}>{it.text}</span>;
  };

  if (style === "number") {
    return (
      <ol dir={dir} start={startAt} className={`list-decimal space-y-1.5 ${rtl ? "pr-5 text-right" : "pl-5"}`} style={colStyle}>
        {content.items.map((it, i) => (
          <li key={i} style={{ color: markerColor, breakInside: "avoid" }}>{itemNode(it, i)}</li>
        ))}
      </ol>
    );
  }
  if (["circle", "square", "none"].includes(style)) {
    return (
      <ul dir={dir} className={`space-y-1.5 ${rtl ? "pr-5 text-right" : "pl-5"}`} style={{ listStyleType: style, ...colStyle }}>
        {content.items.map((it, i) => (
          <li key={i} style={{ color: markerColor, breakInside: "avoid" }}>{itemNode(it, i)}</li>
        ))}
      </ul>
    );
  }
  // Custom marker (Ali): any character/emoji set in the inspector; ✓ / → keep their presets.
  const marker = style === "custom" ? ((content as any).bulletIcon || "•")
    : style === "check" ? "✓" : style === "arrow" ? (rtl ? "←" : "→") : null;
  return (
    <ul dir={dir} className="space-y-1.5" style={colStyle}>
      {content.items.map((it, i) => (
        <li key={i} className={`flex items-start gap-2 ${rtl ? "flex-row-reverse text-right" : ""}`} style={{ breakInside: "avoid" }}>
          {marker
            ? <span className="mt-0.5 shrink-0 font-semibold" style={{ color: markerColor }}>{marker}</span>
            : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: markerColor }} />}
          {itemNode(it, i)}
        </li>
      ))}
    </ul>
  );
}

export function NumberCounterSection({ content, theme }: { content: NumberCounterContent; theme?: ThemeTokens }) {
  return <Counter value={content.value} start={content.start} end={content.end} duration={content.duration} prefix={content.prefix} suffix={content.suffix} label={content.label} color={primary(theme)} />;
}

export function ProgressBarSection({ content, theme }: { content: ProgressBarContent; theme?: ThemeTokens }) {
  const pct = Math.max(0, Math.min(100, content.percent ?? 0));
  const c: any = content;
  const h = Number(c.height) > 0 ? Number(c.height) : 10;
  const showValue = c.showValue !== false;
  const animate = c.animate !== false;
  return (
    <div>
      {(content.label || showValue) && (
        <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{content.label}</span>{showValue && <span>{pct}%</span>}</div>
      )}
      <div className="w-full overflow-hidden rounded-full" style={{ height: h, background: c.trackColor || "#e2e8f0" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: c.barColor || primary(theme), ...(animate ? { transition: "width 1.2s ease-out" } : {}) }}
        />
      </div>
    </div>
  );
}

export function PricingSection({ content, theme }: { content: PricingContent; theme?: ThemeTokens }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {content.plans.map((p, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">{p.name}</div>
          <div className="mt-2 text-3xl font-bold" style={{ color: primary(theme) }}>{p.price}<span className="text-sm font-normal text-slate-400">{p.period}</span></div>
          <ul className="mt-4 space-y-2 text-left text-sm text-slate-600">
            {p.features.map((f, j) => <li key={j} className="flex gap-2"><span style={{ color: primary(theme) }}>✓</span>{f.text}</li>)}
          </ul>
          {p.ctaLabel && <a href={p.ctaHref || "#"} className="mt-5 inline-block rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ background: primary(theme) }}>{p.ctaLabel}</a>}
        </div>
      ))}
    </div>
  );
}

export function FaqSection({ content }: { content: FaqContent; theme?: ThemeTokens }) {
  return (
    <div className="mx-auto max-w-2xl divide-y divide-slate-200 rounded-xl border border-slate-200">
      {content.items.map((it, i) => (
        <details key={i} className="group p-4">
          <summary className="cursor-pointer list-none font-medium text-slate-800">{it.q}</summary>
          <p className="mt-2 text-sm text-slate-600">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function GallerySection({ content }: { content: GalleryContent; theme?: ThemeTokens }) {
  return <Gallery images={content.images ?? []} columns={content.columns ?? 3} lightbox={content.lightbox ?? true} />;
}

export function LogosSection({ content }: { content: LogosContent; theme?: ThemeTokens }) {
  const imgs = content.images ?? [];
  if (!imgs.length) return <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add logo images</div>;
  const gray = content.grayscale !== false;
  const cls = `h-10 w-auto object-contain${gray ? " grayscale" : ""}`;
  if (content.scroll) {
    const doubled = [...imgs, ...imgs];
    return (
      <div className="abc-logos-wrap">
        <div className="abc-logos-track">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {doubled.map((im, i) => <img key={i} src={im.url} alt="" className={cls} />)}
        </div>
        <style>{`
          .abc-logos-wrap{overflow:hidden}
          .abc-logos-track{display:inline-flex;align-items:center;gap:48px;white-space:nowrap;animation:abc-logos 24s linear infinite;will-change:transform;opacity:.8}
          .abc-logos-wrap:hover .abc-logos-track{animation-play-state:paused}
          @keyframes abc-logos{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        `}</style>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 opacity-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imgs.map((im, i) => <img key={i} src={im.url} alt="" className={cls} />)}
    </div>
  );
}

const SOCIAL_BRAND: Record<string, { color: string; glyph: string }> = {
  facebook: { color: "#1877F2", glyph: "f" }, fb: { color: "#1877F2", glyph: "f" },
  instagram: { color: "#E1306C", glyph: "◉" }, ig: { color: "#E1306C", glyph: "◉" },
  linkedin: { color: "#0A66C2", glyph: "in" },
  x: { color: "#111111", glyph: "𝕏" }, twitter: { color: "#111111", glyph: "𝕏" },
  youtube: { color: "#FF0000", glyph: "▶" }, yt: { color: "#FF0000", glyph: "▶" },
  tiktok: { color: "#111111", glyph: "♪" },
  pinterest: { color: "#E60023", glyph: "P" },
  whatsapp: { color: "#25D366", glyph: "✆" },
  telegram: { color: "#0088cc", glyph: "✈" },
  email: { color: "#64748b", glyph: "✉" }, mail: { color: "#64748b", glyph: "✉" },
  website: { color: "#1e3a8a", glyph: "🌐" }, link: { color: "#1e3a8a", glyph: "🔗" },
};

export function SocialSection({ content, theme }: { content: SocialContent; theme?: ThemeTokens }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {content.links.map((l, i) => {
        const key = (l.platform || "").trim().toLowerCase();
        const brand = SOCIAL_BRAND[key] ?? { color: primary(theme), glyph: (l.platform || "?").slice(0, 2) };
        return (
          <a key={i} href={l.url} target="_blank" rel="noreferrer" aria-label={l.platform} title={l.platform}
            className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: brand.color }}>
            {brand.glyph}
          </a>
        );
      })}
    </div>
  );
}

export function SliderSection({ content, theme }: { content: SliderContent; theme?: ThemeTokens }) {
  return (
    <Slideshow
      images={content.images ?? []}
      autoplay={content.autoplay ?? true}
      interval={content.interval ?? 4}
      arrows={content.arrows ?? true}
      dots={content.dots ?? true}
      height={content.height ?? 360}
      fit={content.fit ?? "cover"}
      accent={primary(theme)}
    />
  );
}

export function TickerSection({ content }: { content: TickerContent; theme?: ThemeTokens }) {
  const c: any = content;
  return <Ticker items={content.items ?? []} images={c.images ?? []} imageHeight={c.imageHeight} speed={content.speed ?? 30} bg={content.bg} color={content.color} separator={content.separator} direction={content.direction} />;
}

/** Editor-canvas PREVIEW of a survey (non-submitting). The live site renders the functional SiteSurvey. */
export function SurveySection({ content, theme }: { content: SurveyContent; theme?: ThemeTokens }) {
  const qs = content.questions ?? [];
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-5">
      {content.heading && <h3 className="mb-3 text-lg font-semibold" style={{ color: primary(theme) }}>{content.heading}</h3>}
      {qs.length === 0 ? <p className="text-sm text-slate-400">Add questions in the inspector.</p> : (
        <div className="space-y-4">
          {qs.map((q, i) => (
            <div key={i}>
              <div className="mb-1 text-sm font-medium text-slate-700">{q.label}{q.required ? " *" : ""}</div>
              {(q.kind === "single" || q.kind === "multiple") && (
                <div className="space-y-1">{(q.options ?? []).map((o, j) => (
                  <label key={j} className="flex items-center gap-2 text-sm text-slate-600"><input type={q.kind === "single" ? "radio" : "checkbox"} disabled /> {o.text}</label>
                ))}</div>
              )}
              {q.kind === "text" && <input disabled placeholder="Answer…" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />}
              {q.kind === "email" && <input disabled placeholder="you@email.com" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />}
              {q.kind === "rating" && <div className="text-lg text-amber-400">★★★★★</div>}
            </div>
          ))}
          <button disabled className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: primary(theme) }}>{content.submitLabel || "Submit"}</button>
        </div>
      )}
    </div>
  );
}

export function CountdownSection({ content, theme }: { content: CountdownContent; theme?: ThemeTokens }) {
  return <Countdown color={primary(theme)} label={content.label}
    mode={content.mode} from={content.from} to={content.to} duration={content.duration}
    prefix={content.prefix} suffix={content.suffix} minutes={content.minutes} target={content.target}
    timerScope={(content as any).timerScope} timerId={(content as any).timerId}
    units={content.units} display={content.display}
    title={content.title} footer={content.footer} preText={content.preText} postText={content.postText}
    font={content.font} fgColor={content.fgColor} bgColor={content.bgColor} size={content.size} align={content.align} />;
}

export function MapSection({ content }: { content: MapContent; theme?: ThemeTokens }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&query=${encodeURIComponent(content.query)}&marker=`;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <iframe title="Map" className="h-64 w-full" src={`https://maps.google.com/maps?q=${encodeURIComponent(content.query)}&output=embed`} />
      <noscript>{src}</noscript>
    </div>
  );
}

export function IconSection({ content, theme }: { content: IconContent; theme?: ThemeTokens }) {
  const align = content.align ?? "center";
  const size = content.size ?? 40;
  const color = content.color || primary(theme);
  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontSize: size, lineHeight: 1, color }}>{content.icon || "★"}</div>
      {content.heading && <div className="mt-2 font-semibold" style={{ color: theme?.colors.text }}>{content.heading}</div>}
      {content.text && <div className="mt-1 text-sm" style={{ color: theme?.colors.text ?? "#64748b" }}>{content.text}</div>}
    </div>
  );
}

export function AudioSection({ content }: { content: AudioContent; theme?: ThemeTokens }) {
  if (!content.url) return <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">Add an audio file URL in the inspector.</div>;
  return (
    <div>
      {content.title && <div className="mb-1 text-sm font-medium text-slate-700">{content.title}</div>}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls preload="none" src={content.url} className="w-full">Your browser does not support audio.</audio>
    </div>
  );
}

export function TabsSection({ content, theme }: { content: TabsContent; theme?: ThemeTokens }) {
  return <Tabs tabs={content.tabs ?? []} accent={primary(theme)} text={theme?.colors.text} />;
}

/** Editor-canvas PREVIEW of a booking element. The live site renders the functional BookingWidget. */
export function BookingSection({ content, theme }: { content: BookingContent; theme?: ThemeTokens }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-5 text-center">
      {content.heading && <h3 className="text-lg font-semibold" style={{ color: primary(theme) }}>{content.heading}</h3>}
      {content.subheading && <p className="mt-1 text-sm text-slate-500">{content.subheading}</p>}
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-400">
        📅 Booking calendar{content.calendarSlug ? <> — <span className="font-mono text-slate-600">{content.calendarSlug}</span></> : <> — set a <b>calendar slug</b> in the inspector</>}<br />
        <span className="text-xs">Available times appear here on the live site.</span>
      </div>
    </div>
  );
}

export function QrSection({ content }: { content: QrContent; theme?: ThemeTokens }) {
  const size = content.size ?? 160;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(content.data)}`;
  return (
    <div className="flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="QR code" width={size} height={size} className="rounded-lg" />
    </div>
  );
}
