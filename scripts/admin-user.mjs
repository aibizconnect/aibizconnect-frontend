// Provision / inspect platform users directly via the Supabase Admin API.
//
// WHY: Supabase password-reset emails silently no-op for addresses that don't exist
// yet (anti-enumeration), and the built-in mailer is rate-limited / spam-prone. This
// creates the admin user with the email ALREADY confirmed, so you can sign in without
// depending on email delivery at all.
//
// The service-role key is read from the environment and is NEVER printed. Run with the
// env file loaded so you don't type the key on the command line:
//
//   List every existing auth user (answers "do we have that account?"):
//     node --env-file=.env.local scripts/admin-user.mjs list
//
//   Create a team member (email auto-confirmed). Optional 3rd arg = platform role
//   (superadmin | admin | staff); stored in app_metadata so the app recognizes them
//   even without editing the env allowlists:
//     $env:ADMIN_USER_PASSWORD="Str0ng-pass!"; node --env-file=.env.local scripts/admin-user.mjs create sysadmin@aibizconnect.app superadmin
//     $env:ADMIN_USER_PASSWORD="Str0ng-pass!"; node --env-file=.env.local scripts/admin-user.mjs create al@aibizconnect.app admin
//     $env:ADMIN_USER_PASSWORD="Str0ng-pass!"; node --env-file=.env.local scripts/admin-user.mjs create jane@aibizconnect.app staff
//
//   Reset an EXISTING user's password (and force-confirm email); optional role arg:
//     $env:ADMIN_USER_PASSWORD="Str0ng-pass!"; node --env-file=.env.local scripts/admin-user.mjs reset al@aibizconnect.app admin
//
// (PowerShell shown above; on bash use  ADMIN_USER_PASSWORD='...' node --env-file=.env.local ... )

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Did you pass --env-file=.env.local ?");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const [, , action, email, roleArg] = process.argv;
const pw = process.env.ADMIN_USER_PASSWORD;
const VALID_ROLES = ["superadmin", "admin", "staff"];
const role = roleArg ? String(roleArg).toLowerCase() : null;
if (role && !VALID_ROLES.includes(role)) {
  console.error(`Invalid role '${roleArg}'. Use one of: ${VALID_ROLES.join(", ")}.`);
  process.exit(1);
}
const appMeta = role ? { app_metadata: { platform_role: role } } : {};

async function findByEmail(e) {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === e.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  if (action === "list") {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) { console.log("No users exist yet — nobody has signed up."); return; }
    console.log(`${data.users.length} user(s):`);
    for (const u of data.users) console.log(`  ${u.email}   confirmed=${!!u.email_confirmed_at}   created=${u.created_at}`);
    return;
  }

  if (!email) { console.error("Usage: <list|create|reset> [email]"); process.exit(1); }

  if (action === "create") {
    if (!pw) { console.error("Set ADMIN_USER_PASSWORD first (see header)."); process.exit(1); }
    const existing = await findByEmail(email);
    if (existing) { console.log(`${email} already exists (id ${existing.id}). Use 'reset' to set a new password.`); return; }
    const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, ...appMeta });
    if (error) throw error;
    console.log(`Created ${email} (id ${data.user.id})${role ? `, role=${role}` : ""}. Email auto-confirmed — you can sign in now.`);
    return;
  }

  if (action === "reset") {
    if (!pw) { console.error("Set ADMIN_USER_PASSWORD first (see header)."); process.exit(1); }
    const u = await findByEmail(email);
    if (!u) { console.error(`${email} not found. Use 'create' instead.`); process.exit(1); }
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: pw, email_confirm: true, ...appMeta });
    if (error) throw error;
    console.log(`Password updated and email confirmed for ${email}${role ? `, role=${role}` : ""}. You can sign in now.`);
    return;
  }

  console.error(`Unknown action '${action}'. Use: list | create | reset.`);
  process.exit(1);
}

main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
