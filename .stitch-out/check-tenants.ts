import { createSupabaseServiceClient } from "../lib/supabase/service";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: tenants } = await sb.from("tenants").select("id, name, slug").in("id", ["214ca58a-c76f-48d6-97ec-3f040db3b81f", "d723a086-eac0-4b61-8742-25313370d0b7"]);
  for (const t of tenants ?? []) {
    console.log(`\nTENANT ${t.id}  name="${(t as any).name}"  slug=${(t as any).slug}`);
    const { data: sites } = await sb.from("websites").select("id, name, slug, is_primary, created_at").eq("tenant_id", t.id).order("created_at");
    for (const w of sites ?? []) console.log(`  website ${w.id}  "${(w as any).name}"  /${(w as any).slug}  primary=${(w as any).is_primary}  created=${(w as any).created_at}`);
  }
})();
