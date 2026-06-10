import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import TestimonialsSection from "./TestimonialsSection";
import ListingsSection from "./ListingsSection";
import ContactFormSection from "./ContactFormSection";
import CtaSection from "./CtaSection";
import {
  HeadingSection, SubheadingSection, TextSection, ImageSection, ButtonSection,
  DividerSection, VideoSection, SpacerSection, HtmlSection,
} from "./SimpleSections";
import {
  BulletListSection, NumberCounterSection, ProgressBarSection, PricingSection,
  FaqSection, GallerySection, LogosSection, SocialSection, SliderSection,
  CountdownSection, MapSection, QrSection, IconSection, AudioSection, TabsSection, TickerSection, SurveySection, BookingSection,
} from "./MoreSections";
import { MenuSection } from "./MenuSection";
import HeaderResponsive, { type HeaderNavItem } from "./HeaderResponsive";
import { sectionSchema } from "@/lib/sections/schemas";
import { applyPatches } from "@/lib/sites/lossless-importer";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";
import { styleToCss, animClasses, resolveStyle, responsiveCss, bgLayerCss, bgFadeOverlayCss, hasBgLayer, type Breakpoint, type ElementStyle } from "@/lib/design/element-style";

/** Wrap rendered content in a box that has a separate background-image layer (so a
 *  blur/parallax/fade on the background never affects the content itself). Falls back
 *  to a plain styled div when the style has no background image. */
function BgBox({ style, className, inlineStyle, children }: {
  style: ElementStyle | undefined; className?: string; inlineStyle: React.CSSProperties; children: React.ReactNode;
}) {
  if (!hasBgLayer(style)) {
    return <div style={inlineStyle} className={className}>{children}</div>;
  }
  const layer = bgLayerCss(style);
  const overlay = bgFadeOverlayCss(style);
  return (
    <div style={{ ...inlineStyle, position: (inlineStyle.position as any) ?? "relative" }} className={className}>
      {layer && <div aria-hidden style={layer} />}
      {overlay && <div aria-hidden style={overlay} />}
      <div style={{ position: "relative", zIndex: 1, borderRadius: "inherit" }}>{children}</div>
    </div>
  );
}

/** Public-route CSS sink: hands out unique element ids (each element self-emits its
 * own scoped <style> with media queries — SSR-safe, no render-order dependency). */
export interface CssSink { nextId: () => number; }

/**
 * Single rendering entry point shared by the editor canvas, the preview route,
 * and the public site route. Validates raw `content` against the Zod union and
 * renders the matching component with the tenant's theme tokens.
 */
export function SectionView({
  content,
  theme = DEFAULT_THEME,
  onEditText,
  onEditItems,
  bp = "desktop",
  cssSink,
}: {
  content: unknown;
  theme?: ThemeTokens;
  /** Editor-only: enables in-place text editing for leaf text elements. */
  onEditText?: (text: string) => void;
  /** Editor-only: in-place editing of list items (bullet list). */
  onEditItems?: (items: { text: string }[]) => void;
  /** Active breakpoint for editor/preview rendering (resolveStyle). Default desktop. */
  bp?: Breakpoint;
  /** Public route: when set, render desktop base + collect media-query CSS instead. */
  cssSink?: CssSink;
}) {
  const parsed = sectionSchema.safeParse(content);

  if (!parsed.success) {
    return (
      <div className="border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Invalid section content — not rendered.
      </div>
    );
  }

  // Zod strips unknown keys on parse, which would drop presentational meta the
  // renderers rely on (e.g. _role for the global Typography cascade). Re-attach
  // every "_"-prefixed key from the original content so overrides take effect.
  const c: any = parsed.data;
  if (content && typeof content === "object") {
    for (const k of Object.keys(content as any)) {
      if (k.startsWith("_")) c[k] = (content as any)[k];
    }
  }
  const inner = renderInner(c, theme, onEditText, onEditItems, bp, cssSink);
  // Presentational meta (Styles + Animations + Responsive). Only wrap when set.
  const style = (content as any)?._style;
  const anim = (content as any)?._anim;
  const responsive = (content as any)?._responsive;

  // PUBLIC mode: render the desktop base inline + a scoped <style> with media queries.
  if (cssSink && responsive) {
    const cls = `el-${cssSink.nextId()}`;
    const css = responsiveCss(`.${cls}`, style, responsive);
    return (
      <>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        <BgBox style={style} className={`${cls} ${animClasses(anim)}`.trim()} inlineStyle={styleToCss(style, { bgAsLayer: hasBgLayer(style) })}>{inner}</BgBox>
      </>
    );
  }

  if (!style && !anim && !responsive) return inner;

  // EDITOR/PREVIEW mode: render the resolved style for the active breakpoint; a
  // per-breakpoint `hidden` removes the element at that breakpoint.
  const resolved = resolveStyle(style, responsive, bp) as ElementStyle;
  if (bp !== "desktop" && (resolved as any).hidden) return null;
  return (
    <BgBox style={resolved} className={animClasses(anim)} inlineStyle={styleToCss(resolved, { bgAsLayer: hasBgLayer(resolved) })}>
      {inner}
    </BgBox>
  );
}

