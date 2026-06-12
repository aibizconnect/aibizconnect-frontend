// ONE TENANT ONE PLACE (Ali, D-268): merge "AIBizConnect Consulting" (214ca58a) into
// "AIBizConnect Platform" (d723a086 — Ali's daily workspace). Moves the ABC SalesMaster
// import (website + pages + brand + media), integrations + secrets, the Discovery Call
// calendar + google connection, and brand memory. Deletes Consulting's 1000-row
// "Sales Pipeline" seed flood (nothing references it). Renames the deprecated tenant +
// the superseded June-8 abcapp website. Idempotent: every step is keyed by ids and
// safe to re-run. NO DDL — the tenant-wide slug constraint stays; the two colliding
// bare slugs (home, pricing) belong to the OLD abcapp draft and are suffixed out of
// the way first (its pages are all is_public=false drafts).
import { createSupabaseServiceClient } from "../lib/supabase/service";

const C = "214ca58a-c76f-48d6-97ec-3f040db3b81f"; // Consulting (source, deprecated)
const P = "d723a086-eac0-4b61-8742-25313370d0b7"; // Platform (destination, Ali's home)
const ABC_NEW = "e53089f3-b078-4ef9-8e04-aba951ef520f"; // the 18-page import
const ABC_OLD = "2147e561-43b8-4ce5-911c-4859e184c93b"; // June-8 partial (/abcapp)

const sb = createSupabaseServiceClient();
const step = async (name: string, fn: () => Promise<string>) => {
  try { console.log(`${name}: ${await fn()}`); }
  catch (e: any) { console.log(`${name}: FAILED ${e?.message ?? e}`); }
};

(async () => {
  // 0. Free the colliding bare slugs on the OLD abcapp draft (suffix like its other pages).
  await step("free old slugs", async () => {
    const out: string[] = [];
    for (const slug of ["home", "pricing"]) {
      const { data } = await sb.from("website_pages").select("id").eq("tenant_id", P).eq("website_id", ABC_OLD).eq("slug", slug).maybeSingle();
      if (!data) { out.push(`${slug}: already free`); continue; }
      const { error } = await sb.from("website_pages").update({ slug: `${slug}-2147e561` }).eq("id", (data as any).id);
      out.push(`${slug}: ${error ? "ERR " + error.message : `→ ${slug}-2147e561`}`);
    }
    return out.join("; ");
  });

  // 1. Move the ABC website + its pages + brand settings.
  await step("website row", async () => {
    const { error } = await sb.from("websites").update({ tenant_id: P }).eq("id", ABC_NEW).eq("tenant_id", C);
    return error ? `ERR ${error.message}` : "moved";
  });
  await step("website pages", async () => {
    const { data: pages } = await sb.from("website_pages").select("id, slug").eq("website_id", ABC_NEW).eq("tenant_id", C);
    let ok = 0; const held: string[] = [];
    for (const p of (pages ?? []) as any[]) {
      const { error } = await sb.from("website_pages").update({ tenant_id: P }).eq("id", p.id);
      if (error) held.push(`${p.slug}(${error.message.slice(0, 40)})`); else ok++;
    }
    return `${ok} moved${held.length ? `, HELD: ${held.join(", ")}` : ""}`;
  });
  await step("brand settings", async () => {
    const { error } = await sb.from("website_brand_settings").update({ tenant_id: P }).eq("website_id", ABC_NEW).eq("tenant_id", C);
    return error ? `ERR ${error.message}` : "moved";
  });

  // 2. Media: every Consulting media row + folder came from the ABC ingestion.
  await step("media folders", async () => {
    const { data: folders } = await sb.from("media_folders").select("id, name").eq("tenant_id", C);
    let ok = 0;
    for (const f of (folders ?? []) as any[]) {
      let { error } = await sb.from("media_folders").update({ tenant_id: P }).eq("id", f.id);
      if (error && /duplicate|unique/i.test(error.message)) {
        ({ error } = await sb.from("media_folders").update({ tenant_id: P, name: `${f.name} (ABC)` }).eq("id", f.id));
      }
      if (!error) ok++; else console.log(`  folder "${f.name}": ${error.message}`);
    }
    return `${ok} moved`;
  });
  await step("website media", async () => {
    const { error, count } = await sb.from("website_media").update({ tenant_id: P }, { count: "exact" }).eq("tenant_id", C);
    return error ? `ERR ${error.message}` : `${count} moved`;
  });

  // 3. Integrations + secrets + brand memory (Platform has none — no conflicts).
  for (const t of ["tenant_integrations", "tenant_secrets", "tenant_brand_memory"]) {
    await step(t, async () => {
      const { error, count } = await sb.from(t).update({ tenant_id: P }, { count: "exact" }).eq("tenant_id", C);
      return error ? `ERR ${error.message}` : `${count} moved`;
    });
  }

  // 4. Calendar + its google connection (slugs differ from Platform's calendar — safe).
  for (const t of ["tenant_calendars", "tenant_calendar_connections"]) {
    await step(t, async () => {
      const { error, count } = await sb.from(t).update({ tenant_id: P }, { count: "exact" }).eq("tenant_id", C);
      return error ? `ERR ${error.message}` : `${count} moved`;
    });
  }

  // 5. Pipeline seed flood: 1000+ identical "Sales Pipeline" rows on Consulting,
  // zero opportunities reference them (verified). Deprecated tenant keeps none.
  await step("junk pipelines", async () => {
    const { count: opp } = await sb.from("tenant_opportunities").select("*", { count: "exact", head: true }).eq("tenant_id", C);
    if ((opp ?? 0) > 0) return `SKIPPED — ${opp} opportunities exist, manual review needed`;
    const { error, count } = await sb.from("tenant_pipelines").delete({ count: "exact" }).eq("tenant_id", C);
    return error ? `ERR ${error.message}` : `${count} deleted`;
  });

  // 6. Rename the deprecated tenant + the superseded old import.
  await step("rename old abcapp site", async () => {
    const { error } = await sb.from("websites").update({ name: "ABC SalesMaster (old June-8 import — superseded)" }).eq("id", ABC_OLD);
    return error ? `ERR ${error.message}` : "renamed";
  });
  await step("rename deprecated tenant", async () => {
    const { error } = await sb.from("tenants").update({ name: "zz Deprecated — merged into AIBizConnect Platform" }).eq("id", C);
    return error ? `ERR ${error.message}` : "renamed";
  });

  // 7. Verify: source should be empty of everything that matters.
  console.log("\n--- verification ---");
  for (const t of ["websites", "website_pages", "website_media", "media_folders", "tenant_integrations", "tenant_secrets", "tenant_calendars", "tenant_calendar_connections", "tenant_pipelines", "tenant_brand_memory"]) {
    const a = await sb.from(t).select("*", { count: "exact", head: true }).eq("tenant_id", C);
    const b = await sb.from(t).select("*", { count: "exact", head: true }).eq("tenant_id", P);
    console.log(`${t.padEnd(30)} consulting=${a.count ?? "?"} platform=${b.count ?? "?"}`);
  }
  // any stale tenant references inside moved page JSON?
  const { data: moved } = await sb.from("website_pages").select("slug, draft_sections").eq("website_id", ABC_NEW);
  const stale = (moved ?? []).filter((p: any) => JSON.stringify(p.draft_sections).includes(C));
  console.log(`pages with stale Consulting tenant refs: ${stale.length ? stale.map((p: any) => p.slug).join(", ") : "none"}`);
})();
