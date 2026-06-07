import { z } from "zod";

/**
 * Zod schemas for every website-builder section type.
 *
 * These are the single source of truth for section `content` shape. They are
 * aligned 1:1 with the existing discriminated union in
 * app/tenants/[tenantId]/website/types/section-types.ts so nothing breaks; the
 * inferred types below are structurally compatible with SectionContent.
 *
 * Used by:
 *  - the editor (schema-driven forms + validation)
 *  - the renderer registry (components/sections/registry.tsx)
 *  - the public site route (validate `content` before rendering)
 */

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const heroSchema = z.object({
  type: z.literal("hero"),
  heading: z.string(),
  subheading: z.string().optional(),
  primaryCta: linkSchema.optional(),
  secondaryCta: linkSchema.optional(),
  backgroundImageUrl: z.string().optional(),
});

export const featuresSchema = z.object({
  type: z.literal("features"),
  heading: z.string(),
  features: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })
  ),
});

export const testimonialsSchema = z.object({
  type: z.literal("testimonials"),
  heading: z.string().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      role: z.string().optional(),
      quote: z.string(),
      avatarUrl: z.string().optional(),
    })
  ),
  layout: z.enum(["grid", "carousel"]).optional(),
});

export const listingsSchema = z.object({
  type: z.literal("listings"),
  heading: z.string(),
  items: z.array(
    z.object({
      title: z.string(),
      price: z.string().optional(),
      location: z.string().optional(),
      imageUrl: z.string().optional(),
      href: z.string().optional(),
    })
  ),
});

export const contactFormSchema = z.object({
  type: z.literal("contact-form"),
  heading: z.string(),
  subheading: z.string().optional(),
  fields: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(["text", "email", "tel", "textarea"]),
    })
  ),
  submitLabel: z.string(),
  successMessage: z.string().optional(),
});

export const ctaSchema = z.object({
  type: z.literal("cta"),
  heading: z.string(),
  subheading: z.string().optional(),
  cta: linkSchema,
});

// ---- Simple element types (polished Quick Add: Text / Media / Layout) ----
const alignEnum = z.enum(["left", "center", "right"]);

const textTransformEnum = z.enum(["none", "uppercase", "capitalize", "lowercase"]);

export const headingSchema = z.object({
  type: z.literal("heading"),
  text: z.string(),
  level: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
  align: alignEnum.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.coerce.number().optional(),       // px
  fontWeight: z.string().optional(),            // 300..800 / normal / bold
  lineHeight: z.coerce.number().optional(),     // unitless
  letterSpacing: z.coerce.number().optional(),  // px
  color: z.string().optional(),                 // hex/rgb
  textTransform: textTransformEnum.optional(),
  italic: z.boolean().optional(),
  gradientText: z.boolean().optional(),
  gradientFrom: z.string().optional(),
  gradientTo: z.string().optional(),
  gradientAngle: z.coerce.number().optional(),
  bgColor: z.string().optional(),                       // text background highlight
  href: z.string().optional(),                          // optional link wrap
  target: z.enum(["_self", "_blank"]).optional(),
  rel: z.string().optional(),
});
// Sub-headline: a heading variant (distinct label, default h3 + lighter weight).
export const subheadingSchema = z.object({
  type: z.literal("subheading"),
  text: z.string(),
  level: z.enum(["h2", "h3", "h4", "h5", "h6"]).optional(),
  align: alignEnum.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.coerce.number().optional(),
  fontWeight: z.string().optional(),
  lineHeight: z.coerce.number().optional(),
  letterSpacing: z.coerce.number().optional(),
  color: z.string().optional(),
  textTransform: textTransformEnum.optional(),
  italic: z.boolean().optional(),
  bgColor: z.string().optional(),
  href: z.string().optional(),
  target: z.enum(["_self", "_blank"]).optional(),
  rel: z.string().optional(),
});
export const textSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  align: alignEnum.optional(),
  fontFamily: z.string().optional(),
  fontSize: z.coerce.number().optional(),       // px
  fontWeight: z.string().optional(),
  color: z.string().optional(),                 // hex/rgb
  lineHeight: z.coerce.number().optional(),
  textTransform: textTransformEnum.optional(),
  italic: z.boolean().optional(),
  direction: z.enum(["ltr", "rtl"]).optional(),
  bgColor: z.string().optional(),
  href: z.string().optional(),
  target: z.enum(["_self", "_blank"]).optional(),
  rel: z.string().optional(),
});
export const imageSchema = z.object({
  type: z.literal("image"),
  url: z.string(),
  alt: z.string().optional(),
  href: z.string().optional(),
  width: z.coerce.number().optional(),               // px max-width
  objectFit: z.enum(["cover", "contain"]).optional(),
  rounding: z.coerce.number().optional(),            // px radius
  align: alignEnum.optional(),
  lazy: z.boolean().optional(),                      // loading="lazy" (default true)
  lightbox: z.boolean().optional(),                  // click to open full size
});
export const buttonSchema = z.object({
  type: z.literal("button"),
  label: z.string(),
  href: z.string(),
  align: alignEnum.optional(),
  target: z.enum(["_self", "_blank"]).optional(),
  variant: z.enum(["solid", "outline", "ghost"]).optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  fullWidth: z.enum(["auto", "full"]).optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  radius: z.coerce.number().optional(),
  icon: z.string().optional(),                          // emoji/char shown next to the label
  iconPosition: z.enum(["left", "right"]).optional(),
  rel: z.string().optional(),                           // e.g. "nofollow noopener"
  fontFamily: z.string().optional(),
  fontWeight: z.string().optional(),
  italic: z.boolean().optional(),
});
export const dividerSchema = z.object({
  type: z.literal("divider"),
  thickness: z.coerce.number().optional(),   // px
  color: z.string().optional(),              // hex
  widthPct: z.coerce.number().optional(),    // 0-100, line width across the column
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
});
export const videoSchema = z.object({ type: z.literal("video"), url: z.string() });
export const spacerSchema = z.object({
  type: z.literal("spacer"),
  size: z.enum(["sm", "md", "lg"]).optional(),
});
export const htmlSchema = z.object({ type: z.literal("html"), code: z.string() });

