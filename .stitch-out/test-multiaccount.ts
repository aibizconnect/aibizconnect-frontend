// 0048 verification: two accounts of the SAME provider on one calendar must coexist;
// duplicate same-account row must still be rejected. Self-cleaning.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  const { data: cal } = await sb.from("tenant_calendars").select("id").eq("tenant_id", T).eq("slug", "abc-consultation").single();
  if (!cal) fail("calendar missing");
  const calId = (cal as any).id;

  const mk = (email: string) => ({ tenant_id: T, calendar_id: calId, provider: "google", account_email: email, external_calendar_id: "primary", encrypted_tokens: "test-not-real", status: "connected" });

  // A second google account must now insert cleanly alongside the real one.
  const { data: a, error: e1 } = await sb.from("tenant_calendar_connections").insert(mk("test-second-account@example.com")).select("id").single();
  if (e1) fail(`second account rejected: ${e1.message}`);
  console.log("1. second Google account on the same calendar OK (0048 live)");

  // Exact duplicate (same account) must still be refused.
  const { error: e2 } = await sb.from("tenant_calendar_connections").insert(mk("test-second-account@example.com"));
  if (!e2) fail("exact duplicate was NOT rejected");
  console.log("2. duplicate same-account row still rejected OK");

  await sb.from("tenant_calendar_connections").delete().eq("id", (a as any).id);
  const { data: left } = await sb.from("tenant_calendar_connections").select("account_email").eq("tenant_id", T).eq("calendar_id", calId);
  console.log(`3. cleanup OK — remaining connections: ${(left ?? []).map((r: any) => r.account_email).join(", ")} — ALL CHECKS PASS`);
})();
