import { createSupabaseServiceClient } from "../lib/supabase/service";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("website_brand_settings").select("*").eq("tenant_id", "d723a086-eac0-4b61-8742-25313370d0b7");
  if (error) { console.log("ERR", error.message); return; }
  console.log("rows:", (data || []).length);
  for (const r of data || []) console.log({ id: r.id, website_id: (r as any).website_id, primary: r.primary_color, secondary: r.secondary_color, accent: r.accent_color, heading: r.font_heading, body: r.font_body });
}
main();