// ---- Extended best-in-class elements (functional, no external paid keys) ----
export const bulletListSchema = z.object({ type: z.literal("bullet-list"), items: z.array(z.object({ text: z.string() })).default([]), bulletStyle: z.enum(["disc", "circle", "square", "none", "check", "arrow", "number"]).optional(), color: z.string().optional(), direction: z.enum(["ltr", "rtl"]).optional() });
export const numberCounterSchema = z.object({ type: z.literal("number-counter"), value: z.string(), label: z.string().optional(), prefix: z.string().optional(), suffix: z.string().optional() });
export const progressBarSchema = z.object({ type: z.literal("progress-bar"), label: z.string().optional(), percent: z.number().min(0).max(100).default(50) });
export const pricingSchema = z.object({ type: z.literal("pricing"), plans: z.array(z.object({ name: z.string(), price: z.string(), period: z.string().optional(), features: z.array(z.object({ text: z.string() })).default([]), ctaLabel: z.string().optional(), ctaHref: z.string().optional() })).default([]) });
export const faqSchema = z.object({ type: z.literal("faq"), items: z.array(z.object({ q: z.string(), a: z.string() })).default([]) });
export const gallerySchema = z.object({
  type: z.literal("gallery"),
  images: z.array(z.object({ url: z.string() })).default([]),
  columns: z.coerce.number().optional(),     // 2..6
  lightbox: z.boolean().optional(),          // click to open full-size
});
export const logosSchema = z.object({
  type: z.literal("logos"),
  images: z.array(z.object({ url: z.string() })).default([]),
  scroll: z.boolean().optional(),            // auto-scrolling marquee
  grayscale: z.boolean().optional(),         // default true
});
export const socialSchema = z.object({ type: z.literal("social"), links: z.array(z.object({ platform: z.string(), url: z.string() })).default([]) });
export const sliderSchema = z.object({
  type: z.literal("slider"),
  images: z.array(z.object({ url: z.string() })).default([]),
  autoplay: z.boolean().optional(),
  interval: z.coerce.number().optional(),   // seconds per slide
  arrows: z.boolean().optional(),
  dots: z.boolean().optional(),
  height: z.coerce.number().optional(),     // px
  fit: z.enum(["cover", "contain"]).optional(),
});
export const countdownSchema = z.object({ type: z.literal("countdown"), target: z.string(), label: z.string().optional() });
export const mapSchema = z.object({ type: z.literal("map"), query: z.string() });
export const qrSchema = z.object({ type: z.literal("qr"), data: z.string(), size: z.number().optional() });
// Icon / icon-box (GHL parity): an emoji or character, optionally with a heading + text below it.
export const iconSchema = z.object({
  type: z.literal("icon"),
  icon: z.string().default("★"),
  heading: z.string().optional(),
  text: z.string().optional(),
  size: z.coerce.number().optional(),   // px
  color: z.string().optional(),
  align: alignEnum.optional(),
});
// Audio player (GHL parity): a hosted/linked audio file with native controls.
export const audioSchema = z.object({
  type: z.literal("audio"),
  url: z.string().default(""),
  title: z.string().optional(),
});
// Tabs (GHL parity): tabbed content — click a tab to reveal its panel.
export const tabsSchema = z.object({
  type: z.literal("tabs"),
  tabs: z.array(z.object({ label: z.string(), content: z.string() })).default([]),
});
// Ticker / scrolling marquee (stock-ticker / news-ticker / announcement).
export const tickerSchema = z.object({
  type: z.literal("ticker"),
  items: z.array(z.object({ text: z.string() })).default([]),
  speed: z.coerce.number().optional(),
  bg: z.string().optional(),
  color: z.string().optional(),
  separator: z.string().optional(),
  direction: z.enum(["left", "right"]).optional(),
});

