import type { ThemeTokens } from "@/lib/sections/theme";
import type {
  BulletListContent, NumberCounterContent, ProgressBarContent, PricingContent,
  FaqContent, GalleryContent, LogosContent, SocialContent, SliderContent,
  CountdownContent, MapContent, QrContent,
} from "@/lib/sections/schemas";
import Countdown from "./Countdown";
import InlineText from "./InlineText";

/** Extended GHL-parity element renderers (functional, no external paid keys). */

const primary = (t?: ThemeTokens) => t?.colors.primary ?? "#1e3a8a";

export function BulletListSection({ content, theme, onEditItems }: { content: BulletListContent; theme?: ThemeTokens; onEditItems?: (items: { text: string }[]) => void }) {
  const style = (content as any).bulletStyle ?? "disc";
  const markerColor = (content as any).color || primary(theme);
  // Direction: rtl puts the bullet/icon on the RIGHT and right-aligns text (for
  // Arabic/Hebrew etc.); ltr (default) keeps the icon on the left.
  const rtl = (content as any).direction === "rtl";
  const dir = rtl ? "rtl" : undefined;
  // In-place editing: each item's text is editable; commit writes the items array.
  const setItem = (i: number, text: string) =>
    onEditItems?.(content.items.map((it, j) => (j === i ? { ...it, text } : it)));
  const itemNode = (it: { text: string }, i: number) =>
    onEditItems
      ? <InlineText as="span" text={it.text} onChange={(t) => setItem(i, t)} style={{ color: theme?.colors.text }} />
      : <span style={{ color: theme?.colors.text }}>{it.text}</span>;

  if (style === "number") {
    return (
      <ol dir={dir} className={`list-decimal space-y-1.5 ${rtl ? "pr-5 text-right" : "pl-5"}`}>
        {content.items.map((it, i) => (
          <li key={i} style={{ color: markerColor }}>{itemNode(it, i)}</li>
        ))}
      </ol>
    );
  }
  if (["circle", "square", "none"].includes(style)) {
    return (
      <ul dir={dir} className={`space-y-1.5 ${rtl ? "pr-5 text-right" : "pl-5"}`} style={{ listStyleType: style }}>
        {content.items.map((it, i) => (
          <li key={i} style={{ color: markerColor }}>{itemNode(it, i)}</li>
        ))}
      </ul>
    );
  }
  const marker = style === "check" ? "✓" : style === "arrow" ? (rtl ? "←" : "→") : null;
  return (
    <ul dir={dir} className="space-y-1.5">
      {content.items.map((it, i) => (
        <li key={i} className={`flex items-start gap-2 ${rtl ? "flex-row-reverse text-right" : ""}`}>
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
  return (
    <div className="text-center">
      <div className="text-4xl font-extrabold md:text-5xl" style={{ color: primary(theme) }}>
        {content.prefix}{content.value}{content.suffix}
      </div>
      {content.label && <div className="mt-1 text-sm font-medium text-slate-600">{content.label}</div>}
    </div>
  );
}

export function ProgressBarSection({ content, theme }: { content: ProgressBarContent; theme?: ThemeTokens }) {
  const pct = Math.max(0, Math.min(100, content.percent ?? 0));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{content.label}</span><span>{pct}%</span></div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: primary(theme) }} />
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
  if (!content.images.length) return <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add gallery images</div>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {content.images.map((im, i) => <img key={i} src={im.url} alt="" className="aspect-square w-full rounded-lg object-cover" />)}
    </div>
  );
}

export function LogosSection({ content }: { content: LogosContent; theme?: ThemeTokens }) {
  if (!content.images.length) return <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add logo images</div>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 opacity-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {content.images.map((im, i) => <img key={i} src={im.url} alt="" className="h-10 w-auto object-contain grayscale" />)}
    </div>
  );
}

export function SocialSection({ content }: { content: SocialContent; theme?: ThemeTokens }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {content.links.map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noreferrer"
          className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600 hover:bg-slate-200">
          {l.platform.slice(0, 2)}
        </a>
      ))}
    </div>
  );
}

export function SliderSection({ content }: { content: SliderContent; theme?: ThemeTokens }) {
  if (!content.images.length) return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add slider images</div>;
  return (
    <div className="flex snap-x gap-3 overflow-x-auto rounded-lg pb-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {content.images.map((im, i) => <img key={i} src={im.url} alt="" className="h-56 w-auto shrink-0 snap-center rounded-lg object-cover" />)}
    </div>
  );
}

export function CountdownSection({ content, theme }: { content: CountdownContent; theme?: ThemeTokens }) {
  return <Countdown target={content.target} label={content.label} color={primary(theme)} />;
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
