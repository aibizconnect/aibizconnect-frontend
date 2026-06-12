// Forensic QA of the ABC SalesMaster import (Ali): per page, diff our native sections
// against the rendered snapshot — text coverage, phone numbers, links, colors, fonts,
// spacing clamps. Read-only report; fixes follow separately.
import { readFileSync } from "fs";
import { parse } from "node-html-parser";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
const PAGES = ["home", "pricing", "product", "product-crm", "product-websites", "product-ai-builder", "product-automations", "product-consumer-portal", "product-marketplace", "solutions-real-estate", "solutions-mortgage", "solutions-legal", "solutions-insurance", "solutions-coaching", "solutions-agencies", "about", "careers", "partners"];
// Imported internal links were remapped route → our slug; compare accordingly.
const ROUTE_MAP = new Map<string, string>([
  ["/", "/"], ["/pricing", "/pricing"], ["/product", "/product"],
  ["/product/crm", "/product-crm"], ["/product/websites", "/product-websites"], ["/product/ai-builder", "/product-ai-builder"],
  ["/product/automations", "/product-automations"], ["/product/consumer-portal", "/product-consumer-portal"], ["/product/marketplace", "/product-marketplace"],
  ["/solutions/real-estate", "/solutions-real-estate"], ["/solutions/mortgage", "/solutions-mortgage"], ["/solutions/legal", "/solutions-legal"],
  ["/solutions/insurance", "/solutions-insurance"], ["/solutions/coaching", "/solutions-coaching"], ["/solutions/agencies", "/solutions-agencies"],
  ["/company/about", "/about"], ["/company/careers", "/careers"], ["/company/partners", "/partners"],
]);

const norm = (s: string) => s.replace(/\s+/g, " ").replace(/[‘’“”]/g, "'").trim();

