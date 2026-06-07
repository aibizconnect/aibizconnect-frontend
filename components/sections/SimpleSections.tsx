import type { CSSProperties, ElementType } from "react";
import { fontStack } from "@/lib/fonts";
import { roleForElement, roleStyleFor, type RoleStyle, type ThemeTokens } from "@/lib/sections/theme";
import InlineText from "./InlineText";
import type {
  HeadingContent, SubheadingContent, TextContent, ImageContent, ButtonContent,
  DividerContent, VideoContent, SpacerContent, HtmlContent,
} from "@/lib/sections/schemas";

/** Lightweight element renderers for the GHL-style Quick Add primitives
 * (Heading / Sub-Headline / Text / Image / Button / Divider / Video / Spacer / Custom HTML).
 * Each honors its General typography props; the universal _style wrapper is applied
 * one level up in SectionView. */

const alignClass = (a?: string) => a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

/** Cascade: element value wins; otherwise inherit the global Typography role. */
/**
 * Fluid type (Copilot-ratified platform baseline): large sizes scale DOWN on narrow
 * viewports via clamp() so desktop headings never overflow phones — yet never shrink
 * below ~66% and never exceed the set size. Maps min@360px → max@1200px. Applied only
 * to numeric px sizes ≥ 22 (headings/large text); small UI text is left untouched.
 */
function fluidFontSize(size: number): string | number {
  if (!(typeof size === "number") || size < 22) return size;
  const min = Math.round(size * 0.66);
  const span = size - min;
  const slope = (span * 100) / 840;           // vw units across 360→1200px
  const intercept = min - (span * 360) / 840; // px
  return `clamp(${min}px, calc(${intercept.toFixed(1)}px + ${slope.toFixed(3)}vw), ${size}px)`;
}

function typographyStyle(c: any, fallbackColor?: string, role: RoleStyle = {}): CSSProperties {
  const fam = c.fontFamily || role.fontFamily;
  const size = c.fontSize ?? role.fontSize;
  const weight = c.fontWeight || role.fontWeight;
  const lh = c.lineHeight ?? role.lineHeight;
  const ls = c.letterSpacing ?? role.letterSpacing;
  const tt = c.textTransform ?? role.textTransform;
  const italic = c.italic ?? role.italic;
  // Color scheme: element value wins, then the role's color, then the fallback.
  const st: CSSProperties = { color: c.color || role.color || fallbackColor };
  const bgc = c.backgroundColor || role.backgroundColor;
  if (bgc) st.backgroundColor = bgc;
  if (fam) st.fontFamily = fontStack(fam);
  if (size) st.fontSize = typeof size === "number" ? fluidFontSize(size) : size;
  if (weight) st.fontWeight = weight as CSSProperties["fontWeight"];
  if (lh) st.lineHeight = lh;
  if (ls != null) st.letterSpacing = ls;
  if (tt && tt !== "none") st.textTransform = tt as CSSProperties["textTransform"];
  if (italic) st.fontStyle = "italic";
  return st;
}

