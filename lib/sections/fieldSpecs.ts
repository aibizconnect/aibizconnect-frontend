import type { SectionType } from "./schemas";

/**
 * Declarative field descriptors for the schema-driven editor.
 *
 * These mirror the Zod schemas in schemas.ts field-for-field and live next to
 * them so they stay in sync. The editor renders forms from these specs and
 * validates the result with the actual Zod schema (sectionSchemas[type]) on
 * every change — so validation is genuinely schema-driven, while form layout
 * is explicit (avoids brittle runtime reflection of Zod internals).
 */
export type FieldSpec =
  | { kind: "text"; key: string; label: string; multiline?: boolean }
  | { kind: "select"; key: string; label: string; options: string[] }
  | { kind: "color"; key: string; label: string }
  | { kind: "boolean"; key: string; label: string }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; step?: number; unit?: string }
  | { kind: "object"; key: string; label: string; fields: FieldSpec[] }
  | {
      kind: "array";
      key: string;
      label: string;
      itemLabel: string;
      itemFields: FieldSpec[];
    };

const linkFields: FieldSpec[] = [
  { kind: "text", key: "label", label: "Label" },
  { kind: "text", key: "href", label: "Link (href)" },
];

// Font family choices (empty = inherit the brand/theme font).
export const FONT_OPTIONS = [
  "", "Inter", "Roboto", "Montserrat", "Poppins", "Lato", "Open Sans", "Nunito",
  "Playfair Display", "Merriweather", "Georgia", "Times New Roman", "Arial", "system-ui",
];
const fontField = (key: string): FieldSpec => ({ kind: "select", key, label: "Font family", options: FONT_OPTIONS });
const alignField = (key = "align"): FieldSpec => ({ kind: "select", key, label: "Align", options: ["left", "center", "right"] });

