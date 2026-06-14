import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function check(label, probe) {
  const { error } = await probe();
  if (!error) { console.log(`✅ ${label}`); return; }
  const m = error.message || String(error);
  if (/does not exist|Could not find/i.test(m)) console.log(`❌ ${label} — NOT applied (${m.slice(0, 80)})`);
  else console.log(`⚠️  ${label} — ${m.slice(0, 80)}`);
}

await check("0067 tenant_url_redirects", () => sb.from("tenant_url_redirects").select("id").limit(1));
await check("0068 tenant_courses.price_cents", () => sb.from("tenant_courses").select("price_cents").limit(1));
await check("0068 tenant_courses.cover_image_url", () => sb.from("tenant_courses").select("cover_image_url").limit(1));
await check("0068 tenant_course_enrollments", () => sb.from("tenant_course_enrollments").select("id").limit(1));
await check("0069 tenant_store_orders", () => sb.from("tenant_store_orders").select("id").limit(1));
