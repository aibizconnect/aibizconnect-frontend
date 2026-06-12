import { writeFileSync } from "fs";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: pages } = await sb.from("website_pages").select("id, slug, title, website_id, is_public, created_at, draft_sections").eq("tenant_id", P);
  for (const p of (pages ?? []) as any[]) {
    const secs = (p.draft_sections ?? []) as any[];
    console.log(`${p.slug?.padEnd(22)} website_id=${p.website_id ?? "NULL"} public=${p.is_public} created=${String(p.created_at).slice(0, 10)} sections=${secs.length}: ${secs.map((s: any) => s._name || s.type).slice(0, 6).join(" | ")}`);
  }
  writeFileSync("backups/orphan-pages-backup-20260612.json", JSON.stringify(pages, null, 1));
  console.log("\nbacked up to backups/orphan-pages-backup-20260612.json");
})();
