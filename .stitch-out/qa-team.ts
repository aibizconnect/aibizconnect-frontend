import { listTeam, inviteMember, updateMember, removeMember, tenantRole } from "../lib/server/tenant-team";
import { getOrgForTenant, createOrganization, getOrgRollup } from "../lib/server/organizations";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const results: [string, boolean][] = [];
const check = (n: string, ok: boolean, note = "") => { results.push([n, ok]); console.log(`${ok ? "PASS" : "FAIL"} ${n}${note ? " — " + note : ""}`); };

(async () => {
  const sb = createSupabaseServiceClient();
  const team0 = await listTeam(P);
  check("list team (existing owner)", team0.some((m) => m.role === "owner"), `${team0.length} members`);

  const inv = await inviteMember(P, { email: "qa-staff@example.com", name: "QA Staff", role: "member", assignedOnly: true });
  const preDDL = !inv.ok && /0056|database update/i.test(inv.error ?? "");
  check(preDDL ? "invite gracefully blocked pre-0056" : "invite member", inv.ok || preDDL, inv.error ?? "");
  const team1 = await listTeam(P);
  const m = team1.find((x) => x.email === "qa-staff@example.com");
  check(preDDL ? "invite needs 0056 (expected, no row)" : "invited member appears", preDDL ? !m : (!!m && m.status === "invited" && m.assignedOnly === true), m ? `role=${m.role}` : "no row (pre-DDL)");

  if (!preDDL) {
    const dup = await inviteMember(P, { email: "qa-staff@example.com", role: "member" });
    check("no duplicate invites", !dup.ok);
  } else check("no duplicate invites (n/a pre-DDL)", true);
  const ownerInvite = await inviteMember(P, { email: "qa-owner@example.com", role: "owner" as any });
  check("can't invite a second owner", !ownerInvite.ok);

  if (m) {
    const up = await updateMember(P, m.id, { role: "admin", assignedOnly: false });
    check("promote to admin", up.ok);
    const team2 = await listTeam(P);
    check("role change persisted", team2.find((x) => x.id === m.id)?.role === "admin");
  }
  // protect the owner
  const owner = team1.find((x) => x.role === "owner");
  if (owner) {
    const demote = await updateMember(P, owner.id, { role: "member" });
    check("owner can't be demoted", !demote.ok);
    const rm = await removeMember(P, owner.id);
    check("owner can't be removed", !rm.ok);
  }
  // tenantRole resolves active members by email; invited returns null
  const role = await tenantRole(P, "qa-staff@example.com");
  check("tenantRole: invited = no access", role === null, String(role));

  // org (graceful if 0056 not yet applied)
  const orgBefore = await getOrgForTenant(P);
  const orgRes = await createOrganization(P, "QA Franchise Group");
  if (orgRes.ok && orgRes.orgId) {
    const org = await getOrgForTenant(P);
    check("organization created + tenant attached", !!org && org.name.length > 0, org?.name);
    const rollup = await getOrgRollup(orgRes.orgId);
    check("rollup counts locations", rollup.locations >= 1, JSON.stringify(rollup));
    // cleanup org link
    await sb.from("tenants").update({ organization_id: null }).eq("id", P);
    await sb.from("organizations").delete().eq("id", orgRes.orgId);
  } else {
    check("org gracefully blocked pre-0056", /0056|not enabled/i.test(orgRes.error ?? ""), orgRes.error ?? "");
  }

  // cleanup
  if (m) await sb.from("tenant_users").delete().eq("tenant_id", P).eq("id", m.id);
  const team3 = await listTeam(P);
  check("cleanup", !team3.some((x) => x.email === "qa-staff@example.com"));

  const fails = results.filter(([, ok]) => !ok).length;
  console.log(`\n=== D-282/283 QA: ${results.length - fails}/${results.length} passed ===`);
})();
