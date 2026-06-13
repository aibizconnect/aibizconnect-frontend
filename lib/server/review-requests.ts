import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/server/email-send";
import { sendSms, twilioReady, isE164 } from "@/lib/server/twilio";
import { normalizePhone } from "@/lib/server/conversations";

/**
 * Review Requests (D-322) — a tenant asks a contact for a review via email or SMS. 1:1, human-
 * initiated (bypasses the marketing gate, requires a verified sender / connected Twilio).
 * Compliance: DND + Unsubscribed contacts are skipped. Logged to tenant_review_requests.
 */

export interface ReviewRequest { id: string; contactId: string | null; contactName: string; channel: "email" | "sms"; status: string; reviewPageUrl: string; error: string | null; sentAt: string; }
const svc = () => createSupabaseServiceClient();
const missingTable = (m?: string) => /relation .* does not exist|Could not find the table/i.test(m ?? "");
const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

function reviewUrl(tenantId: string): string { return `${APP_BASE}/review/${tenantId}`; }

async function businessName(tenantId: string): Promise<string> {
  const { data } = await svc().from("tenant_settings").select("setting_value").eq("tenant_id", tenantId).eq("setting_key", "business_name").maybeSingle();
  return String(data?.setting_value ?? "us");
}

/** Send a review request to one contact. Returns ok/error; logs the attempt. */
export async function sendReviewRequest(tenantId: string, contactId: string, channel: "email" | "sms"): Promise<{ ok: boolean; error?: string }> {
  const { data: c } = await svc().from("tenant_contacts").select("name, email, phone, tags, dnd").eq("tenant_id", tenantId).eq("id", contactId).maybeSingle();
  if (!c) return { ok: false, error: "Contact not found." };
  const tags: string[] = (Array.isArray(c.tags) ? c.tags : []).map((t: string) => String(t).toLowerCase());
  if (c.dnd || tags.includes("unsubscribed") || tags.includes("do not contact")) return { ok: false, error: "This contact has opted out (DND / Unsubscribed)." };

  const url = reviewUrl(tenantId);
  const biz = await businessName(tenantId);
  const name = (c.name as string)?.split(/\s+/)[0] || "there";
  let res: { ok: boolean; error?: string };

  if (channel === "email") {
    if (!c.email) return { ok: false, error: "This contact has no email." };
    const html = `<p>Hi ${escapeHtml(name)},</p><p>Thanks for choosing ${escapeHtml(biz)}! Would you take a moment to share your experience? It really helps.</p><p style="margin:18px 0"><a href="${url}" style="background:#1e3a8a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Leave a review</a></p>`;
    res = await sendEmail(tenantId, { to: c.email, subject: `How was your experience with ${biz}?`, html, footer: "appointment" });
  } else {
    if (!(await twilioReady(tenantId))) return { ok: false, error: "Connect Twilio in Settings first." };
    const phone = normalizePhone(c.phone ?? "");
    if (!isE164(phone)) return { ok: false, error: "This contact has no valid phone number." };
    res = await sendSms(tenantId, { to: phone, body: `Hi ${name}, thanks for choosing ${biz}! Mind leaving us a quick review? ${url}` });
  }

  // Log the attempt (best-effort).
  try {
    await svc().from("tenant_review_requests").insert({ tenant_id: tenantId, contact_id: contactId, channel, status: res.ok ? "sent" : "failed", review_page_url: url, error: res.ok ? null : (res.error ?? null) });
  } catch { /* table not applied yet */ }
  return res;
}

export async function listReviewRequests(tenantId: string, limit = 100): Promise<ReviewRequest[]> {
  const { data, error } = await svc().from("tenant_review_requests").select("id, contact_id, channel, status, review_page_url, error, sent_at").eq("tenant_id", tenantId).order("sent_at", { ascending: false }).limit(limit);
  if (error) return [];
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.contact_id).filter(Boolean)));
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: cs } = await svc().from("tenant_contacts").select("id, name, email, phone").eq("tenant_id", tenantId).in("id", ids);
    (cs ?? []).forEach((c: any) => names.set(c.id, c.name || c.email || c.phone || "—"));
  }
  return (data ?? []).map((r: any) => ({ id: r.id, contactId: r.contact_id, contactName: r.contact_id ? (names.get(r.contact_id) ?? "—") : "—", channel: r.channel, status: r.status, reviewPageUrl: r.review_page_url, error: r.error ?? null, sentAt: r.sent_at }));
}

function escapeHtml(s: string): string { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
