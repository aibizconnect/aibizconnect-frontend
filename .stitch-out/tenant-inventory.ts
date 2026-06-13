import { createSupabaseServiceClient } from "../lib/supabase/service";
const CONSULTING = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const PLATFORM = "d723a086-eac0-4b61-8742-25313370d0b7";
const TABLES = [
  "websites", "website_pages", "website_brand_settings", "website_navigation", "website_global_blocks",
  "website_funnels", "website_media", "domains", "tenant_domains", "media_folders",
  "tenant_calendars", "tenant_calendar_connections", "tenant_appointments",
  "tenant_contacts", "tenant_contact_notes", "tenant_contact_tasks", "tenant_tags", "tenant_smart_lists",
  "tenant_pipelines", "tenant_opportunities", "tenant_custom_fields", "tenant_custom_values",
  "tenant_integrations", "tenant_secrets", "tenant_settings", "tenant_email_settings", "tenant_social_accounts",
  "tenant_shopify_stores", "tenant_users", "tenant_workflows", "tenant_onboarding", "tenant_kyc",
  "form_submissions", "tenant_brand_memory", "tenant_reviews",
];
(async () => {
  const sb = createSupabaseServiceClient();
  console.log("table".padEnd(30), "consulting", "platform");
  for (const t of TABLES) {
    const counts: (number | string)[] = [];
    for (const id of [CONSULTING, PLATFORM]) {
      const { count, error } = await sb.from(t).select("*", { count: "exact", head: true }).eq("tenant_id", id);
      counts.push(error ? `ERR(${error.message.slice(0, 30)})` : (count ?? 0));
    }
    if (counts.some((c) => c !== 0)) console.log(t.padEnd(30), String(counts[0]).padEnd(10), String(counts[1]));
  }
})();
