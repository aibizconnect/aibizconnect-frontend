// Proves the Saved Assets reuse tiers + the sync engine:
//   • Universal asset referenced by 2 pages → editing it updates BOTH (sync).
//   • Template inserted as a COPY → editing the template does NOT change the page (independent).
// DB-level (mirrors lib/saved-assets.ts). Cleans up. No server needed.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const slug = "zzz-assets-" + randomUUID().slice(0, 8);
const t = await sb.from("tenants").insert({ name: "ZZZ Assets Test", slug }).select("id").single();
if (t.error) { console.log("tenant err:", t.error.message); process.exit(1); }
const TID = t.data.id;

try {
  // two pages
  const mk = async (s) => (await sb.from("website_pages").insert({ tenant_id: TID, title: s, slug: s, is_public: false }).select("id").single()).data.id;
  const p1 = await mk("home"); const p2 = await mk("about");

  // --- UNIVERSAL asset referenced by both pages ---
  const blk = (await sb.from("website_global_blocks").insert({
    tenant_id: TID, name: "Site CTA", type: "cta-banner", kind: "section", scope: "account",
    content: { type: "cta-banner", heading: "Original CTA" },
  }).select("id").single()).data.id;
  for (const p of [p1, p2]) await sb.from("website_page_block_refs").insert({ tenant_id: TID, page_id: p, block_id: blk, order_index: 0 });

  // edit the universal block once
  await sb.from("website_global_blocks").update({ content: { type: "cta-banner", heading: "UPDATED CTA" } }).eq("id", blk);

  // both pages resolve the same (updated) content via their refs
  const resolve = async (p) => {
    const { data: refs } = await sb.from("website_page_block_refs").select("block_id").eq("page_id", p);
    const { data: b } = await sb.from("website_global_blocks").select("content").eq("id", refs[0].block_id).single();
    return b.content.heading;
  };
  const h1 = await resolve(p1), h2 = await resolve(p2);
  const syncOk = h1 === "UPDATED CTA" && h2 === "UPDATED CTA";
  console.log(`Universal sync: page1="${h1}", page2="${h2}" -> ${syncOk ? "✅ both updated" : "❌ FAILED"}`);

  // --- TEMPLATE inserted as a COPY (independent) ---
  const tpl = (await sb.from("website_saved_templates").insert({
    tenant_id: TID, name: "Hero tpl", kind: "section", content: { type: "hero", heading: "Tpl Hero v1" },
  }).select("id, content").single()).data;
  // insert = copy into page section
  await sb.from("website_page_sections").insert({ tenant_id: TID, page_id: p1, type: "hero", content: tpl.content, order_index: 1 });
  // edit the template afterwards
  await sb.from("website_saved_templates").update({ content: { type: "hero", heading: "Tpl Hero v2" } }).eq("id", tpl.id);
  const { data: sec } = await sb.from("website_page_sections").select("content").eq("page_id", p1).eq("type", "hero").single();
  const indepOk = sec.content.heading === "Tpl Hero v1";
  console.log(`Template independence: page section="${sec.content.heading}" (template now v2) -> ${indepOk ? "✅ unchanged (copy)" : "❌ FAILED"}`);

  console.log(syncOk && indepOk ? "\n✅ Saved Assets tiers verified" : "\n❌ verification failed");
} finally {
  const { data: pages } = await sb.from("website_pages").select("id").eq("tenant_id", TID);
  for (const p of pages ?? []) {
    await sb.from("website_page_block_refs").delete().eq("page_id", p.id);
    await sb.from("website_page_sections").delete().eq("page_id", p.id);
  }
  await sb.from("website_pages").delete().eq("tenant_id", TID);
  await sb.from("website_global_blocks").delete().eq("tenant_id", TID);
  await sb.from("website_saved_templates").delete().eq("tenant_id", TID);
  await sb.from("tenants").delete().eq("id", TID);
  console.log("cleaned up");
}