// Navigation menu element. Each top-level item may carry a submenu (children).
// Items + submenus are edited in the right panel (expandable rows); on the canvas,
// submenus render collapsed and reveal on hover.
const menuItemSchema = z.object({
  label: z.string(),
  href: z.string().default("#"),
  children: z.array(z.object({ label: z.string(), href: z.string().default("#") })).optional(),
});
export const menuSchema = z.object({
  type: z.literal("menu"),
  items: z.array(menuItemSchema).default([]),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  align: alignEnum.optional(),
  gap: z.coerce.number().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.coerce.number().optional(),
  fontWeight: z.string().optional(),
  color: z.string().optional(),
  activeColor: z.string().optional(),
  // Submenu (dropdown) formatting — separate from the top-level menu bar.
  submenuBg: z.string().optional(),       // dropdown panel background
  submenuColor: z.string().optional(),    // dropdown item text color
  submenuHoverBg: z.string().optional(),  // dropdown item hover background
  submenuRadius: z.coerce.number().optional(), // dropdown corner radius
});

// Row container: 1–6 columns, each column an ordered list of child elements.
// children[col] = element content objects (validated individually by the renderer,
// so we keep this loosely typed here to avoid recursive-schema fragility).
export const rowSchema = z.object({
  type: z.literal("row"),
  columns: z.coerce.number().int().min(1).max(6).default(1),
  widths: z.array(z.number()).optional(), // per-column fractional ratios, sum = 1
  gap: z.coerce.number().optional(),
  contentWidth: z.enum(["boxed", "full"]).optional(),   // center content at max-width vs full-bleed
  valign: z.enum(["top", "center", "bottom"]).optional(), // vertical alignment of columns
  minHeight: z.coerce.number().optional(),              // px
  // Responsive (Copilot-ratified): rows AUTO-STACK to 1 column under 768px by default.
  keepRowOnMobile: z.boolean().optional(),  // override: keep columns side-by-side on mobile
  reverseOnMobile: z.boolean().optional(),  // reverse column order when stacked on mobile
  children: z.array(z.array(z.any())).default([]),
  colStyles: z.array(z.record(z.string(), z.any())).optional(), // per-column ElementStyle (bg/padding/align/border)
  _style: z.record(z.string(), z.any()).optional(),             // row-as-container style
  _anim: z.record(z.string(), z.any()).optional(),
});

/** Discriminated union over `type` — validates any section's content. */
export const sectionSchema = z.discriminatedUnion("type", [
  heroSchema,
  featuresSchema,
  testimonialsSchema,
  listingsSchema,
  contactFormSchema,
  ctaSchema,
  headingSchema,
  subheadingSchema,
  textSchema,
  imageSchema,
  buttonSchema,
  dividerSchema,
  videoSchema,
  spacerSchema,
  htmlSchema,
  rowSchema,
  bulletListSchema,
  numberCounterSchema,
  progressBarSchema,
  pricingSchema,
  faqSchema,
  gallerySchema,
  logosSchema,
  socialSchema,
  sliderSchema,
  countdownSchema,
  mapSchema,
  qrSchema,
  menuSchema,
  iconSchema,
  audioSchema,
  tabsSchema,
  tickerSchema,
]);

