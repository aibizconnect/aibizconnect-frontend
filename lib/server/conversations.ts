import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendSms, isE164 } from "./twilio";
import { sendEmail } from "./email-send";
import { sendMetaMessage } from "./social";

/**
 * Unified Conversations core (D-297..301) — the GHL "Conversations" inbox.
 * SERVER-ONLY (not "use server"): the webhook and the page's server actions call in.
 * Tables tenant_conversations (thread) + tenant_messages (each message), migration 0057.
 * Until applied, every read returns empty and every write no-ops (best-effort) — the
 * inbound webhook still 200s Twilio so messages aren't retried into a black hole.
 *
 * Outbound 1:1 replies bypass the marketing send-gate (D-299): a direct human reply is
 * not a bulk/automated send. The raw sendSms/sendEmail are used; they require a verified
 * sender / connected Twilio but do not enforce marketing consent.
 */

export type Channel = "sms" | "email" | "webchat" | "facebook" | "instagram" | "whatsapp";
/** Meta channels reply out through the Graph API (Page/WhatsApp token), not Twilio/Resend. */
const META_CHANNELS: Channel[] = ["facebook", "instagram", "whatsapp"];
export type Direction = "inbound" | "outbound";
export type SenderType = "contact" | "platform_user" | "agent" | "system";

export interface ThreadSummary {
  id: string;
  contactId: string | null;
  contactName: string;
  channel: Channel;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  lastPreview: string;
}

export interface ConvMessage {
  id: string;
  channel: Channel;
  direction: Direction;
  senderType: SenderType;
  senderName: string | null;
  body: string;
  subject: string | null;
  status: string;
  createdAt: string;
}

const svc = () => createSupabaseServiceClient();
const missingTable = (msg?: string) =>
  /relation .* does not exist|Could not find the table|schema cache/i.test(msg ?? "");

function preview(body: string): string {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length > 120 ? t.slice(0, 117) + "…" : t;
}

/** Loose E.164 normalize for matching (keeps a leading +, strips spaces/dashes/parens). */
export function normalizePhone(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const plus = s.startsWith("+");
  const digits = s.replace(/[^\d]/g, "");
  return plus ? `+${digits}` : digits;
}

// ── contacts ────────────────────────────────────────────────────────────────

/** Find a contact by phone (loose match), or create a lightweight one. Returns id|null. */
export async function findOrCreateContactByPhone(
  tenantId: string,
  phone: string,
  fallbackName?: string,
): Promise<{ contactId: string | null; contactName: string }> {
  const norm = normalizePhone(phone);
  if (!norm) return { contactId: null, contactName: fallbackName || "Unknown" };
  const sb = svc();
  // Match on the last 10 digits (handles +1 vs raw). Pull a small candidate set and compare.
  const tail = norm.replace(/[^\d]/g, "").slice(-10);
  const { data: rows } = await sb
    .from("tenant_contacts")
    .select("id, name, phone")
    .eq("tenant_id", tenantId)
    .ilike("phone", `%${tail}%`)
    .limit(5);
  const hit = (rows ?? []).find((r: any) => normalizePhone(r.phone).replace(/[^\d]/g, "").slice(-10) === tail);
  if (hit) return { contactId: hit.id, contactName: hit.name || norm };

  const name = fallbackName || `SMS ${norm}`;
  const { data: created, error } = await sb
    .from("tenant_contacts")
    .insert({ tenant_id: tenantId, name, phone: norm, source: "sms" })
    .select("id")
    .single();
  if (error || !created) return { contactId: null, contactName: name };
  return { contactId: created.id, contactName: name };
}

async function contactName(tenantId: string, contactId: string | null): Promise<string> {
  if (!contactId) return "Unknown";
  const { data } = await svc().from("tenant_contacts").select("name, phone, email").eq("tenant_id", tenantId).eq("id", contactId).maybeSingle();
  return (data?.name as string) || (data?.phone as string) || (data?.email as string) || "Unknown";
}

// ── threads + messages ───────────────────────────────────────────────────────

