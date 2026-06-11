// One-off: derive Design Bridge tokens from the already-imported Ottawa page and fill the
// tenant's empty brand fields (D-194; fill-empty-only).
import { deriveDesignTokens } from "../lib/sites/design-bridge";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  const t = deriveDesignTokens((page?.draft_sections as any[]) || []);
  console.log("derived:", JSON.stringify(t, null, 1));
  const { data: brand } = await sb.from("website_brand_settings").select("*").eq("tenant_id", TENANT).limit(1).maybeSingle();
  const fill: Record<string, unknown> = {};
  const put = (col: string, v?: string) => { if (v && !(brand as any)?.[col]) fill[col] = v; };
  put("primary_color", t.primary); put("secondary_color", t.secondary); put("accent_color", t.accent);
  put("font_heading", t.fontHeading); put("font_body", t.fontBody);
  console.log("filling:", JSON.stringify(fill));
  if (Object.keys(fill).length) {
    const { error } = brand
      ? await sb.from("website_brand_settings").update(fill).eq("tenant_id", TENANT)
      : await sb.from("website_brand_settings").insert({ tenant_id: TENANT, ...fill });
    if (error) { console.error("WRITE FAILED:", error.message); process.exit(1); }
  }
  console.log("done");
}
main().catch((e) => { console.error(e); process.exit(1); });
