"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getCurrentUserEmail } from "@/lib/auth/platform-admin";
import {
  listThreads, listThreadsForContact, getThread, replyToThread, markThreadRead,
  type ThreadSummary, type ConvMessage, type Channel,
} from "@/lib/server/conversations";

export async function listThreadsAction(tenantId: string, channel?: Channel): Promise<ThreadSummary[]> {
  await requireTenantAccess(tenantId);
  try { return await listThreads(tenantId, { channel }); } catch { return []; }
}

export async function contactThreadsAction(tenantId: string, contactId: string): Promise<ThreadSummary[]> {
  await requireTenantAccess(tenantId);
  try { return await listThreadsForContact(tenantId, contactId); } catch { return []; }
}

export async function openThreadAction(
  tenantId: string,
  conversationId: string,
): Promise<{ thread: ThreadSummary; messages: ConvMessage[] } | null> {
  await requireTenantAccess(tenantId);
  const t = await getThread(tenantId, conversationId);
  if (t) await markThreadRead(tenantId, conversationId); // opening clears unread
  return t;
}

export async function replyAction(
  tenantId: string,
  conversationId: string,
  body: string,
): Promise<{ ok: boolean; error?: string; thread?: { thread: ThreadSummary; messages: ConvMessage[] } | null }> {
  await requireTenantAccess(tenantId);
  const who = (await getCurrentUserEmail().catch(() => null)) || "Team";
  const res = await replyToThread(tenantId, conversationId, body, who);
  const thread = await getThread(tenantId, conversationId);
  return { ok: res.ok, error: res.error, thread };
}