/** Find an open thread for (contact, channel), or create one. Returns conversationId|null. */
export async function findOrCreateThread(
  tenantId: string,
  opts: { contactId: string | null; channel: Channel; title?: string; externalId?: string },
): Promise<string | null> {
  const sb = svc();
  if (opts.contactId) {
    const { data: existing, error } = await sb
      .from("tenant_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("contact_id", opts.contactId)
      .eq("channel", opts.channel)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && missingTable(error.message)) return null;
    if (existing?.id) return existing.id;
  }
  // Social channels (FB/IG/WhatsApp) key the thread by external_id (account:peer) since the
  // sender may not map to a CRM contact.
  if (opts.externalId) {
    const { data: byExt, error } = await sb
      .from("tenant_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("channel", opts.channel)
      .eq("external_id", opts.externalId)
      .limit(1)
      .maybeSingle();
    if (error && missingTable(error.message)) return null;
    if (byExt?.id) return byExt.id;
  }
  const { data: created, error } = await sb
    .from("tenant_conversations")
    .insert({
      tenant_id: tenantId,
      contact_id: opts.contactId,
      channel: opts.channel,
      title: opts.title ?? null,
      external_id: opts.externalId ?? null,
    })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id;
}

/** Insert a message and bump the thread (last_message_at, preview, unread on inbound). */
export async function recordMessage(
  tenantId: string,
  m: {
    conversationId: string;
    channel: Channel;
    direction: Direction;
    senderType: SenderType;
    senderName?: string;
    body: string;
    subject?: string;
    externalMessageId?: string;
    status?: string;
    error?: string;
  },
): Promise<{ ok: boolean }> {
  const sb = svc();
  const { error } = await sb.from("tenant_messages").insert({
    tenant_id: tenantId,
    conversation_id: m.conversationId,
    channel: m.channel,
    direction: m.direction,
    sender_type: m.senderType,
    sender_name: m.senderName ?? null,
    body: m.body,
    subject: m.subject ?? null,
    external_message_id: m.externalMessageId ?? null,
    status: m.status ?? "sent",
    error: m.error ?? null,
  });
  if (error) return { ok: false };

  // Bump the thread. unread_count increments only for inbound (something for the human to read).
  const patch: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    last_preview: preview(m.body),
    updated_at: new Date().toISOString(),
  };
  if (m.direction === "inbound") {
    const { data: cur } = await sb.from("tenant_conversations").select("unread_count").eq("id", m.conversationId).maybeSingle();
    patch.unread_count = ((cur?.unread_count as number) ?? 0) + 1;
    patch.status = "open";
  }
  await sb.from("tenant_conversations").update(patch).eq("tenant_id", tenantId).eq("id", m.conversationId);
  return { ok: true };
}

// STOP / opt-out handling (D-318) — carrier compliance for SMS campaigns.
const STOP_RE = /^\s*(stop|stopall|unsubscribe|cancel|end|quit)\b/i;
export function isStopKeyword(body: string): boolean { return STOP_RE.test(body || ""); }

/** Mark a phone's contact opted-out: dnd=true + an 'Unsubscribed' tag (both exclude it from
 *  every campaign audience). Best-effort; finds or creates the contact. */
