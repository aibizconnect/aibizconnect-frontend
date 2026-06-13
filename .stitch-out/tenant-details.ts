import { createSupabaseServiceClient } from "../lib/supabase/service";
const C = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  for (const [n, id] of [["CONSULTING", C], ["PLATFORM", P]] as const) {
    console.log(`\n=== ${n}`);
    const { data: cals } = await sb.from("tenant_calendars").select("id, name, slug, timezone, venues, reminders").eq("tenant_id", id);
    for (const c of (cals ?? []) as any[]) console.log(`cal: ${c.id.slice(0,8)} "${c.name}" /${c.slug} tz=${c.timezone} venues=${(c.venues??[]).length} reminders=${JSON.stringify(c.reminders)?.slice(0,60)}`);
    const { data: conns } = await sb.from("tenant_calendar_connections").select("id, provider, account_email, calendar_id").eq("tenant_id", id);
    for (const c of (conns ?? []) as any[]) console.log(`conn: ${c.provider} ${c.account_email} → cal ${String(c.calendar_id).slice(0,8)}`);
    const { data: doms } = await sb.from("tenant_domains").select("*").eq("tenant_id", id);
    for (const d of (doms ?? []) as any[]) console.log(`domain: ${JSON.stringify(d).slice(0, 200)}`);
    const { data: pipes } = await sb.from("tenant_pipelines").select("id, name, created_at").eq("tenant_id", id).limit(5);
    for (const p of (pipes ?? []) as any[]) console.log(`pipeline sample: "${p.name}" ${p.created_at}`);
    const { data: secs } = await sb.from("tenant_secrets").select("provider, secret_key").eq("tenant_id", id);
    for (const s of (secs ?? []) as any[]) console.log(`secret: ${s.provider}/${s.secret_key}`);
    const { data: pages } = await sb.from("website_pages").select("slug, website_id").eq("tenant_id", id);
    const slugs = (pages ?? []).map((p: any) => p.slug);
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    console.log(`pages: ${slugs.length}, duplicate slugs within tenant: ${[...new Set(dupes)].join(",") || "none"}`);
    if (n === "PLATFORM") console.log("platform slugs:", slugs.sort().join(" "));
  }
  // pipeline count by name on consulting
  const { data: pn } = await sb.from("tenant_pipelines").select("name").eq("tenant_id", C).limit(1100);
  const byName = new Map<string, number>();
  for (const r of (pn ?? []) as any[]) byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
  console.log("\nconsulting pipelines by name:", [...byName.entries()].slice(0, 8).map(([k, v]) => `${k}×${v}`).join(", "), `(distinct: ${byName.size})`);
})();
