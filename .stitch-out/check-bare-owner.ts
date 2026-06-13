import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: sites } = await sb.from("websites").select("id, name, slug").eq("tenant_id", P);
  const names = new Map((sites ?? []).map((w: any) => [w.id, `${w.name} (/${w.slug})`]));
  const { data: pages } = await sb.from("website_pages").select("slug, website_id, is_home, is_public").eq("tenant_id", P).in("slug", ["home", "pricing", "about", "contact", "blog"]);
  for (const p of (pages ?? []) as any[]) console.log(`${p.slug.padEnd(10)} → ${names.get(p.website_id)}  home=${p.is_home} public=${p.is_public}`);
  // also which global blocks/funnels belong to the ABC website on consulting
  const W = "e53089f3-b078-4ef9-8e04-aba951ef520f";
  for (const t of ["website_global_blocks", "website_funnels"]) {
    const { data, error } = await sb.from(t).select("id, website_id").eq("tenant_id", "214ca58a-c76f-48d6-97ec-3f040db3b81f");
    console.log(t, error ? "ERR" : (data ?? []).map((r: any) => `${r.id.slice(0,8)}→site ${String(r.website_id).slice(0,8)}${r.website_id === W ? " (ABC)" : ""}`).join(", "));
  }
})();
