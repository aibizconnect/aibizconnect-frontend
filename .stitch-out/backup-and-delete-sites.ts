// D-279: FULL backup of all 5 websites (pages incl. published sections, brand, global
// blocks, navigation, domains) to backups/, then delete 4 websites via the app's own
// deleteWebsite cascade and strip the 5th into a blank "Main Website" canvas.
// Run with MODE=backup first (commit the file!), then MODE=delete.
import { writeFileSync } from "fs";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const MODE = process.env.MODE ?? "backup";

(async () => {
  const sb = createSupabaseServiceClient();
  const { data: sites } = await sb.from("websites").select("*").eq("tenant_id", P).order("created_at");

  if (MODE === "backup") {
    const dump: Record<string, unknown> = { exportedAt: new Date().toISOString(), tenantId: P, websites: [] as unknown[] };
    for (const w of (sites ?? []) as any[]) {
      const [pages, brand, blocks, nav, doms] = await Promise.all([
        sb.from("website_pages").select("*").eq("website_id", w.id),
        sb.from("website_brand_settings").select("*").eq("website_id", w.id),
        sb.from("website_global_blocks").select("*").eq("website_id", w.id),
        sb.from("website_navigation").select("*").eq("website_id", w.id),
        sb.from("domains").select("*").eq("website_id", w.id),
      ]);
      (dump.websites as unknown[]).push({ website: w, pages: pages.data ?? [], brand: brand.data ?? [], globalBlocks: blocks.data ?? [], navigation: nav.data ?? [], domains: doms.data ?? [] });
      console.log(`backed up: ${w.name} — ${pages.data?.length ?? 0} pages, ${blocks.data?.length ?? 0} blocks`);
    }
    writeFileSync("backups/websites-full-backup-20260612.json", JSON.stringify(dump, null, 1));
    console.log("\nWROTE backups/websites-full-backup-20260612.json — COMMIT BEFORE DELETING");
    return;
  }

  // MODE=delete
  const { deleteWebsite } = await import("../app/tenants/[tenantId]/website/website-actions");
  const list = (sites ?? []) as any[];
  // keep the OLDEST as the blank canvas (it'll be renamed Main Website)
  const keep = list[0];
  for (const w of list.slice(1)) {
    const r = await deleteWebsite(P, w.id);
    console.log(`delete "${w.name}": ${r.ok ? "OK" : "FAILED " + r.error}`);
  }
  // strip the keeper: pages, blocks, nav, its media, brand stays minimal
  await sb.from("website_pages").delete().eq("tenant_id", P).eq("website_id", keep.id);
  await sb.from("website_global_blocks").delete().eq("tenant_id", P).eq("website_id", keep.id);
  await sb.from("website_navigation").delete().eq("website_id", keep.id);
  try {
    const { data: media } = await sb.from("website_media").select("storage_path").eq("tenant_id", P).eq("website_id", keep.id);
    const paths = (media ?? []).map((m: any) => m.storage_path).filter(Boolean) as string[];
    if (paths.length) { const { removeObjects } = await import("../lib/media/storage"); await removeObjects(paths); }
    await sb.from("website_media").delete().eq("tenant_id", P).eq("website_id", keep.id);
  } catch { /* best effort */ }
  await sb.from("websites").update({ name: "Main Website", slug: "main", is_primary: true }).eq("id", keep.id);
  console.log(`stripped + renamed keeper "${keep.name}" → "Main Website" (blank canvas)`);

  const { count: pagesLeft } = await sb.from("website_pages").select("*", { count: "exact", head: true }).eq("tenant_id", P);
  const { data: remaining } = await sb.from("websites").select("name, slug").eq("tenant_id", P);
  console.log(`\nfinal state: ${remaining?.length} website(s) [${(remaining ?? []).map((w: any) => w.name).join(", ")}], ${pagesLeft} pages`);
})();
