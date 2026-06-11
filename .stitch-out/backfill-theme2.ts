// Corrective pass: overwrite the just-derived columns with the refined derivation (one-off).
import { deriveDesignTokens } from "../lib/sites/design-bridge";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("id", PAGE).single();
  const t = deriveDesignTokens((page?.draft_sections as any[]) || []);
  console.log("derived:", JSON.stringify({ primary: t.primary, secondary: t.secondary, accent: t.accent, textBody: t.textBody, fonts: [t.fontHeading, t.fontBody], flags: t.flags }));
  const { error } = await sb.from("website_brand_settings").update({
    primary_color: t.primary, secondary_color: t.secondary, accent_color: t.accent,
    font_heading: t.fontHeading, font_body: t.fontBody,
  }).eq("tenant_id", TENANT);
  if (error) { console.error("WRITE FAILED:", error.message); process.exit(1); }
  console.log("brand updated");
}
main().catch((e) => { console.error(e); process.exit(1); });
