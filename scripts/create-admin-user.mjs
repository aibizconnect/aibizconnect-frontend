// Cycle 3 — create the AIBizConnect admin user (TEMPLATE).
//
// IMPORTANT: auth is EXTERNAL (custom JWT against NEXT_PUBLIC_API_URL). There is
// no users table in this Supabase. So this script cannot "just insert" a user —
// it must call the external backend's user-provisioning endpoint. That endpoint
// is unknown here, so this is a configurable TEMPLATE that is REPORT-ONLY unless
// you both (a) configure ADMIN_PROVISION_URL and (b) pass --commit.
//
// Usage (report-only):  node scripts/create-admin-user.mjs
// Usage (live):         ADMIN_PROVISION_URL=... node scripts/create-admin-user.mjs --commit
//
// It NEVER fabricates ids and NEVER assumes a tenant. Tenant attachment is a
// SEPARATE step (attach-admin-to-tenant.mjs).

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@aibizconnect.app";
const ROLE = "admin"; // superadmin | admin | editor | viewer
const PROVISION_URL = process.env.ADMIN_PROVISION_URL || "";
const COMMIT = process.argv.includes("--commit");

const intended = {
  action: "create-user",
  email: ADMIN_EMAIL,
  role: ROLE,
  note: "user_id is assigned by the external backend; do not fabricate it.",
};

async function main() {
  if (!COMMIT || !PROVISION_URL) {
    console.log("REPORT ONLY — would create admin user:");
    console.log(JSON.stringify(intended, null, 2));
    console.log(
      "\nTo run live, set ADMIN_PROVISION_URL to the external backend's user-create endpoint and pass --commit."
    );
    return;
  }
  // --- live path (external backend) ---------------------------------------
  const res = await fetch(PROVISION_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, role: ROLE }),
  });
  if (!res.ok) throw new Error(`provision failed: ${res.status} ${await res.text()}`);
  const created = await res.json();
  console.log("CREATED:", JSON.stringify({ email: ADMIN_EMAIL, role: ROLE, user_id: created.id ?? created.user_id ?? "(see response)" }, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