export const sectionFieldSpecs: Record<SectionType, FieldSpec[]> = {
  hero: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "subheading", label: "Subheading", multiline: true },
    { kind: "object", key: "primaryCta", label: "Primary CTA", fields: linkFields },
    {
      kind: "object",
      key: "secondaryCta",
      label: "Secondary CTA",
      fields: linkFields,
    },
    { kind: "text", key: "backgroundImageUrl", label: "Background Image URL" },
  ],
  features: [
    { kind: "text", key: "heading", label: "Heading" },
    {
      kind: "array",
      key: "features",
      label: "Features",
      itemLabel: "Feature",
      itemFields: [
        { kind: "text", key: "title", label: "Title" },
        { kind: "text", key: "description", label: "Description", multiline: true },
        { kind: "text", key: "icon", label: "Icon (optional)" },
      ],
    },
  ],
  testimonials: [
    { kind: "text", key: "heading", label: "Heading" },
    {
      kind: "array",
      key: "items",
      label: "Testimonials",
      itemLabel: "Testimonial",
      itemFields: [
        { kind: "text", key: "name", label: "Name" },
        { kind: "text", key: "role", label: "Role (optional)" },
        { kind: "text", key: "quote", label: "Quote", multiline: true },
        { kind: "text", key: "avatarUrl", label: "Avatar URL (optional)" },
      ],
    },
    { kind: "select", key: "layout", label: "Layout", options: ["grid", "carousel"] },
  ],
  listings: [
    { kind: "text", key: "heading", label: "Heading" },
    {
      kind: "array",
      key: "items",
      label: "Listings",
      itemLabel: "Listing",
      itemFields: [
        { kind: "text", key: "title", label: "Title" },
        { kind: "text", key: "price", label: "Price (optional)" },
        { kind: "text", key: "location", label: "Location (optional)" },
        { kind: "text", key: "imageUrl", label: "Image URL (optional)" },
        { kind: "text", key: "href", label: "Link (optional)" },
      ],
    },
  ],
  "contact-form": [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "subheading", label: "Subheading", multiline: true },
    {
      kind: "array",
      key: "fields",
      label: "Form Fields",
      itemLabel: "Field",
      itemFields: [
        { kind: "text", key: "name", label: "Name (key)" },
        { kind: "text", key: "label", label: "Label" },
        {
          kind: "select",
          key: "type",
          label: "Type",
          options: ["text", "email", "tel", "textarea"],
        },
      ],
    },
    { kind: "text", key: "submitLabel", label: "Submit Button Label" },
    { kind: "text", key: "successMessage", label: "Success Message (optional)" },
  ],
  cta: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "subheading", label: "Subheading", multiline: true },
    { kind: "object", key: "cta", label: "Button", fields: linkFields },
  ],
  heading: [
    { kind: "text", key: "text", label: "Heading text" },
    { kind: "select", key: "level", label: "Tag", options: ["h1", "h2", "h3", "h4", "h5", "h6"] },
    fontField("fontFamily"),
    { kind: "number", key: "fontSize", label: "Font size", min: 8, max: 160, step: 1, unit: "px" },
    { kind: "select", key: "fontWeight", label: "Weight", options: ["300", "400", "500", "600", "700", "800"] },
    { kind: "number", key: "lineHeight", label: "Line height", min: 0.8, max: 3, step: 0.05 },
    { kind: "number", key: "letterSpacing", label: "Letter spacing", min: -5, max: 20, step: 0.5, unit: "px" },
    { kind: "color", key: "color", label: "Color" },
    { kind: "select", key: "textTransform", label: "Transform", options: ["none", "uppercase", "capitalize", "lowercase"] },
    { kind: "boolean", key: "italic", label: "Italic" },
    { kind: "boolean", key: "gradientText", label: "Gradient text" },
    { kind: "color", key: "gradientFrom", label: "Gradient from" },
    { kind: "color", key: "gradientTo", label: "Gradient to" },
    { kind: "number", key: "gradientAngle", label: "Gradient angle", min: 0, max: 360, step: 1, unit: "°" },
    alignField(),
  ],
  subheading: [
    { kind: "text", key: "text", label: "Sub-headline text" },
    { kind: "select", key: "level", label: "Tag", options: ["h2", "h3", "h4", "h5", "h6"] },
    fontField("fontFamily"),
    { kind: "number", key: "fontSize", label: "Font size", min: 8, max: 120, step: 1, unit: "px" },
    { kind: "select", key: "fontWeight", label: "Weight", options: ["300", "400", "500", "600", "700"] },
    { kind: "number", key: "lineHeight", label: "Line height", min: 0.8, max: 3, step: 0.05 },
    { kind: "number", key: "letterSpacing", label: "Letter spacing", min: -5, max: 20, step: 0.5, unit: "px" },
    { kind: "color", key: "color", label: "Color" },
    { kind: "select", key: "textTransform", label: "Transform", options: ["none", "uppercase", "capitalize", "lowercase"] },
    { kind: "boolean", key: "italic", label: "Italic" },
    alignField(),
  ],
  text: [
    { kind: "text", key: "text", label: "Text", multiline: true },
    fontField("fontFamily"),
    { kind: "number", key: "fontSize", label: "Font size", min: 8, max: 80, step: 1, unit: "px" },
    { kind: "select", key: "fontWeight", label: "Weight", options: ["", "300", "400", "500", "600", "700"] },
    { kind: "color", key: "color", label: "Color" },
    { kind: "number", key: "lineHeight", label: "Line height", min: 0.8, max: 3, step: 0.05 },
    { kind: "select", key: "textTransform", label: "Transform", options: ["none", "uppercase", "capitalize", "lowercase"] },
    { kind: "select", key: "direction", label: "Direction (LTR/RTL)", options: ["ltr", "rtl"] },
    { kind: "boolean", key: "italic", label: "Italic" },
    alignField(),
  ],
  image: [
    { kind: "text", key: "url", label: "Image URL" },
    { kind: "text", key: "alt", label: "Alt text" },
    { kind: "text", key: "href", label: "Link (optional)" },
    { kind: "number", key: "width", label: "Max width", min: 16, max: 2000, step: 4, unit: "px" },
    { kind: "select", key: "objectFit", label: "Fit", options: ["cover", "contain"] },
    { kind: "number", key: "rounding", label: "Corner radius", min: 0, max: 200, step: 1, unit: "px" },
    alignField(),
    { kind: "boolean", key: "lazy", label: "Lazy load" },
    { kind: "boolean", key: "lightbox", label: "Open full size on click" },
  ],
  button: [
    { kind: "text", key: "label", label: "Label" },
    fontField("fontFamily"),
    { kind: "select", key: "fontWeight", label: "Weight", options: ["", "300", "400", "500", "600", "700", "800"] },
    { kind: "boolean", key: "italic", label: "Italic" },
    { kind: "text", key: "href", label: "Link (href)" },
    { kind: "select", key: "target", label: "Opens in", options: ["_self", "_blank"] },
    { kind: "select", key: "variant", label: "Style", options: ["solid", "outline", "ghost"] },
    { kind: "select", key: "size", label: "Size", options: ["sm", "md", "lg"] },
    { kind: "select", key: "fullWidth", label: "Width", options: ["auto", "full"] },
    { kind: "color", key: "bgColor", label: "Background color" },
    { kind: "color", key: "textColor", label: "Text color" },
    { kind: "number", key: "radius", label: "Corner radius", min: 0, max: 100, step: 1, unit: "px" },
    { kind: "text", key: "icon", label: "Icon (emoji/char)" },
    { kind: "select", key: "iconPosition", label: "Icon position", options: ["left", "right"] },
    { kind: "text", key: "rel", label: "Link rel (e.g. nofollow)" },
    alignField(),
  ],
  divider: [
    { kind: "number", key: "thickness", label: "Thickness", min: 1, max: 20, step: 1, unit: "px" },
    { kind: "color", key: "color", label: "Color" },
    { kind: "number", key: "widthPct", label: "Width", min: 5, max: 100, step: 1, unit: "%" },
    { kind: "select", key: "style", label: "Line style", options: ["solid", "dashed", "dotted"] },
  ],
  video: [{ kind: "text", key: "url", label: "Video URL (YouTube/MP4)" }],
  spacer: [{ kind: "select", key: "size", label: "Height", options: ["sm", "md", "lg"] }],
  html: [{ kind: "text", key: "code", label: "Custom HTML", multiline: true }],
  row: [
    { kind: "select", key: "columns", label: "Columns", options: ["1", "2", "3", "4", "5", "6"] },
    { kind: "number", key: "gap", label: "Gap", min: 0, max: 120, step: 2, unit: "px" },
    { kind: "select", key: "contentWidth", label: "Content width", options: ["boxed", "full"] },
    { kind: "select", key: "valign", label: "Vertical align", options: ["top", "center", "bottom"] },
    { kind: "number", key: "minHeight", label: "Min height", min: 0, max: 1200, step: 10, unit: "px" },
    // Responsive (Copilot-ratified): rows auto-stack on mobile by default.
    { kind: "boolean", key: "keepRowOnMobile", label: "Keep side-by-side on mobile" },
    { kind: "boolean", key: "reverseOnMobile", label: "Reverse order on mobile" },
  ],
  "bullet-list": [
    { kind: "select", key: "bulletStyle", label: "Bullet style", options: ["disc", "circle", "square", "none", "check", "arrow"] },
    { kind: "select", key: "direction", label: "Icon side (LTR/RTL)", options: ["ltr", "rtl"] },
    { kind: "color", key: "color", label: "Bullet color" },
    { kind: "array", key: "items", label: "Items", itemLabel: "Item", itemFields: [{ kind: "text", key: "text", label: "Text" }] },
  ],
  "number-counter": [
    { kind: "text", key: "value", label: "Number" }, { kind: "text", key: "prefix", label: "Prefix (optional)" },
    { kind: "text", key: "suffix", label: "Suffix (optional)" }, { kind: "text", key: "label", label: "Label" },
  ],
  "progress-bar": [{ kind: "text", key: "label", label: "Label" }, { kind: "number", key: "percent", label: "Percent", min: 0, max: 100, step: 1, unit: "%" }],
  pricing: [{ kind: "array", key: "plans", label: "Plans", itemLabel: "Plan", itemFields: [
    { kind: "text", key: "name", label: "Name" }, { kind: "text", key: "price", label: "Price" }, { kind: "text", key: "period", label: "Period" },
    { kind: "array", key: "features", label: "Features", itemLabel: "Feature", itemFields: [{ kind: "text", key: "text", label: "Feature" }] },
    { kind: "text", key: "ctaLabel", label: "Button label" }, { kind: "text", key: "ctaHref", label: "Button link" },
  ] }],
  faq: [{ kind: "array", key: "items", label: "Questions", itemLabel: "Q&A", itemFields: [{ kind: "text", key: "q", label: "Question" }, { kind: "text", key: "a", label: "Answer", multiline: true }] }],
  gallery: [
    { kind: "array", key: "images", label: "Images", itemLabel: "Image", itemFields: [{ kind: "text", key: "url", label: "Image URL" }] },
    { kind: "number", key: "columns", label: "Columns", min: 2, max: 6 },
    { kind: "boolean", key: "lightbox", label: "Click to enlarge (lightbox)" },
  ],
  logos: [
    { kind: "array", key: "images", label: "Logos", itemLabel: "Logo", itemFields: [{ kind: "text", key: "url", label: "Logo URL" }] },
    { kind: "boolean", key: "scroll", label: "Auto-scroll (marquee)" },
    { kind: "boolean", key: "grayscale", label: "Grayscale" },
  ],
  social: [{ kind: "array", key: "links", label: "Links", itemLabel: "Link", itemFields: [{ kind: "text", key: "platform", label: "Platform" }, { kind: "text", key: "url", label: "URL" }] }],
  slider: [
    { kind: "array", key: "images", label: "Slides", itemLabel: "Slide", itemFields: [{ kind: "text", key: "url", label: "Image URL" }] },
    { kind: "boolean", key: "autoplay", label: "Autoplay" },
    { kind: "number", key: "interval", label: "Seconds per slide", min: 1, max: 30 },
    { kind: "boolean", key: "arrows", label: "Show arrows" },
    { kind: "boolean", key: "dots", label: "Show dots" },
    { kind: "number", key: "height", label: "Height", min: 120, max: 800, unit: "px" },
    { kind: "select", key: "fit", label: "Image fit", options: ["cover", "contain"] },
  ],
  countdown: [{ kind: "text", key: "label", label: "Label" }, { kind: "text", key: "target", label: "Target date (ISO)" }],
  map: [{ kind: "text", key: "query", label: "Location / address" }],
  qr: [{ kind: "text", key: "data", label: "QR content (URL/text)" }],
  icon: [
    { kind: "text", key: "icon", label: "Icon (emoji or character)" },
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "text", label: "Text", multiline: true },
    { kind: "color", key: "color", label: "Icon color" },
    { kind: "number", key: "size", label: "Icon size", min: 16, max: 160, unit: "px" },
    alignField("align"),
  ],
  audio: [
    { kind: "text", key: "url", label: "Audio file URL (mp3/wav/ogg)" },
    { kind: "text", key: "title", label: "Title" },
  ],
  tabs: [
    { kind: "array", key: "tabs", label: "Tabs", itemLabel: "Tab", itemFields: [
      { kind: "text", key: "label", label: "Tab label" },
      { kind: "text", key: "content", label: "Tab content", multiline: true },
    ] },
  ],
  ticker: [
    { kind: "array", key: "items", label: "Items", itemLabel: "Item", itemFields: [{ kind: "text", key: "text", label: "Text" }] },
    { kind: "number", key: "speed", label: "Speed", min: 5, max: 100 },
    { kind: "select", key: "direction", label: "Direction", options: ["left", "right"] },
    { kind: "color", key: "bg", label: "Background" },
    { kind: "color", key: "color", label: "Text color" },
    { kind: "text", key: "separator", label: "Separator" },
  ],
  survey: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "array", key: "questions", label: "Questions", itemLabel: "Question", itemFields: [
      { kind: "text", key: "label", label: "Question" },
      { kind: "select", key: "kind", label: "Type", options: ["single", "multiple", "text", "email", "rating"] },
      { kind: "array", key: "options", label: "Options (for single/multiple)", itemLabel: "Option", itemFields: [{ kind: "text", key: "text", label: "Option" }] },
      { kind: "boolean", key: "required", label: "Required" },
    ] },
    { kind: "text", key: "submitLabel", label: "Submit button label" },
    { kind: "text", key: "successMessage", label: "Success message" },
  ],
  booking: [
    { kind: "text", key: "calendarSlug", label: "Calendar slug (from Calendars page)" },
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "subheading", label: "Subheading" },
  ],
  // Menu items + submenus are edited by the dedicated MenuItemsEditor in the right
  // panel; these specs cover only presentational options.
  menu: [
    { kind: "select", key: "orientation", label: "Orientation", options: ["horizontal", "vertical"] },
    alignField(),
    { kind: "number", key: "gap", label: "Gap", min: 0, max: 60, unit: "px" },
    { kind: "number", key: "fontSize", label: "Font size", min: 10, max: 28, unit: "px" },
    fontField("fontFamily"),
    { kind: "select", key: "fontWeight", label: "Weight", options: ["", "400", "500", "600", "700"] },
    { kind: "color", key: "color", label: "Text color" },
    { kind: "color", key: "activeColor", label: "Hover / active color" },
    // Submenu (dropdown) — formatted separately from the menu bar.
    { kind: "color", key: "submenuBg", label: "Submenu background" },
    { kind: "color", key: "submenuColor", label: "Submenu text color" },
    { kind: "color", key: "submenuHoverBg", label: "Submenu hover background" },
    { kind: "number", key: "submenuRadius", label: "Submenu corner radius", min: 0, max: 40, step: 1, unit: "px" },
  ],
};

/** Build an empty value for a freshly-added array item from its field specs. */
export function emptyItemFor(itemFields: FieldSpec[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const f of itemFields) {
    if (f.kind === "select") obj[f.key] = f.options[0];
    else if (f.kind === "array") obj[f.key] = [];
    else if (f.kind === "object") obj[f.key] = {};
    else if (f.kind === "number") obj[f.key] = f.min ?? 0;
    else obj[f.key] = "";
  }
  return obj;
}