export async function optOutContactByPhone(tenantId: string, phone: string): Promise<void> {
  const { contactId } = await findOrCreateContactByPhone(tenantId, phone);
  if (!contactId) return;
  const sb = svc();
  const { data } = await sb.from("tenant_contacts").select("tags").eq("tenant_id", tenantId).eq("id", contactId).maybeSingle();
  const tags: string[] = Array.isArray(data?.tags) ? data.tags : [];
  if (!tags.map((t) => String(t).toLowerCase()).includes("unsubscribed")) tags.push("Unsubscribed");
  await sb.from("tenant_contacts").update({ dnd: true, tags, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", contactId);
}

/** High-level: ingest one inbound SMS. Returns the conversationId (or null if not stored). */
export async function ingestInboundSms(
  tenantId: string,
  sms: { from: string; to: string; body: string; messageSid?: string },
): Promise<string | null> {
  const { contactId, contactName: name } = await findOrCreateContactByPhone(tenantId, sms.from);
  const convoId = await findOrCreateThread(tenantId, {
    contactId,
    channel: "sms",
    title: `SMS with ${name}`,
    externalId: normalizePhone(sms.from),
  });
  if (!convoId) return null;
  await recordMessage(tenantId, {
    conversationId: convoId,
    channel: "sms",
    direction: "inbound",
    senderType: "contact",
    senderName: name,
    body: sms.body,
    externalMessageId: sms.messageSid,
  });
  return convoId;
}

/**
 * High-level: ingest one inbound Meta message (Messenger / IG DM / WhatsApp). Thread is keyed by
 * `${accountExternalId}:${peerId}` (so outbound reply can resolve the Page/phone token + recipient).
 * WhatsApp peers map to a CRM contact by phone; FB/IG peers (PSIDs) get a lightweight contact.
 */
export async function ingestInboundMeta(
  tenantId: string,
  msg: { channel: "facebook" | "instagram" | "whatsapp"; accountExternalId: string; peerId: string; peerName?: string; body: string; externalMessageId?: string },
): Promise<string | null> {
  const externalId = `${msg.accountExternalId}:${msg.peerId}`;
  let contactId: string | null = null;
  let name = msg.peerName || (msg.channel === "whatsapp" ? msg.peerId : `${msg.channel} user`);
  if (msg.channel === "whatsapp") {
    const r = await findOrCreateContactByPhone(tenantId, msg.peerId, msg.peerName);
    contactId = r.contactId; name = r.contactName;
  }
  const label = msg.channel.charAt(0).toUpperCase() + msg.channel.slice(1);
  const convoId = await findOrCreateThread(tenantId, { contactId, channel: msg.channel, title: `${label} with ${name}`, externalId });
  if (!convoId) return null;
  await recordMessage(tenantId, {
    conversationId: convoId, channel: msg.channel, direction: "inbound", senderType: "contact",
    senderName: name, body: msg.body, externalMessageId: msg.externalMessageId,
  });
  return convoId;
}

export async function listThreads(
  tenantId: string,
  opts: { channel?: Channel; status?: string; limit?: number } = {},
): Promise<ThreadSummary[]> {
  const sb = svc();
  let q = sb
    .from("tenant_conversations")
    .select("id, contact_id, channel, status, unread_count, last_message_at, last_preview")
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.channel) q = q.eq("channel", opts.channel);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error || !data) return [];
  // Resolve contact names in one batch.
  const ids = Array.from(new Set(data.map((r: any) => r.contact_id).filter(Boolean)));
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: cs } = await sb.from("tenant_contacts").select("id, name, phone, email").eq("tenant_id", tenantId).in("id", ids);
    (cs ?? []).forEach((c: any) => names.set(c.id, c.name || c.phone || c.email || "Unknown"));
  }
  return data.map((r: any) => ({
    id: r.id,
    contactId: r.contact_id,
    contactName: r.contact_id ? names.get(r.contact_id) ?? "Unknown" : "Unknown",
    channel: r.channel,
    status: r.status,
    unreadCount: r.unread_count ?? 0,
    lastMessageAt: r.last_message_at,
    lastPreview: r.last_preview ?? "",
  }));
}

export async function listThreadsForContact(tenantId: string, contactId: string): Promise<ThreadSummary[]> {
  const sb = svc();
  const { data, error } = await sb
    .from("tenant_conversations")
    .select("id, contact_id, channel, status, unread_count, last_message_at, last_preview")
    .eq("tenant_id", tenantId)
    .eq("contact_id", contactId)
    .order("last_message_at", { ascending: false });
  if (error || !data) return [];
  const name = await contactName(tenantId, contactId);
  return data.map((r: any) => ({
    id: r.id, contactId: r.contact_id, contactName: name, channel: r.channel,
    status: r.status, unreadCount: r.unread_count ?? 0, lastMessageAt: r.last_message_at, lastPreview: r.last_preview ?? "",
  }));
}

