// One-off: move the Ottawa page's imported-css carrier section into custom_css (+@import fonts)
// and drop it from draft_sections — the "Design CSS" entry leaves the Layers tree (Ali).
import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections, custom_css").eq("id", PAGE).single();
  const sections = (page?.draft_sections as any[]) || [];
  const carrier = sections.find((s) => s.type === "imported-css");
  if (!carrier) { console.log("no carrier — already migrated"); return; }
  const imports = Array.from(new Set(carrier.fontHrefs || [])).map((h: string) => `@import url("${h}");`).join("\n");
  const customCss = `${imports}${imports ? "\n" : ""}${carrier.css || ""}`.trim();
  const rest = sections.filter((s) => s.type !== "imported-css");
  const { error } = await sb.from("website_pages")
    .update({ draft_sections: rest, custom_css: customCss })
    .eq("tenant_id", TENANT).eq("id", PAGE);
  if (error) { console.error("FAILED:", error.message); process.exit(1); }
  console.log("migrated: css bytes", customCss.length, "| sections now:", rest.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
