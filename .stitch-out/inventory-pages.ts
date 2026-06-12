import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: sites } = await sb.from("websites").select("id, name, slug").eq("tenant_id", P).order("created_at");
  for (const w of (sites ?? []) as any[]) {
    const { data: pages } = await sb.from("website_pages").select("id, slug, title, draft_sections").eq("website_id", w.id).order("order_index");
    console.log(`\n=== ${w.name} (${w.id.slice(0, 8)}, /${w.slug}) — ${pages?.length ?? 0} pages`);
    for (const p of (pages ?? []) as any[]) {
      const secs = (p.draft_sections ?? []) as any[];
      const names = secs.map((s: any) => s._name || s.type).slice(0, 12).join(" | ");
      console.log(`  ${String(p.slug).padEnd(26)} ${secs.length} sections: ${names}${secs.length > 12 ? " …" : ""}`);
    }
  }
})();
