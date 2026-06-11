// Backfill SEO/GEO for the Ottawa page from its own content (D-209/D-210) + re-inspect (v1.1).
import { parse } from "node-html-parser";
import { inspectPage } from "../lib/sites/inspector";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections, draft_seo, custom_css").eq("id", PAGE).single();
  const sections = (page?.draft_sections as any[]) || [];
  const all = sections.filter((s) => s.type === "imported-html").map((s) => parse(s.html || "").text.replace(/\s+/g, " ")).join(" ");
  const paras = sections.flatMap((s) => s.type === "imported-html" ? parse(s.html || "").querySelectorAll("p").map((p) => p.text.replace(/\s+/g, " ").trim()) : []);
  const para = paras.find((t) => t.length >= 60) || "";
  const description = para.length <= 160 ? para : `${para.slice(0, 157).replace(/\s+\S*$/, "")}…`;
  const phone = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/.exec(all)?.[0]?.trim();
  const email = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.exec(all)?.[0];
  const addr = /\d{1,5}\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?)(?:[,\s]+(?:Suite|Ste\.?|Unit|#)\s*[\w-]+)?(?:[,\s]+[A-Z][A-Za-z]+)*(?:[,\s]+[A-Z]{2}[,\s]+[A-Z0-9 ]{3,8})?/.exec(all)?.[0]?.trim();
  const city = addr ? /([A-Z][a-zA-Z]+),?\s+[A-Z]{2}\b/.exec(addr)?.[1] : undefined;
  const ogImg = (() => { for (const s of sections) { const m = /<img[^>]*src="(https?:\/\/[^"]+)"/.exec(s.html || ""); if (m) return m[1]; } return undefined; })();
  const draft_seo = {
    ...(page?.draft_seo && typeof page.draft_seo === "object" ? page.draft_seo : {}),
    ...(description ? { seo_description: description } : {}),
    ...(ogImg ? { seo_image_url: ogImg } : {}),
    ...(phone || addr ? { schemas: ["LocalBusiness"], ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(addr ? { address: addr.slice(0, 120) } : {}), ...(city ? { area_served: city } : {}) } : {}),
  };
  console.log("derived:", JSON.stringify({ description: description.slice(0, 80) + "…", phone, email, address: addr, city, og: !!ogImg }, null, 1));
  const { error } = await sb.from("website_pages").update({ draft_seo }).eq("tenant_id", TENANT).eq("id", PAGE);
  if (error) { console.error("FAILED:", error.message); process.exit(1); }
  const report = await inspectPage(sections, page?.custom_css as string, { seo: draft_seo });
  console.log("INSPECTOR v1.1:", JSON.stringify(report, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
