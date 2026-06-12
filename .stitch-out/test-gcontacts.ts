// D-258 round trip: applySyncedPeople against the live test tenant with fabricated Google
// People payloads — create with group-tags, idempotent re-run, fill-empty-only (our edits
// win), tags union with existing, resourceName match beats email, no-email skip. Self-cleaning.
import { createClient } from "@supabase/supabase-js";
import { applySyncedPeople, type SyncPerson } from "../lib/server/google-contacts";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };
const P = (over: Partial<SyncPerson>): SyncPerson => ({
  resourceName: "people/test0", name: null, email: null, phone: null, company: null, groupNames: [], groupRns: [], ...over,
});

(async () => {
  // 1) fresh creates carry their group labels as tags
  const r1 = await applySyncedPeople(T, [
    P({ resourceName: "people/gc1", name: "Larry Lawyer", email: "gc-larry@example.com", phone: "613-555-0301", groupNames: ["Lawyers", "Clients"] }),
    P({ resourceName: "people/gc2", name: "Betty Buyer", email: "gc-betty@example.com", groupNames: ["Buyers", "Mortgage Refinancing"] }),
    P({ resourceName: "people/gc3", name: "No Email", groupNames: ["Sellers"] }),
  ]);
  if (r1.created !== 2 || r1.skippedNoEmail !== 1) fail(`create pass: ${JSON.stringify(r1)}`);
  const { data: larry } = await sb.from("tenant_contacts").select("*").eq("tenant_id", T).eq("email", "gc-larry@example.com").single();
  const tags1: string[] = (larry as any).tags ?? [];
  if (!tags1.includes("Lawyers") || !tags1.includes("Clients")) fail(`group tags missing: ${tags1}`);
  if ((larry as any).source !== "google contacts") fail("source not set");
  if ((larry as any).custom?.googleResourceName !== "people/gc1") fail("resourceName not stored");
  console.log(`1. create OK — Larry tagged [${tags1.join(", ")}], no-email skipped`);

  // 2) idempotent re-run: no dupes, no double tags
  const r2 = await applySyncedPeople(T, [P({ resourceName: "people/gc1", name: "Larry Lawyer", email: "gc-larry@example.com", groupNames: ["Lawyers", "Clients"] })]);
  if (r2.created !== 0 || r2.tagsApplied !== 0) fail(`re-run not idempotent: ${JSON.stringify(r2)}`);
  const { count } = await sb.from("tenant_contacts").select("*", { count: "exact", head: true }).eq("tenant_id", T).eq("email", "gc-larry@example.com");
  if (count !== 1) fail(`duplicate created: ${count}`);
  console.log("2. idempotent re-run OK (no dupes, no double tags)");

  // 3) our edits win (fill-empty-only) + new group → tag UNION
  await sb.from("tenant_contacts").update({ name: "Larry EDITED", phone: "613-555-9999" }).eq("tenant_id", T).eq("id", (larry as any).id);
  const r3 = await applySyncedPeople(T, [P({ resourceName: "people/gc1", name: "Larry Lawyer", email: "gc-larry@example.com", phone: "613-555-0301", groupNames: ["Lawyers", "Clients", "Mortgage Renewal"] })]);
  const { data: larry2 } = await sb.from("tenant_contacts").select("*").eq("tenant_id", T).eq("id", (larry as any).id).single();
  if ((larry2 as any).name !== "Larry EDITED") fail("sync overwrote our name edit");
  if ((larry2 as any).phone !== "613-555-9999") fail("sync overwrote our phone edit");
  const tags3: string[] = (larry2 as any).tags ?? [];
  if (!tags3.includes("Mortgage Renewal") || r3.tagsApplied !== 1) fail(`tag union failed: ${tags3} / ${JSON.stringify(r3)}`);
  console.log(`3. fill-empty-only + tag union OK — [${tags3.join(", ")}]`);

  // 4) email changed in Google → resourceName match still finds the same contact
  const r4 = await applySyncedPeople(T, [P({ resourceName: "people/gc2", name: "Betty Buyer", email: "gc-betty-new@example.com", groupNames: ["Buyers"] })]);
  if (r4.created !== 0 || r4.updated !== 1) fail(`resourceName match failed: ${JSON.stringify(r4)}`);
  console.log("4. resourceName match beats email change OK");

  // cleanup
  for (const e of ["gc-larry@example.com", "gc-betty@example.com", "gc-betty-new@example.com"]) {
    await sb.from("tenant_contacts").delete().eq("tenant_id", T).eq("email", e);
  }
  console.log("5. cleanup OK — ALL CHECKS PASS");
})();
