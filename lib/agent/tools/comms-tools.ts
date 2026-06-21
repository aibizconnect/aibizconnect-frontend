import { z } from "zod";
import { sendEmail } from "@/lib/server/email-send";
import { sendSms } from "@/lib/server/twilio";

/**
 * COMMS tools for AI agents (D-275): email via the tenant's verified Resend identity,
 * SMS via the tenant's connected Twilio. Both are WRITE tools (live-gated upstream,
 * never in the public toolset — spam-vector). Honest errors until the channel is
 * configured ("Email sending isn't set up yet…") so agents explain instead of failing.
 */

type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const audit = async (tenantId: string, op: string, meta: Record<string, unknown>) => {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: `agent.comms.${op}`, actorEmail: null, meta: { tenantId, ...meta } });
  } catch { /* best effort */ }
};

// ── email.send ───────────────────────────────────────────────────────────────
const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(2).max(160),
  body: z.string().min(2).max(8000),
});

export async function toolSendEmail(tenantId: string, raw: unknown): Promise<ToolResult<{ sent: true }>> {
  const p = emailSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  const html = p.data.body
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 12px">${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  // Agent acts on behalf of the workspace → wrap in the workspace email branding (D-397). null =
  // workspace defaults (header/signature/social/footer + default From).
  const r = await sendEmail(tenantId, { to: p.data.to, subject: p.data.subject, html, footer: "setup", actingUserKey: null });
  if (!r.ok) return fail(r.error === "no Resend key" || /identity|verified|sender/i.test(r.error ?? "")
    ? "Email sending isn't set up yet — add a verified sender in Sites → your website → Settings → Email sending."
    : r.error ?? "Could not send the email.");
  await audit(tenantId, "email", { to: p.data.to, subject: p.data.subject.slice(0, 80) });
  return { ok: true, data: { sent: true } };
}

// ── sms.send ─────────────────────────────────────────────────────────────────
const smsSchema = z.object({
  to: z.string().regex(/^\+?[\d\s().-]{7,}$/, "Phone number looks invalid."),
  body: z.string().min(2).max(900),
});

export async function toolSendSms(tenantId: string, raw: unknown): Promise<ToolResult<{ sent: true }>> {
  const p = smsSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  const to = p.data.to.replace(/[\s().-]/g, "");
  const r = await sendSms(tenantId, { to: to.startsWith("+") ? to : `+1${to}`, body: p.data.body });
  if (!r.ok) return fail(r.error ?? "Could not send the SMS.");
  await audit(tenantId, "sms", { to: to.slice(0, 6) + "…" });
  return { ok: true, data: { sent: true } };
}

export const COMMS_TOOL_MANIFEST = [
  { name: "email.send", description: "Send an email from the business to one recipient (uses the business's verified sender). Plain text body; paragraphs separated by blank lines.", params: { to: "email", subject: "", body: "" } },
  { name: "sms.send", description: "Text one recipient from the business's SMS number.", params: { to: "phone (E.164 preferred)", body: "≤900 chars" } },
] as const;
