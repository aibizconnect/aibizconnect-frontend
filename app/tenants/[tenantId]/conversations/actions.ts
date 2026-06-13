"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getCurrentUserEmail } from "@/lib/auth/platform-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getInboxScope } from "@/lib/server/inbox-scope";
import {
  listThreads, listThreadsForContact, getThread, replyToThread, markThreadRead, assignThread,
  type ThreadSummary, type ConvMessage, type Channel,
} from "@/lib/server/conversations";

/** A restricted member may view a thread only if it's assigned to them or unassigned (pool). */
function canView(scope: { restrictToAssigned: boolean; userEmail: string }, assignedTo: string | null): boolean {
  if (!scope.restrictToAssigned) return true;
  return !assignedTo || assignedTo.toLowerCase() === scope.userEmail.toLowerCase();
}

export async function listThreadsAction(tenantId: string, channel?: Channel): Promise<ThreadSummary[]> {
  await requireTenantAccess(tenantId);
  try {
    const scope = await getInboxScope(tenantId);
    return await listThreads(tenantId, { channel, scope });
  } catch { return []; }
}

export async function contactThreadsAction(tenantId: string, contactId: string): Promise<ThreadSummary[]> {
  await requireTenantAccess(tenantId);
  try {
    const scope = await getInboxScope(tenantId);
    const all = await listThreadsForContact(tenantId, contactId);
    return all.filter((t) => canView(scope, t.assignedTo));
  } catch { return []; }
}

export async function openThreadAction(
  tenantId: string,
  conversationId: string,
): Promise<{ thread: ThreadSummary; messages: ConvMessage[] } | null> {
  await requireTenantAccess(tenantId);
  const t = await getThread(tenantId, conversationId);
  if (!t) return null;
  const scope = await getInboxScope(tenantId);
  if (!canView(scope, t.thread.assignedTo)) return null; // seat scope: not yours
  await markThreadRead(tenantId, conversationId);
  return t;
}

export async function replyAction(
  tenantId: string,
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; error?: string; thread?: { thread: ThreadSummary; messages: ConvMessage[] } | null }> {
  await requireTenantAccess(tenantId);
  const existing = await getThread(tenantId, conversationId);
  const scope = await getInboxScope(tenantId);
  if (existing && !canView(scope, existing.thread.assignedTo)) return { ok: false, error: "You don't have access to this conversation." };
  const who = (await getCurrentUserEmail().catch(() => null)) || "Team";
  const res = await replyToThread(tenantId, conversationId, body, who);
  const thread = await getThread(tenantId, conversationId);
  return { ok: res.ok, error: res.error, thread };
}

/** Reassign a thread — owner/admin only (D-333). Members can't reassign. */
export async function assignThreadAction(tenantId: string, conversationId: string, email: string | null): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  const scope = await getInboxScope(tenantId);
  if (!scope.isOwnerOrAdmin) return { ok: false, error: "Only owners/admins can reassign conversations." };
  await assignThread(tenantId, conversationId, email && email.trim() ? email.trim() : null);
  return { ok: true };
}

/** Team member emails (for the reassign picker) + whether the caller may reassign. */
export async function inboxTeamAction(tenantId: string): Promise<{ canAssign: boolean; emails: string[] }> {
  await requireTenantAccess(tenantId);
  const scope = await getInboxScope(tenantId);
  if (!scope.isOwnerOrAdmin) return { canAssign: false, emails: [] };
  try {
    const { data } = await createSupabaseServiceClient().from("tenant_users").select("email, status").eq("tenant_id", tenantId);
    const emails = (data ?? []).filter((r: any) => r.email && r.status !== "invited").map((r: any) => String(r.email));
    return { canAssign: true, emails: Array.from(new Set(emails)) };
  } catch { return { canAssign: true, emails: [] }; }
}
