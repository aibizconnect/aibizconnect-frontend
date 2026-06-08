import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { roleForEmail, type PlatformRole } from "@/lib/auth/platform-admin";

/**
 * Platform TEAM management via the Supabase Admin API (service role). These are the
 * AI Biz Connect team — superadmin / admin / staff — NOT tenant users. All callers must
 * be gated by isPlatformSuperAdmin() at the server-action layer before reaching here.
 *
 * A member's role is read from `app_metadata.platform_role` (set by us), falling back to
 * the env allowlist mapping. Writing a role updates app_metadata so it travels in the JWT.
 */
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;        // effective platform tier
  active: boolean;           // false when banned/deactivated
  confirmed: boolean;        // email confirmed
  createdAt: string;
  lastSignInAt: string | null;
}

const VALID: Exclude<PlatformRole, null>[] = ["superadmin", "admin", "staff"];

function toMember(u: any): TeamMember {
  const email = (u.email || "").toLowerCase();
  const meta = u.app_metadata || {};
  const claimed = String(meta.platform_role || meta.platformRole || "").toLowerCase();
  const role: PlatformRole = (VALID.includes(claimed as any) ? claimed : roleForEmail(email)) as PlatformRole;
  const bannedUntil = u.banned_until ? new Date(u.banned_until).getTime() : 0;
  return {
    id: u.id,
    email,
    name: (u.user_metadata?.full_name || u.user_metadata?.name || "").trim() || email.split("@")[0],
    role,
    active: !(bannedUntil && bannedUntil > Date.now()),
    confirmed: !!u.email_confirmed_at,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

/** All Supabase users that resolve to a platform role (the team), newest first. */
export async function listTeam(): Promise<TeamMember[]> {
  const supabase = createSupabaseServiceClient();
  const out: TeamMember[] = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      const m = toMember(u);
      if (m.role) out.push(m); // only platform team members
    }
    if (data.users.length < 200) break;
  }
  return out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

async function findByEmail(email: string) {
  const supabase = createSupabaseServiceClient();
  const target = email.toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function getMember(userId: string): Promise<TeamMember | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return toMember(data.user);
}

/** How many superadmins are currently active — the lockout backstop. */
async function activeSuperadminCount(): Promise<number> {
  return (await listTeam()).filter((m) => m.role === "superadmin" && m.active).length;
}

/** Create a team member with the email pre-confirmed and a platform role stamped. */
export async function createTeamMember(input: { email: string; name?: string; role: string; password: string }, opts: { actorIsOwner: boolean }): Promise<TeamMember> {
  const email = (input.email || "").trim().toLowerCase();
  const role = String(input.role || "").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (!VALID.includes(role as any)) throw new Error(`Role must be one of: ${VALID.join(", ")}.`);
  if (role === "superadmin" && !opts.actorIsOwner) throw new Error("Only an owner (sysadmin) can create a superadmin.");
  if (!input.password || input.password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (await findByEmail(email)) throw new Error(`${email} already exists — change their role instead.`);
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: { platform_role: role },
    user_metadata: input.name ? { full_name: input.name.trim() } : {},
  });
  if (error) throw new Error(error.message);
  return toMember(data.user);
}

/**
 * Change a member's platform role. Guardrails:
 *  - Only an owner may grant OR revoke the superadmin role.
 *  - Cannot demote the last active superadmin (lockout protection).
 */
export async function setTeamRole(userId: string, role: string, opts: { actorIsOwner: boolean }): Promise<void> {
  const r = String(role || "").toLowerCase();
  if (!VALID.includes(r as any)) throw new Error(`Role must be one of: ${VALID.join(", ")}.`);
  const target = await getMember(userId);
  if (!target) throw new Error("Member not found.");
  const wasSuper = target.role === "superadmin";
  const willSuper = r === "superadmin";
  if ((wasSuper || willSuper) && !opts.actorIsOwner) {
    throw new Error("Only an owner (sysadmin) can grant or revoke the superadmin role.");
  }
  if (wasSuper && !willSuper && target.active && (await activeSuperadminCount()) <= 1) {
    throw new Error("Can't demote the last active superadmin — promote another first.");
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: { platform_role: r } });
  if (error) throw new Error(error.message);
}

/**
 * Deactivate (ban) or reactivate a member. Guardrails:
 *  - A SUPERADMIN can NEVER be deactivated, by anyone (hard lockout protection).
 */
export async function setTeamActive(userId: string, active: boolean, opts: { actorIsOwner: boolean }): Promise<void> {
  void opts; // actor role no longer relaxes the rule — superadmins are always protected
  if (!active) {
    const target = await getMember(userId);
    if (!target) throw new Error("Member not found.");
    if (target.role === "superadmin") {
      throw new Error("Superadmins can't be deactivated.");
    }
  }
  const supabase = createSupabaseServiceClient();
  // ban_duration "none" reactivates; a long duration deactivates.
  const ban_duration = active ? "none" : "876000h"; // ~100 years
  const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration } as any);
  if (error) throw new Error(error.message);
}