export async function getThread(
  tenantId: string,
  conversationId: string,
): Promise<{ thread: ThreadSummary; messages: ConvMessage[] } | null> {
  const sb = svc();
  const { data: t, error } = await sb
    .from("tenant_conversations")
    .select("id, contact_id, channel, status, unread_count, last_message_at, last_preview")
    .eq("tenant_id", tenantId)
    .eq("id", conversationId)
    .maybeSingle();
  if (error || !t) return null;
  const { data: msgs } = await sb
    .from("tenant_messages")
    .select("id, channel, direction, sender_type, sender_name, body, subject, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const name = await contactName(tenantId, t.contact_id);
  return {
    thread: {
      id: t.id, contactId: t.contact_id, contactName: name, channel: t.channel,
      status: t.status, unreadCount: t.unread_count ?? 0, lastMessageAt: t.last_message_at, lastPreview: t.last_preview ?? "",
    },
    messages: (msgs ?? []).map((r: any) => ({
      id: r.id, channel: r.channel, direction: r.direction, senderType: r.sender_type,
      senderName: r.sender_name, body: r.body, subject: r.subject, status: r.status, createdAt: r.created_at,
    })),
  };
}

export async function markThreadRead(tenantId: string, conversationId: string): Promise<void> {
  await svc().from("tenant_conversations").update({ unread_count: 0 }).eq("tenant_id", tenantId).eq("id", conversationId);
}

async function contactComms(tenantId: string, contactId: string | null): Promise<{ phone: string; email: string; name: string }> {
  if (!contactId) return { phone: "", email: "", name: "Unknown" };
  const { data } = await svc().from("tenant_contacts").select("name, phone, email").eq("tenant_id", tenantId).eq("id", contactId).maybeSingle();
  return { phone: data?.phone ?? "", email: data?.email ?? "", name: data?.name ?? "" };
}

/**
 * Send a 1:1 reply on a thread's channel and record it (D-299 — bypasses the marketing
 * send-gate; still requires a verified sender / connected Twilio). senderName = the human
 * replying. Returns ok/error so the UI can surface a failed send.
 */
export async function replyToThread(
  tenantId: string,
  conversationId: string,
  body: string,
  senderName: string,
): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  const thread = await getThread(tenantId, conversationId);
  if (!thread) return { ok: false, error: "Conversation not found." };
  const { channel, contactId } = thread.thread;
  const comms = await contactComms(tenantId, contactId);

  if (channel === "sms") {
    if (!isE164(comms.phone)) return { ok: false, error: "No valid phone number on this contact." };
    const res = await sendSms(tenantId, { to: comms.phone, body: text });
    await recordMessage(tenantId, {
      conversationId, channel: "sms", direction: "outbound", senderType: "platform_user",
      senderName, body: text, externalMessageId: res.sid, status: res.ok ? "sent" : "failed", error: res.error,
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }

  if (channel === "email") {
    if (!comms.email) return { ok: false, error: "No email on this contact." };
    const res = await sendEmail(tenantId, { to: comms.email, subject: `Re: your message`, html: `<p>${escapeHtml(text)}</p>`, footer: "appointment" });
    await recordMessage(tenantId, {
      conversationId, channel: "email", direction: "outbound", senderType: "platform_user",
      senderName, body: text, externalMessageId: res.id, status: res.ok ? "sent" : "failed", error: res.error,
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }

  if (META_CHANNELS.includes(channel)) {
    const { data } = await svc().from("tenant_conversations").select("external_id").eq("tenant_id", tenantId).eq("id", conversationId).maybeSingle();
    const ext = String(data?.external_id ?? "");
    const sep = ext.indexOf(":");
    if (sep < 0) return { ok: false, error: "Can't resolve this conversation's destination." };
    const accountExternalId = ext.slice(0, sep), peerId = ext.slice(sep + 1);
    const res = await sendMetaMessage(channel as "facebook" | "instagram" | "whatsapp", accountExternalId, peerId, text);
    await recordMessage(tenantId, {
      conversationId, channel, direction: "outbound", senderType: "platform_user",
      senderName, body: text, status: res.ok ? "sent" : "failed", error: res.error,
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }

  // webchat: visitor isn't connected out-of-band; live reply deferred (MVP).
  return { ok: false, error: "Live web-chat replies aren't available yet — reach this contact by SMS or email." };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
}

/** Total unread across the tenant (for the nav badge). */
export async function unreadTotal(tenantId: string): Promise<number> {
  const { data, error } = await svc().from("tenant_conversations").select("unread_count").eq("tenant_id", tenantId);
  if (error || !data) return 0;
  return data.reduce((s: number, r: any) => s + (r.unread_count ?? 0), 0);
}
