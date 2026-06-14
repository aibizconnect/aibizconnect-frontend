import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function check(label, probe) {
  const { error } = await probe();
  if (!error) { console.log(`✅ ${label}`); return; }
  const m = error.message || String(error);
  if (/does not exist|Could not find/i.test(m)) console.log(`❌ ${label} — NOT applied (${m.slice(0, 80)})`);
  else console.log(`⚠️  ${label} — ${m.slice(0, 80)}`);
}

await check("0064 tenant_opportunities.owner_email", () => sb.from("tenant_opportunities").select("owner_email").limit(1));
await check("0064 tenant_opportunities.lost_reason", () => sb.from("tenant_opportunities").select("lost_reason").limit(1));
await check("0065 tenant_social_posts", () => sb.from("tenant_social_posts").select("id").limit(1));
await check("0066 tenant_blog_posts", () => sb.from("tenant_blog_posts").select("id").limit(1));
