// End-to-end proof of Start-from-Template:
//   1) apply an industry template to a throwaway tenant -> DRAFT pages created
//   2) every draft page passes the O-3 critic and PUBLISHES (proves templates clear the
//      same hard gate real sites do)
//   3) cleanup. Server must be on http://localhost:3000.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ADMIN = "a5ae4ebf-30ee-4bae-95e7-5330606880d9";
const tok = "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ sub: ADMIN })).toString("base64url") + ".s";
const BASE = "http://localhost:3000";
const TEMPLATE = process.argv[2] || "real-estate";

const slug = "zzz-tpl-" + randomUUID().slice(0, 8);
const ins = await sb.from("tenants").insert({ name: "ZZZ Template Test", slug }).select("id").single();
if (ins.error) { console.log("tenant insert err:", ins.error.message); process.exit(1); }
const TID = ins.data.id;
console.log("temp tenant:", TID, "| template:", TEMPLATE);

async function publish(pageId) {
  const r = await fetch(`${BASE}/api/agent/publish`, {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TID, pageId }),
  });
  const j = await r.json();
  return { code: r.status, status: j.status, critic: j.critic?.score, breakpoint: j.breakpoint };
}

try {
  // 1) apply template
  const r = await fetch(`${BASE}/api/internal/apply-template`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TID, templateKey: TEMPLATE, businessName: "Ali Realty", applyBrand: true }),
  });
  const j = await r.json();
  if (j.status !== "ok") { console.log("apply failed:", JSON.stringify(j)); process.exit(1); }
  console.log("applied:", j.result.note);
  console.log("brandApplied:", j.result.brandApplied);
  for (const p of j.result.pages) console.log(`  draft page: ${p.slug} (${p.sectionCount} sections) -> ${p.previewPath}`);

  // 2) publish each draft page through the real O-3 gate
  let allPublished = true;
  for (const p of j.result.pages) {
    const res = await publish(p.id);
    const ok = res.status === "published";
    if (!ok) allPublished = false;
    console.log(`  publish ${p.slug}: ${res.code} ${res.status}${res.breakpoint ? " " + res.breakpoint : ""} critic=${res.critic}`);
  }
  console.log(allPublished ? "\n✅ template -> drafts -> ALL pages passed the O-3 critic and published" : "\n❌ a page failed the gate");
} finally {
  // 3) cleanup
  const { data: pages } = await sb.from("website_pages").select("id").eq("tenant_id", TID);
  for (const p of pages ?? []) await sb.from("website_page_sections").delete().eq("page_id", p.id).eq("tenant_id", TID);
  await sb.from("website_pages").delete().eq("tenant_id", TID);
  await sb.from("website_brand_settings").delete().eq("tenant_id", TID);
  await sb.from("tenants").delete().eq("id", TID);
  console.log("cleaned up temp tenant");
}
