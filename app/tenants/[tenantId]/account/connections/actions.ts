"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getCurrentUserEmail } from "@/lib/auth/platform-admin";
import {
  listUserConnections, saveImapConnection, deleteUserConnection,
  type UserConnectionView, type ImapCreds,
} from "@/lib/server/user-connections";

/** The owning seat key — JWT sub, else email (dev). Each user manages only their own. */
async function userKey(): Promise<string> {
  return (await getCurrentUserId().catch(() => null)) || (await getCurrentUserEmail().catch(() => null)) || "";
}

export async function listConnectionsAction(tenantId: string): Promise<UserConnectionView[]> {
  await requireTenantAccess(tenantId);
  try { return await listUserConnections(tenantId, await userKey()); } catch { return []; }
}

export async function saveImapAction(tenantId: string, creds: ImapCreds): Promise<{ ok: boolean; error?: string; connections: UserConnectionView[] }> {
  await requireTenantAccess(tenantId);
  const key = await userKey();
  const r = await saveImapConnection(tenantId, key, creds);
  return { ...r, connections: await listUserConnections(tenantId, key) };
}

export async function deleteConnectionAction(tenantId: string, id: string): Promise<UserConnectionView[]> {
  await requireTenantAccess(tenantId);
  const key = await userKey();
  await deleteUserConnection(tenantId, key, id);
  return listUserConnections(tenantId, key);
}
