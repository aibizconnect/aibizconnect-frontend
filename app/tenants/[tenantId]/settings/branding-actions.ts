"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { getCurrentUserEmail, isPlatformStaff } from "@/lib/auth/platform-admin";
import { tenantRole } from "@/lib/server/tenant-team";
import { emailReady, sendEmail } from "@/lib/server/email-send";
import {
  getEmailBranding, saveEmailBranding, getEmailBrandingPolicy, saveEmailBrandingPolicy,
  getMemberEmailBranding, saveMemberEmailBranding, resolveEmailBranding,
  headerHtml, signatureHtml, socialHtml,
  type EmailBranding, type EmailBrandingPolicy, type MemberEmailBranding,
} from "@/lib/server/email-branding";

/**
 * Settings → Email Branding actions (D-404). Two scopes:
 *   • Workspace defaults + per-field locks — owner / admin (or platform staff) only.
 *   • Personal identity (From, signature, and any field the workspace hasn't locked) — every member.
 */

/** A stable per-user key. Prefers the JWT user id; falls back to email; "self" in unauthenticated dev. */
async function currentUserKey(): Promise<string> {
  const uid = await getCurrentUserId().catch(() => null);
  if (uid) return uid;
  const email = await getCurrentUserEmail().catch(() => null);
  return email ? email.toLowerCase() : "self";
}

/** May this caller edit the WORKSPACE defaults + locks? */
async function canEditWorkspace(tenantId: string): Promise<boolean> {
  try { if (await isPlatformStaff()) return true; } catch { /* ignore */ }
  const email = await getCurrentUserEmail().catch(() => null);
  const role = await tenantRole(tenantId, email).catch(() => null);
  if (role === "owner" || role === "admin") return true;
  // Dev pass-through — mirrors requireTenantAccess when auth isn't enforced.
  if (process.env.AUTH_ENFORCE !== "true") return true;
  return false;
}

/** Everything the Email Branding settings screen needs in one round-trip. */
export async function getBrandingBundle(tenantId: string): Promise<{
  canEditWorkspace: boolean;
  workspace: EmailBranding;
  policy: EmailBrandingPolicy;
  member: MemberEmailBranding;
  verifiedSenderEmail: string | null;
  verifiedSenderName: string | null;
  verifiedDomain: string | null;
  myEmail: string | null;
}> {
  await requireTenantAccess(tenantId);
  const userKey = await currentUserKey();
  const [canEdit, workspace, policy, member, ready, myEmail] = await Promise.all([
    canEditWorkspace(tenantId),
    getEmailBranding(tenantId),
    getEmailBrandingPolicy(tenantId),
    getMemberEmailBranding(tenantId, userKey),
    emailReady(tenantId).catch(() => ({ ok: false } as { ok: boolean; identity?: { sender_email: string; sender_name: string } })),
    getCurrentUserEmail().catch(() => null),
  ]);
  const senderEmail = ready.ok && ready.identity ? ready.identity.sender_email : null;
  return {
    canEditWorkspace: canEdit,
    workspace,
    policy,
    member,
    verifiedSenderEmail: senderEmail,
    verifiedSenderName: ready.ok && ready.identity ? ready.identity.sender_name : null,
    verifiedDomain: senderEmail ? (senderEmail.split("@")[1] || "").toLowerCase() : null,
    myEmail,
  };
}

export async function saveWorkspaceBranding(tenantId: string, patch: Partial<EmailBranding>): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!(await canEditWorkspace(tenantId))) return { ok: false, message: "Only an owner or admin can change the workspace defaults." };
  await saveEmailBranding(tenantId, patch);
  return { ok: true };
}

export async function saveWorkspacePolicy(tenantId: string, policy: Partial<EmailBrandingPolicy>): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!(await canEditWorkspace(tenantId))) return { ok: false, message: "Only an owner or admin can lock workspace branding." };
  await saveEmailBrandingPolicy(tenantId, policy);
  return { ok: true };
}

export async function saveMyBranding(tenantId: string, patch: Partial<MemberEmailBranding>): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const userKey = await currentUserKey();
  // From-email deliverability hint (non-blocking): it must be on the verified workspace domain to send.
  if (patch.fromEmail && patch.fromEmail.trim()) {
    const ready = await emailReady(tenantId).catch(() => ({ ok: false } as any));
    if (ready.ok && ready.identity) {
      const vd = (ready.identity.sender_email.split("@")[1] || "").toLowerCase();
      const od = (patch.fromEmail.split("@")[1] || "").toLowerCase();
      if (od && od !== vd) {
        await saveMemberEmailBranding(tenantId, userKey, patch);
        return { ok: true, message: `Saved. Note: emails will send from ${ready.identity.sender_email} until your “From” address uses the verified domain @${vd}.` };
      }
    }
  }
  await saveMemberEmailBranding(tenantId, userKey, patch);
  return { ok: true };
}

const validEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/** Send a sample email to the caller showing their EFFECTIVE branding (header→body→signature→social→
 *  footer) and their effective From — proves the per-user identity end-to-end. */
export async function sendBrandingTest(tenantId: string, to: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const dest = (to || "").trim().toLowerCase();
  if (!validEmail(dest)) return { ok: false, message: "Enter a valid email address to send the test to." };
  const ready = await emailReady(tenantId);
  if (!ready.ok) return { ok: false, message: `Email isn't set up yet — ${ready.reason ?? "add a verified sender in Sites → website → Settings → Email sending."}` };

  const userKey = await currentUserKey();
  const b = await resolveEmailBranding(tenantId, userKey);
  const body = `<div><p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">This is a preview of how your outgoing emails will look. The header, signature, social links and footer below come from your Email Branding settings.</p></div>`;
  const footerBlock = b.footer.trim()
    ? `<div style="font-size:12px;line-height:1.5;color:#94a3b8;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0">${b.footer.replace(/\n/g, "<br/>")}</div>`
    : "";
  const html = `<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;padding:8px">`
    + `${headerHtml(b)}${body}${signatureHtml(b)}${socialHtml(b)}${footerBlock}</div>`;

  const r = await sendEmail(tenantId, {
    to: dest,
    subject: "Your AIBizConnect email branding — preview",
    html,
    footer: "none",
    from: { name: b.fromName, email: b.fromEmail },
  });
  return r.ok ? { ok: true, message: `Sent a preview to ${dest}.` } : { ok: false, message: r.error };
}
