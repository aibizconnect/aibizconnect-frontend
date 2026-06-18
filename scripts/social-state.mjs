// Social Planner state for the tenant. Run: node --env-file=.env.local scripts/social-state.mjs
import { createClient } from "@supabase/supabase-js";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: accts } = await sb.from("tenant_social_accounts").select("provider, account_name, status, external_id, encrypted_tokens").eq("tenant_id", TENANT);
console.log("CONNECTED SOCIAL ACCOUNTS:", accts?.length ?? 0);
for (const a of accts ?? []) console.log(`  • ${a.provider} — ${a.account_name ?? a.external_id} — status=${a.status} — token=${a.encrypted_tokens ? "yes" : "NO"}`);

const { data: posts } = await sb.from("tenant_social_posts").select("status, scheduled_at").eq("tenant_id", TENANT);
const byStatus = {};
for (const p of posts ?? []) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
console.log("SOCIAL POSTS by status:", JSON.stringify(byStatus), "| total:", posts?.length ?? 0);
const stuck = (posts ?? []).filter((p) => p.status === "scheduled" && p.scheduled_at && p.scheduled_at < new Date().toISOString());
console.log("OVERDUE scheduled (should have fired):", stuck.length);