// Inferred TypeScript types (structurally compatible with SectionContent)
export type HeroContent = z.infer<typeof heroSchema>;
export type FeaturesContent = z.infer<typeof featuresSchema>;
export type TestimonialsContent = z.infer<typeof testimonialsSchema>;
export type ListingsContent = z.infer<typeof listingsSchema>;
export type ContactFormContent = z.infer<typeof contactFormSchema>;
export type CtaContent = z.infer<typeof ctaSchema>;
export type HeadingContent = z.infer<typeof headingSchema>;
export type SubheadingContent = z.infer<typeof subheadingSchema>;
export type TextContent = z.infer<typeof textSchema>;
export type ImageContent = z.infer<typeof imageSchema>;
export type ButtonContent = z.infer<typeof buttonSchema>;
export type DividerContent = z.infer<typeof dividerSchema>;
export type VideoContent = z.infer<typeof videoSchema>;
export type SpacerContent = z.infer<typeof spacerSchema>;
export type HtmlContent = z.infer<typeof htmlSchema>;
export type RowContent = z.infer<typeof rowSchema>;
export type BulletListContent = z.infer<typeof bulletListSchema>;
export type NumberCounterContent = z.infer<typeof numberCounterSchema>;
export type ProgressBarContent = z.infer<typeof progressBarSchema>;
export type PricingContent = z.infer<typeof pricingSchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type GalleryContent = z.infer<typeof gallerySchema>;
export type LogosContent = z.infer<typeof logosSchema>;
export type SocialContent = z.infer<typeof socialSchema>;
export type SliderContent = z.infer<typeof sliderSchema>;
export type CountdownContent = z.infer<typeof countdownSchema>;
export type MapContent = z.infer<typeof mapSchema>;
export type QrContent = z.infer<typeof qrSchema>;
export type MenuContent = z.infer<typeof menuSchema>;
export type IconContent = z.infer<typeof iconSchema>;
export type AudioContent = z.infer<typeof audioSchema>;
export type TabsContent = z.infer<typeof tabsSchema>;
export type TickerContent = z.infer<typeof tickerSchema>;
export type SectionContent = z.infer<typeof sectionSchema>;

export type SectionType = SectionContent["type"];

/** Per-type schema lookup (for the editor / validation). */
export const sectionSchemas = {
  hero: heroSchema,
  features: featuresSchema,
  testimonials: testimonialsSchema,
  listings: listingsSchema,
  "contact-form": contactFormSchema,
  cta: ctaSchema,
  heading: headingSchema,
  subheading: subheadingSchema,
  text: textSchema,
  image: imageSchema,
  button: buttonSchema,
  divider: dividerSchema,
  video: videoSchema,
  spacer: spacerSchema,
  html: htmlSchema,
  row: rowSchema,
  "bullet-list": bulletListSchema,
  "number-counter": numberCounterSchema,
  "progress-bar": progressBarSchema,
  pricing: pricingSchema,
  faq: faqSchema,
  gallery: gallerySchema,
  logos: logosSchema,
  social: socialSchema,
  slider: sliderSchema,
  countdown: countdownSchema,
  map: mapSchema,
  qr: qrSchema,
  menu: menuSchema,
  icon: iconSchema,
  audio: audioSchema,
  tabs: tabsSchema,
  ticker: tickerSchema,
} as const;

/** Ordered list of section types (for the "add section" picker). */
export const sectionTypes: SectionType[] = [
  "hero",
  "features",
  "testimonials",
  "listings",
  "contact-form",
  "cta",
  "heading",
  "subheading",
  "text",
  "image",
  "button",
  "divider",
  "video",
  "spacer",
  "html",
  "row",
  "bullet-list",
  "number-counter",
  "progress-bar",
  "pricing",
  "faq",
  "gallery",
  "logos",
  "social",
  "slider",
  "countdown",
  "map",
  "qr",
  "menu",
  "icon",
  "audio",
  "tabs",
  "ticker",
];

/** Human-friendly labels for the editor UI. */
export const sectionLabels: Record<SectionType, string> = {
  hero: "Hero",
  features: "Features",
  testimonials: "Testimonials",
  listings: "Listings",
  "contact-form": "Contact Form",
  cta: "Call to Action",
  heading: "Heading",
  subheading: "Sub-Headline",
  text: "Text",
  image: "Image",
  button: "Button",
  divider: "Divider",
  video: "Video",
  spacer: "Spacer",
  html: "Custom HTML",
  row: "Row / Columns",
  "bullet-list": "Bullet List",
  "number-counter": "Number Counter",
  "progress-bar": "Progress Bar",
  pricing: "Pricing Table",
  faq: "FAQ",
  gallery: "Photo Gallery",
  logos: "Logo Showcase",
  social: "Social Icons",
  slider: "Image Slider",
  countdown: "Countdown",
  map: "Map",
  qr: "QR Code",
  menu: "Menu",
  icon: "Icon",
  audio: "Audio",
  tabs: "Tabs",
  ticker: "Ticker",
};