function deepStrings(o: unknown, out: string[] = []): string[] {
  if (typeof o === "string") { if (o.length > 1 && !/^https?:|^\/|^#|^data:|^rgb|^[#.][0-9a-fA-F]/.test(o)) out.push(norm(o)); }
  else if (Array.isArray(o)) o.forEach((x) => deepStrings(x, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (!["type", "_name", "url", "href", "kind"].includes(k)) deepStrings(v, out); }
  return out;
}
function deepHrefs(o: unknown, out: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((x) => deepHrefs(x, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) {
    if ((k === "href" || k === "url") && typeof v === "string" && v) out.push(v);
    else deepHrefs(v, out);
  }
  return out;
}
function deepStyleVals(o: unknown, keyRe: RegExp, out: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((x) => deepStyleVals(x, keyRe, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) {
    if (keyRe.test(k) && (typeof v === "string" || typeof v === "number")) out.push(String(v));
    else deepStyleVals(v, keyRe, out);
  }
  return out;
}

(async () => {
  const sb = createSupabaseServiceClient();
  for (const slug of PAGES) {
    const html = readFileSync(`.stitch-out/abc-mirror/rendered/${slug}.html`, "utf8");
    const root = parse(html);
    root.querySelectorAll("script, style, noscript").forEach((el) => el.remove());

    const { data: page } = await sb.from("website_pages").select("id, slug, draft_sections, draft_seo")
      .eq("tenant_id", TENANT).eq("website_id", WEBSITE).in("slug", [slug, `abc-${slug}`]).limit(1).maybeSingle();
    if (!page) { console.log(`\n=== ${slug}: PAGE MISSING`); continue; }
    const sections = (page as any).draft_sections ?? [];

    // 1) TEXT coverage: visible snapshot lines vs our section corpus
    const corpus = norm(deepStrings(sections).join(" │ ")).toLowerCase();
    const snapLines = new Set<string>();
    for (const el of root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,a,button,span,td,th,label,blockquote,figcaption")) {
      // Leaf-ish text only: own text nodes, not descendants' (avoids giant container dupes).
      const own = el.childNodes.filter((n: any) => n.nodeType === 3).map((n: any) => n.rawText).join(" ");
      const t = norm(own || (el.querySelectorAll("*").length === 0 ? el.text : ""));
      if (t.length >= 12 && t.length <= 300) snapLines.add(t);
    }
    const missing = [...snapLines].filter((t) => !corpus.includes(t.toLowerCase()));
    const cov = snapLines.size ? Math.round(((snapLines.size - missing.length) / snapLines.size) * 100) : 100;

    // 2) PHONES
    const phoneRe = /(\+?1?[\s.\-(]*\d{3}[\s.\-)]*\d{3}[\s.\-]*\d{4})/g;
    const bodyText = norm(root.querySelector("body")?.text ?? "");
    const snapPhones = [...new Set((bodyText.match(phoneRe) ?? []).map(norm))];
    const ourPhones = [...new Set((JSON.stringify(sections).match(phoneRe) ?? []).map(norm))];
    const seoPhone = JSON.stringify((page as any).draft_seo ?? {}).match(phoneRe)?.[0];

    // 3) LINKS
    const snapLinks = new Set<string>();
    for (const el of root.querySelectorAll("a[href]")) {
      const h = el.getAttribute("href");
      if (h && h !== "#" && !h.startsWith("javascript")) snapLinks.add(h);
    }
    const ourLinks = new Set(deepHrefs(sections));
    const missingLinks = [...snapLinks].filter((h) => {
      if (h.includes("cdn-cgi")) return false; // render-bridge injected noise
      const clean = h.length > 1 ? h.replace(/[/]$/, "") : h;
      const mapped = ROUTE_MAP.get(clean) ?? clean;
      return !ourLinks.has(h) && !ourLinks.has(clean) && !ourLinks.has(mapped);
    });

    // 4) COLORS: distinct non-trivial colors in snapshot data-cs vs in our JSON
    const csColors = new Set<string>();
    for (const m of html.matchAll(/data-cs="[^"]*?(?:color|background-color):(#[0-9a-fA-F]{3,8}|rgb\([^)]*\))/g)) csColors.add(m[1].toLowerCase());
    const ourColors = new Set(deepStyleVals(sections, /color/i).map((c) => c.toLowerCase()));

    // 5) FONTS
    const csFonts = new Set<string>();
    for (const m of html.matchAll(/font-family:([^;"']+)/g)) csFonts.add(norm(m[1]).split(",")[0].replace(/["']/g, ""));
    const ourFonts = new Set(deepStyleVals(sections, /^fontFamily$/).map((f) => f.split(",")[0].replace(/["']/g, "")));

    // 6) SPACING: values captured on sections (cap = 40 per Ali's rule)
    const spacings = deepStyleVals(sections, /^(pt|pr|pb|pl|mt|mr|mb|ml|gap|padding|margin)$/).map(Number).filter((n) => !isNaN(n));
    const overCap = spacings.filter((n) => n > 40).length;

    console.log(`\n=== ${slug} (page ${(page as any).id.slice(0, 8)}…, slug ${(page as any).slug})`);
    console.log(`  text coverage: ${cov}% (${missing.length}/${snapLines.size} lines missing)`);
    missing.slice(0, 5).forEach((t) => console.log(`    MISSING: "${t.slice(0, 90)}"`));
    console.log(`  phones — snapshot: [${snapPhones.join(", ") || "none"}] ours: [${ourPhones.join(", ") || "none"}] seo: ${seoPhone ?? "none"}`);
    console.log(`  links — snapshot ${snapLinks.size}, ours ${ourLinks.size}, missing ${missingLinks.length}${missingLinks.length ? `: ${missingLinks.slice(0, 8).join(" , ")}` : ""}`);
    console.log(`  colors — snapshot distinct ${csColors.size}, ours ${ourColors.size}; sample ours: ${[...ourColors].slice(0, 6).join(" ")}`);
    console.log(`  fonts — snapshot: [${[...csFonts].slice(0, 4).join(", ")}] ours: [${[...ourFonts].slice(0, 4).join(", ") || "none (theme-level?)"}]`);
    console.log(`  spacing — ${spacings.length} captured values, max ${spacings.length ? Math.max(...spacings) : 0}, >40 clamp violations: ${overCap}`);
  }
})();
