"use server";

import { isPlatformSuperAdmin, isOwner, getCurrentUserEmail } from "@/lib/auth/platform-admin";
import { listTeam, createTeamMember, setTeamRole, setTeamActive, type TeamMember } from "@/lib/auth/team";
import { logPlatformEvent } from "@/lib/audit/platform-audit";

async function ensureSuperAdmin() {
  if (!(await isPlatformSuperAdmin())) throw new Error("Not authorized — superadmin only.");
}

export async function listTeamAction(): Promise<TeamMember[]> {
  await ensureSuperAdmin();
  return listTeam();
}

export async function createTeamMemberAction(input: { email: string; name?: string; role: string; password: string }): Promise<{ ok: boolean; message?: string; member?: TeamMember }> {
  try {
    await ensureSuperAdmin();
    const member = await createTeamMember(input, { actorIsOwner: await isOwner() });
    await logPlatformEvent({ action: "team.create", actorEmail: await getCurrentUserEmail(), targetEmail: member.email, meta: { role: member.role } });
    return { ok: true, member };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not create member." };
  }
}

export async function setTeamRoleAction(userId: string, email: string, role: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await ensureSuperAdmin();
    await setTeamRole(userId, role, { actorIsOwner: await isOwner() });
    await logPlatformEvent({ action: "team.role", actorEmail: await getCurrentUserEmail(), targetEmail: email, meta: { role } });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not change role." };
  }
}

export async function setTeamActiveAction(userId: string, email: string, active: boolean): Promise<{ ok: boolean; message?: string }> {
  try {
    await ensureSuperAdmin();
    await setTeamActive(userId, active, { actorIsOwner: await isOwner() });
    await logPlatformEvent({ action: active ? "team.activate" : "team.deactivate", actorEmail: await getCurrentUserEmail(), targetEmail: email });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not update member." };
  }
}