/** Sensible default content when a new section is added. */
export function defaultContentFor(type: SectionType): SectionContent {
  switch (type) {
    case "hero":
      return { type: "hero", heading: "New Hero Section", subheading: "" };
    case "features":
      return { type: "features", heading: "Features", features: [] };
    case "testimonials":
      return { type: "testimonials", heading: "Testimonials", items: [] };
    case "listings":
      return { type: "listings", heading: "Listings", items: [] };
    case "contact-form":
      return {
        type: "contact-form",
        heading: "Contact Us",
        subheading: "",
        fields: [
          { name: "name", label: "Name", type: "text" },
          { name: "email", label: "Email", type: "email" },
        ],
        submitLabel: "Submit",
      };
    case "cta":
      return {
        type: "cta",
        heading: "Call to Action",
        subheading: "",
        cta: { label: "Click Here", href: "#" },
      };
    case "heading":
      return { type: "heading", text: "Your headline here", level: "h2", align: "left" };
    case "subheading":
      return { type: "subheading", text: "Your sub-headline here", level: "h3", align: "left", fontWeight: "500" };
    case "text":
      return { type: "text", text: "Add your paragraph text here. Click to edit.", align: "left" };
    case "image":
      return { type: "image", url: "", alt: "" };
    case "button":
      return { type: "button", label: "Click Here", href: "#", align: "left" };
    case "divider":
      return { type: "divider" };
    case "video":
      return { type: "video", url: "" };
    case "spacer":
      return { type: "spacer", size: "md" };
    case "html":
      return { type: "html", code: "<!-- Your custom HTML -->" };
    case "row":
      return makeRow(1);
    case "bullet-list":
      return { type: "bullet-list", items: [{ text: "First point" }, { text: "Second point" }, { text: "Third point" }] };
    case "number-counter":
      return { type: "number-counter", value: "100", suffix: "+", label: "Happy Clients" };
    case "progress-bar":
      return { type: "progress-bar", label: "Progress", percent: 75 };
    case "pricing":
      return { type: "pricing", plans: [
        { name: "Starter", price: "$29", period: "/mo", features: [{ text: "Feature one" }, { text: "Feature two" }], ctaLabel: "Choose", ctaHref: "#" },
        { name: "Pro", price: "$79", period: "/mo", features: [{ text: "Everything in Starter" }, { text: "Feature three" }, { text: "Feature four" }], ctaLabel: "Choose", ctaHref: "#" },
      ] };
    case "faq":
      return { type: "faq", items: [{ q: "Your first question?", a: "The answer goes here." }, { q: "Another question?", a: "Another answer." }] };
    case "gallery":
      return { type: "gallery", images: [] };
    case "logos":
      return { type: "logos", images: [] };
    case "social":
      return { type: "social", links: [{ platform: "facebook", url: "#" }, { platform: "instagram", url: "#" }, { platform: "linkedin", url: "#" }] };
    case "slider":
      return { type: "slider", images: [] };
    case "countdown":
      return { type: "countdown", target: "2026-12-31T00:00:00Z", label: "Offer ends in" };
    case "map":
      return { type: "map", query: "Richmond Hill, Ontario" };
    case "qr":
      return { type: "qr", data: "https://aibizconnect.app", size: 160 };
    case "menu":
      return { type: "menu", orientation: "horizontal", align: "left", items: [
        { label: "Home", href: "/" },
        { label: "Pricing", href: "/pricing" },
      ] };
    case "icon":
      return { type: "icon", icon: "★", heading: "Feature", text: "Describe this feature.", size: 40, align: "center" };
    case "audio":
      return { type: "audio", url: "", title: "Audio" };
    case "tabs":
      return { type: "tabs", tabs: [
        { label: "Tab 1", content: "Content for the first tab." },
        { label: "Tab 2", content: "Content for the second tab." },
      ] };
    case "ticker":
      return { type: "ticker", direction: "left", speed: 30, bg: "#0f172a", color: "#e2e8f0", separator: "•", items: [
        { text: "Welcome to our store" }, { text: "Free shipping over $50" }, { text: "New arrivals weekly" },
      ] };
  }
}

/** Build a Row with N empty columns. */
export function makeRow(columns: number): RowContent {
  const n = Math.max(1, Math.min(6, columns));
  return {
    type: "row",
    columns: n,
    widths: Array.from({ length: n }, () => 1 / n), // equal fractional ratios, sum = 1
    children: Array.from({ length: n }, () => [] as unknown[]),
  };
}

/** Brand settings passed to section components for theming. */
export interface BrandSettings {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  logoUrl?: string;
}
