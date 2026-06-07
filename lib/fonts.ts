/**
 * Google Fonts catalogue + on-demand loader for the website builder.
 *
 * The font picker lists these families (each rendered in its own face). When a
 * font is chosen we inject a Google Fonts <link> once so it renders in the
 * editor preview and the published page.
 */

export const GOOGLE_FONTS: string[] = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Nunito", "Work Sans", "Mulish", "Rubik", "DM Sans", "Manrope", "Plus Jakarta Sans",
  "Figtree", "Outfit", "Sora", "Space Grotesk", "Karla", "Barlow", "Cabin", "Heebo",
  "Quicksand", "Josefin Sans", "Comfortaa", "Archivo", "Fira Sans", "Titillium Web",
  "Playfair Display", "Merriweather", "Lora", "PT Serif", "Libre Baskerville",
  "Cormorant Garamond", "Crimson Text", "Oswald", "Bebas Neue", "Anton",
  "Abril Fatface", "Lobster", "Pacifico", "Dancing Script", "Caveat",
];

// System fonts that never need a Google request.
const SYSTEM = new Set([
  "", "system-ui", "Arial", "Georgia", "Times New Roman", "-apple-system", "Segoe UI",
]);

const loaded = new Set<string>();

/** Inject the Google Fonts stylesheet for `family` (once). No-op for system fonts / SSR. */
export function ensureGoogleFont(family?: string): void {
  if (typeof document === "undefined") return;
  const fam = (family || "").trim();
  if (!fam || SYSTEM.has(fam) || loaded.has(fam)) return;
  loaded.add(fam);
  const id = "gf-" + fam.replace(/\s+/g, "-").toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

/** Load the whole catalogue in one request (used when the picker opens). */
export function ensureAllGoogleFonts(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("gf-catalogue")) return;
  const families = GOOGLE_FONTS.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;600;700`).join("&");
  const link = document.createElement("link");
  link.id = "gf-catalogue";
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
  GOOGLE_FONTS.forEach((f) => loaded.add(f));
}

/** Register an uploaded custom font via an injected @font-face (once). */
export function injectCustomFont(name?: string, src?: string): void {
  if (typeof document === "undefined" || !name || !src) return;
  const id = "cf-" + name.replace(/\s+/g, "-").toLowerCase();
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `@font-face{font-family:"${name}";src:url("${src}");font-display:swap;}`;
  document.head.appendChild(style);
  loaded.add(name);
}

/**
 * Server-safe: collect the fonts a page uses (role fonts + element overrides +
 * uploaded customs) and return a Google Fonts <link> href + @font-face CSS for
 * any uploaded fonts — so published/preview pages render the same as the editor.
 */
export function collectPageFonts(theme: any, sections: any[]): { googleHref: string | null; customFaces: string } {
  const used = new Set<string>();
  // Base brand fonts (heading/body) — applied to elements that have no explicit override.
  if (typeof theme?.fonts?.heading === "string" && theme.fonts.heading) used.add(theme.fonts.heading);
  if (typeof theme?.fonts?.body === "string" && theme.fonts.body) used.add(theme.fonts.body);
  Object.values(theme?.typography ?? {}).forEach((v: any) => {
    const fam = typeof v === "string" ? v : v?.fontFamily; // RoleStyle or legacy string
    if (typeof fam === "string" && fam) used.add(fam);
  });
  const scan = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.fontFamily === "string" && n.fontFamily) used.add(n.fontFamily);
    if (Array.isArray(n.children)) n.children.forEach((c: any) => (Array.isArray(c) ? c.forEach(scan) : scan(c)));
  };
  (sections ?? []).forEach(scan);

  const customMap = new Map<string, CustomFontLike>((Array.isArray(theme?.customFonts) ? theme.customFonts : []).map((f: CustomFontLike) => [f.name, f]));
  const googleFamilies: string[] = [];
  let customFaces = "";
  for (const fam of used) {
    if (SYSTEM.has(fam)) continue;
    const cf = customMap.get(fam);
    if (cf) customFaces += `@font-face{font-family:"${fam}";src:url("${cf.src}");font-display:swap;}`;
    else googleFamilies.push(fam);
  }
  const googleHref = googleFamilies.length
    ? `https://fonts.googleapis.com/css2?${googleFamilies.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`).join("&")}&display=swap`
    : null;
  return { googleHref, customFaces };
}
interface CustomFontLike { name: string; src: string }

/** A CSS font-family stack for a chosen family (with sensible fallbacks). */
export function fontStack(family?: string): string | undefined {
  const fam = (family || "").trim();
  if (!fam) return undefined;
  const serif = /Playfair|Merriweather|Lora|PT Serif|Baskerville|Cormorant|Crimson|Georgia|Times|Abril/i.test(fam);
  return `"${fam}", ${serif ? "Georgia, serif" : 'system-ui, -apple-system, "Segoe UI", sans-serif'}`;
}