function HeadingLike({ content, theme, defaultSizeClass, defaultBold, onEditText }: { content: any; theme?: ThemeTokens; defaultSizeClass: string; defaultBold: string; onEditText?: (t: string) => void }) {
  const Tag = (content.level || "h2") as ElementType;
  // Role (global Typography) provides defaults; element values override per-property.
  // An explicit _role (chosen on the right column) wins over the type/level default.
  const roleKey = (content as any)._role || roleForElement(content.type, content.level);
  const role = roleStyleFor(theme, roleKey);
  const sizeClass = (content.fontSize ?? role.fontSize) ? "" : defaultSizeClass;
  const weightClass = (content.fontWeight || role.fontWeight) ? "" : defaultBold;
  const st = typographyStyle(content, theme?.colors.text, role);
  // Gradient text (background-clip: text).
  if (content.gradientText) {
    const from = content.gradientFrom || theme?.colors.accent || "#2563eb";
    const to = content.gradientTo || theme?.colors.primary || "#0f172a";
    const ang = content.gradientAngle ?? 90;
    st.backgroundImage = `linear-gradient(${ang}deg, ${from}, ${to})`;
    (st as any).WebkitBackgroundClip = "text";
    st.backgroundClip = "text";
    st.color = "transparent";
    (st as any).WebkitTextFillColor = "transparent";
  }
  if (content.bgColor) { st.backgroundColor = content.bgColor; st.padding = st.padding ?? "0.15em 0.4em"; st.borderRadius = st.borderRadius ?? 6; }
  const cls = `${sizeClass} ${weightClass} ${alignClass(content.align)}`;
  if (onEditText) {
    return <InlineText as={Tag} className={cls} style={st} text={content.text} onChange={onEditText} />;
  }
  const el = (
    <Tag className={cls} style={st}>
      {content.text}
    </Tag>
  );
  // Optional link wrap (set via the floating text popup). Editing path above is never wrapped.
  return content.href
    ? <a href={content.href} target={content.target || "_self"} rel={content.rel || (content.target === "_blank" ? "noopener noreferrer" : undefined)} className="hover:underline">{el}</a>
    : el;
}

export function HeadingSection({ content, theme, onEditText }: { content: HeadingContent; theme?: ThemeTokens; onEditText?: (t: string) => void }) {
  const def = content.level === "h1" ? "text-4xl md:text-5xl" : content.level === "h3" ? "text-xl md:text-2xl" : "text-2xl md:text-3xl";
  return <HeadingLike content={content} theme={theme} defaultSizeClass={def} defaultBold="font-bold" onEditText={onEditText} />;
}

export function SubheadingSection({ content, theme, onEditText }: { content: SubheadingContent; theme?: ThemeTokens; onEditText?: (t: string) => void }) {
  const def = content.level === "h2" ? "text-xl md:text-2xl" : "text-lg md:text-xl";
  return <HeadingLike content={content} theme={theme} defaultSizeClass={def} defaultBold="font-medium" onEditText={onEditText} />;
}

export function TextSection({ content, theme, onEditText }: { content: TextContent; theme?: ThemeTokens; onEditText?: (t: string) => void }) {
  const role = roleStyleFor(theme, (content as any)._role || "body");
  const st = typographyStyle(content, theme?.colors.text, role);
  if ((content as any).direction === "rtl") st.direction = "rtl";
  if ((content as any).bgColor) { st.backgroundColor = (content as any).bgColor; st.padding = st.padding ?? "0.2em 0.5em"; st.borderRadius = st.borderRadius ?? 6; }
  const cls = `whitespace-pre-wrap leading-relaxed ${alignClass(content.align)}`;
  if (onEditText) {
    return <InlineText as="p" multiline className={cls} style={st} text={content.text} onChange={onEditText} />;
  }
  const el = (
    <p className={cls} style={st}>
      {content.text}
    </p>
  );
  return (content as any).href
    ? <a href={(content as any).href} target={(content as any).target || "_self"} rel={(content as any).rel || ((content as any).target === "_blank" ? "noopener noreferrer" : undefined)} className="hover:underline">{el}</a>
    : el;
}

export function ImageSection({ content }: { content: ImageContent; theme?: ThemeTokens }) {
  if (!content.url) {
    return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">Add an image URL</div>;
  }
  const wrapAlign = content.align === "center" ? "justify-center" : content.align === "right" ? "justify-end" : "justify-start";
  const imgStyle: CSSProperties = {
    maxWidth: content.width ? `${content.width}px` : "100%",
    objectFit: content.objectFit as CSSProperties["objectFit"],
    borderRadius: content.rounding != null ? content.rounding : 8,
  };
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={content.url} alt={content.alt || ""} loading={content.lazy === false ? "eager" : "lazy"} style={imgStyle} className="h-auto w-full" />;
  const link = content.href || (content.lightbox ? content.url : undefined);
  return <div className={`flex ${wrapAlign}`}>{link ? <a href={link} target={content.lightbox && !content.href ? "_blank" : undefined} rel={content.lightbox && !content.href ? "noopener noreferrer" : undefined} className="block" style={{ maxWidth: imgStyle.maxWidth }}>{img}</a> : <div style={{ maxWidth: imgStyle.maxWidth, width: "100%" }}>{img}</div>}</div>;
}