function renderInner(c: any, theme: ThemeTokens, onEditText?: (text: string) => void, onEditItems?: (items: { text: string }[]) => void, bp: Breakpoint = "desktop", cssSink?: CssSink) {
  switch (c.type) {
    case "hero":
      return <HeroSection content={c} theme={theme} />;
    case "features":
      return <FeaturesSection content={c} theme={theme} />;
    case "testimonials":
      return <TestimonialsSection content={c} theme={theme} />;
    case "listings":
      return <ListingsSection content={c} theme={theme} />;
    case "contact-form":
      return <ContactFormSection content={c} theme={theme} />;
    case "cta":
      return <CtaSection content={c} theme={theme} />;
    case "heading":
      return <HeadingSection content={c} theme={theme} onEditText={onEditText} />;
    case "subheading":
      return <SubheadingSection content={c} theme={theme} onEditText={onEditText} />;
    case "text":
      return <TextSection content={c} theme={theme} onEditText={onEditText} />;
    case "image":
      return <ImageSection content={c} theme={theme} />;
    case "button":
      return <ButtonSection content={c} theme={theme} onEditText={onEditText} />;
    case "divider":
      return <DividerSection content={c} theme={theme} />;
    case "video":
      return <VideoSection content={c} theme={theme} />;
    case "spacer":
      return <SpacerSection content={c} theme={theme} />;
    case "html":
      return <HtmlSection content={c} theme={theme} />;
    // LOSSLESS import (D-178): the band's REAL imported HTML, verbatim, with node patches applied
    // over the immutable original. Fidelity by construction — no translation into native blocks.
    case "imported-html": {
      const html = Array.isArray(c.patches) && c.patches.length ? applyPatches(c.html || "", c.patches) : (c.html || "");
      return <div data-imported-band dangerouslySetInnerHTML={{ __html: html }} />;
    }
    // Companion carrier: the page's compiled-CSS snapshot (D-180) + font stylesheet preloads.
    case "imported-css":
      return (
        <>
          {Array.isArray(c.fontHrefs) && c.fontHrefs.map((h: string, i: number) => (
            <link key={i} rel="stylesheet" href={h} />
          ))}
          <style dangerouslySetInnerHTML={{ __html: c.css || "" }} />
        </>
      );
    case "row": {
      const baseCols = Math.max(1, Math.min(12, c.columns || 1));
      // Mobile stacking is ON BY DEFAULT (Copilot-ratified platform baseline). A tenant
      // opts OUT per row via keepRowOnMobile. Legacy explicit stackOnMobile still honored.
      const explicitStack = c._responsive?.mobile?.stackOnMobile ?? c._style?.stackOnMobile;
      const stack = c.keepRowOnMobile === true ? false : (explicitStack ?? true);
      const reverse = c.reverseOnMobile === true;
      // EDITOR/PREVIEW: when previewing mobile and stacking, collapse to a single track
      // but STILL render every column (vertical stack) — never drop columns.
      const stackedNow = bp === "mobile" && stack;
      // TABLET cap (Ali's ruling): never show more than ~2–3 columns at once on tablet —
      // extra columns WRAP to the next row. 1-2 cols unchanged; 4 → 2×2; 3/5/6 → 3 per row.
      const tabletCols = baseCols <= 2 ? baseCols : baseCols === 4 ? 2 : 3;
      const wrapTablet = bp === "tablet" && tabletCols < baseCols;
      const colStyles = Array.isArray(c.colStyles) ? c.colStyles : [];
      const ws: number[] = Array.isArray(c.widths) && c.widths.length === baseCols ? c.widths : Array.from({ length: baseCols }, () => 1 / baseCols);
      // Per-column track: fixed px when set, else a flexible fr share. Single 1fr when
      // stacked (mobile); a fixed N-up grid when wrapping on tablet.
      const tmpl = stackedNow ? "1fr"
        : wrapTablet ? `repeat(${tabletCols}, minmax(0, 1fr))`
        : Array.from({ length: baseCols }, (_, i) => {
            const px = (colStyles[i] as any)?.widthPx;
            return px != null ? `${px}px` : `${ws[i] ?? 1 / baseCols}fr`;
          }).join(" ");
      const gap = typeof c.gap === "number" ? c.gap : 16;
      // Rule #5 — container gaps shrink on mobile (never disturbs the elements themselves).
      const mobileGap = Math.min(gap, 12);
      const valignMap: Record<string, string> = { top: "start", center: "center", bottom: "end" };
      const gridStyle: any = { gridTemplateColumns: tmpl, gap: stackedNow ? mobileGap : gap };
      if (c.valign) gridStyle.alignItems = valignMap[c.valign];
      if (c.minHeight) gridStyle.minHeight = c.minHeight;
      // Editor mobile reverse: flip DOM order when stacked + reverse requested.
      const order = Array.from({ length: baseCols }, (_, i) => i);
      if (stackedNow && reverse) order.reverse();
      // PUBLIC route: emit one scoped media query so the grid stacks (and optionally
      // reverses) under 768px without depending on the bp prop.
      let stackCls = "";
      let stackStyle: React.ReactNode = null;
      const needTablet = tabletCols < baseCols;
      if (cssSink && (stack || needTablet)) {
        stackCls = `row-${cssSink.nextId()}`;
        let css = "";
        // Tablet (769–1024px): cap to 2–3 columns; extras wrap to the next row.
        if (needTablet) css += `@media (min-width:769px) and (max-width:1024px){.${stackCls}{grid-template-columns:repeat(${tabletCols}, minmax(0,1fr)) !important;}}`;
        // Mobile (≤768px): fully stack (and optionally reverse) + shrink the gap.
        if (stack) {
          const body = reverse
            ? "display:flex !important;flex-direction:column-reverse !important;"
            : "grid-template-columns:1fr !important;";
          css += `@media (max-width:768px){.${stackCls}{${body}gap:${mobileGap}px !important;}}`;
        }
        stackStyle = <style key="s" dangerouslySetInnerHTML={{ __html: css }} />;
      }
      const grid = (
        <>
          {stackStyle}
          <div className={`grid ${stackCls}`.trim()} style={gridStyle}>
            {order.map((ci) => {
              const children = Array.isArray(c.children?.[ci]) ? c.children[ci] : [];
              const cs = colStyles[ci] as (ElementStyle | undefined);
              // Per-column hide-on-breakpoint. Editor/preview: drop at the active bp.
              if (bp === "desktop" && cs?.hiddenDesktop) return null;
              if (bp === "tablet" && cs?.hiddenTablet) return null;
              if (bp === "mobile" && cs?.hiddenMobile) return null;
              const layered = hasBgLayer(cs);
              const layer = bgLayerCss(cs);
              const overlay = bgFadeOverlayCss(cs);
              const inner = children.map((child: unknown, idx: number) => <SectionView key={idx} content={child} theme={theme} bp={bp} cssSink={cssSink} />);
              const colContentStyle: any = {};
              if (cs?.valign) colContentStyle.justifyContent = cs.valign === "center" ? "center" : cs.valign === "end" ? "flex-end" : "flex-start";
              if (cs?.itemsAlign) colContentStyle.alignItems = cs.itemsAlign === "center" ? "center" : cs.itemsAlign === "end" ? "flex-end" : cs.itemsAlign === "stretch" ? "stretch" : "flex-start";
              // PUBLIC route: emit hide-on-breakpoint media queries for this column.
              let colCls = "";
              let colHideStyle: React.ReactNode = null;
              if (cssSink && (cs?.hiddenDesktop || cs?.hiddenTablet || cs?.hiddenMobile)) {
                colCls = `col-${cssSink.nextId()}`;
                let q = "";
                if (cs?.hiddenMobile) q += `@media (max-width:768px){.${colCls}{display:none !important;}}`;
                if (cs?.hiddenTablet) q += `@media (min-width:769px) and (max-width:1024px){.${colCls}{display:none !important;}}`;
                if (cs?.hiddenDesktop) q += `@media (min-width:1025px){.${colCls}{display:none !important;}}`;
                colHideStyle = <style key="ch" dangerouslySetInnerHTML={{ __html: q }} />;
              }
              return (
                <div key={ci} className={`relative flex min-w-0 flex-col ${colCls}`.trim()} style={styleToCss(cs, { bgAsLayer: layered })}>
                  {colHideStyle}
                  {layer && <div aria-hidden style={layer} />}
                  {overlay && <div aria-hidden style={overlay} />}
                  <div className="relative z-[1] flex min-w-0 flex-1 flex-col" style={colContentStyle}>{inner}</div>
                </div>
              );
            })}
          </div>
        </>
      );
      // Boxed → center content at max-width (background/padding stay full-bleed via the _style wrapper).
      // Section width tiers (Ali): full = edge-to-edge; wide/boxed = 1200px; medium = 960px;
      // small = 720px. Boxed is the legacy name for wide.
      const TIER_MAXW: Record<string, string> = { boxed: "var(--abc-maxw, 1200px)", wide: "var(--abc-maxw, 1200px)", medium: "960px", small: "720px" };
      const maxW = TIER_MAXW[c.contentWidth as string];
      const boxed = maxW
        ? <div style={{ maxWidth: maxW, marginLeft: "auto", marginRight: "auto" }}>{grid}</div>
        : grid;

      // HEADER special-case (Ali's ruling): a row that contains a menu is a header. On
      // mobile/tablet it stays a BAR — logo left, ☰ right — and the nav links + any CTA
      // buttons (e.g. "Sign in") move INSIDE the hamburger panel. Desktop is untouched.
      const childCols: any[][] = Array.isArray(c.children) ? c.children : [];
      const menuColIdx = childCols.findIndex((col) => Array.isArray(col) && col.some((ch) => ch?.type === "menu"));
      if (menuColIdx >= 0) {
        const menuEl = childCols[menuColIdx].find((ch) => ch?.type === "menu") as any;
        const navItems: HeaderNavItem[] = Array.isArray(menuEl?.items) ? menuEl.items : [];
        const logoNodes: React.ReactNode[] = [];
        const ctaNodes: React.ReactNode[] = [];
        childCols.forEach((col, ci) => {
          if (ci === menuColIdx) return;
          (col || []).forEach((ch: unknown, idx: number) => {
            const node = <SectionView key={`${ci}-${idx}`} content={ch} theme={theme} bp={bp} cssSink={cssSink} />;
            (ci < menuColIdx ? logoNodes : ctaNodes).push(node);
          });
        });
        return (
          <HeaderResponsive
            desktop={boxed}
            logo={logoNodes}
            cta={ctaNodes.length ? ctaNodes : null}
            navItems={navItems}
            theme={theme}
            bp={bp}
            cssMode={!!cssSink}
            uid={cssSink ? cssSink.nextId() : 0}
          />
        );
      }
      return boxed;
    }
    case "bullet-list":
      return <BulletListSection content={c} theme={theme} onEditItems={onEditItems} />;
    case "number-counter":
      return <NumberCounterSection content={c} theme={theme} />;
    case "progress-bar":
      return <ProgressBarSection content={c} theme={theme} />;
    case "pricing":
      return <PricingSection content={c} theme={theme} />;
    case "faq":
      return <FaqSection content={c} theme={theme} />;
    case "gallery":
      return <GallerySection content={c} theme={theme} />;
    case "logos":
      return <LogosSection content={c} theme={theme} />;
    case "social":
      return <SocialSection content={c} theme={theme} />;
    case "slider":
      return <SliderSection content={c} theme={theme} />;
    case "countdown":
      return <CountdownSection content={c} theme={theme} />;
    case "map":
      return <MapSection content={c} theme={theme} />;
    case "qr":
      return <QrSection content={c} theme={theme} />;
    case "icon":
      return <IconSection content={c} theme={theme} />;
    case "audio":
      return <AudioSection content={c} theme={theme} />;
    case "tabs":
      return <TabsSection content={c} theme={theme} />;
    case "ticker":
      return <TickerSection content={c} theme={theme} />;
    case "survey":
      return <SurveySection content={c} theme={theme} />;
    case "booking":
      return <BookingSection content={c} theme={theme} />;
    case "menu":
      return <MenuSection content={c} theme={theme} bp={bp} />;
    default:
      return null;
  }
}
