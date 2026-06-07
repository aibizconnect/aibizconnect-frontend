import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TID = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const ADMIN = "a5ae4ebf-30ee-4bae-95e7-5330606880d9";
const tok = "eyJhbGciOiJIUzI1NiJ9." + Buffer.from(JSON.stringify({ sub: ADMIN })).toString("base64url") + ".s";

async function publish(pageId) {
  const r = await fetch("http://localhost:3000/api/agent/publish", {
    method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TID, pageId }),
  });
  const j = await r.json();
  return `${r.status} ${j.status}${j.breakpoint ? " " + j.breakpoint : ""}${j.critic ? " critic=" + j.critic.score : ""}`;
}

// 1) create a throwaway page
const { data: ins, error: insErr } = await sb.from("website_pages").insert({
  tenant_id: TID, title: "ZZZ Publish Gate Test", slug: "zzz-publish-gate-test", is_public: false,
  draft_sections: [{ type: "contact-form", fields: [{ name: "email", type: "email" }] }], // FIELD_NO_LABEL blocker
}).select("id").single();
if (insErr) { console.log("insert err:", insErr.message); process.exit(1); }
const pageId = ins.id;
console.log("temp page:", pageId);

// 2) bad draft -> must be BLOCKED
console.log("bad draft  ->", await publish(pageId));

// 3) good draft -> must PUBLISH
await sb.from("website_pages").update({
  draft_sections: [
    { type: "hero", heading: "Premium AI Consulting for Growing Firms", primaryCta: { label: "Book a call", href: "/contact" } },
    { type: "features", heading: "What we do", features: [{ title: "Strategy", description: "Roadmaps that ship." }] },
    { type: "cta", heading: "Ready to start?", cta: { label: "Get started", href: "/contact" } },
  ],
}).eq("id", pageId).eq("tenant_id", TID);
console.log("good draft ->", await publish(pageId));

// 4) verify published state then CLEAN UP
const { data: after } = await sb.from("website_pages").select("is_public").eq("id", pageId).single();
console.log("is_public after publish:", after?.is_public);
await sb.from("website_page_sections").delete().eq("page_id", pageId).eq("tenant_id", TID);
await sb.from("website_pages").delete().eq("id", pageId).eq("tenant_id", TID);
console.log("cleaned up temp page");