const BTN_SIZE: Record<string, string> = { sm: "px-4 py-2 text-sm", md: "px-6 py-3", lg: "px-8 py-4 text-lg" };

export function ButtonSection({ content, theme, onEditText }: { content: ButtonContent; theme?: ThemeTokens; onEditText?: (t: string) => void }) {
  const role = roleStyleFor(theme, (content as any)._role || "button");
  // Color cascade (Copilot ruling): element value > Button role > theme default.
  const primary = content.bgColor || role.backgroundColor || theme?.colors.primary || "#1e3a8a";
  const txt = content.textColor || role.color;
  const variant = content.variant || "solid";
  const sizeClass = BTN_SIZE[content.size || "md"];
  const radius = content.radius != null ? content.radius : 8;
  const base: CSSProperties = { borderRadius: radius };
  const fam = content.fontFamily || role.fontFamily;
  if (fam) base.fontFamily = fontStack(fam);
  const bWeight = (content as any).fontWeight || role.fontWeight;
  if (bWeight) base.fontWeight = bWeight as CSSProperties["fontWeight"];
  if (((content as any).italic ?? role.italic)) base.fontStyle = "italic";
  let cls = "font-semibold transition";
  if (variant === "solid") { base.backgroundColor = primary; base.color = txt || "#ffffff"; }
  else if (variant === "outline") { base.border = `2px solid ${primary}`; base.color = txt || primary; base.background = "transparent"; }
  else { base.color = txt || primary; base.background = "transparent"; }
  const full = content.fullWidth === "full";
  const rel = content.rel || (content.target === "_blank" ? "noopener noreferrer" : undefined);
  const icon = content.icon ? <span aria-hidden>{content.icon}</span> : null;
  const left = content.iconPosition !== "right";
  return (
    <div className={alignClass(content.align)}>
      <a href={onEditText ? undefined : content.href} target={content.target || "_self"} rel={rel}
        className={`${full ? "flex w-full justify-center" : "inline-flex"} items-center gap-2 ${sizeClass} ${cls}`} style={base}>
        {icon && left && icon}
        {onEditText ? <InlineText as="span" text={content.label} onChange={onEditText} /> : content.label}
        {icon && !left && icon}
      </a>
    </div>
  );
}

export function DividerSection({ content }: { content: DividerContent; theme?: ThemeTokens }) {
  const c = content as DividerContent;
  return (
    <div className="my-2 flex justify-center">
      <hr
        style={{
          width: `${c.widthPct ?? 100}%`,
          borderTopWidth: c.thickness ?? 1,
          borderTopStyle: (c.style ?? "solid") as "solid" | "dashed" | "dotted",
          borderTopColor: c.color || "#e2e8f0",
        }}
      />
    </div>
  );
}

export function VideoSection({ content }: { content: VideoContent; theme?: ThemeTokens }) {
  if (!content.url) {
    return <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">Add a video URL</div>;
  }
  const yt = content.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${yt[1]}`} title="Video" allowFullScreen />
      </div>
    );
  }
  return <video src={content.url} controls className="w-full rounded-lg" />;
}

export function SpacerSection({ content }: { content: SpacerContent; theme?: ThemeTokens }) {
  const h = content.size === "sm" ? "h-6" : content.size === "lg" ? "h-24" : "h-12";
  return <div className={h} aria-hidden />;
}

export function HtmlSection({ content }: { content: HtmlContent; theme?: ThemeTokens }) {
  return <div dangerouslySetInnerHTML={{ __html: content.code }} />;
}
