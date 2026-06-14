"use server";

import { headers, cookies } from "next/headers";
import { findPortalContact, issuePortalToken } from "@/lib/server/portal";
import { sendEmail, emailReady } from "@/lib/server/email-send";

/** Client Portal auth actions (D-348). Customer-facing — no staff session involved. */

const GENERIC = "If that email is on file, we've sent you a secure sign-in link. Check your inbox.";

export async function requestPortalLink(tenantId: string, email: string): Promise<{ ok: boolean; message: string }> {
  const ready = await emailReady(tenantId);
  if (!ready.ok) return { ok: false, message: "This business hasn't enabled portal sign-in by email yet. Please reach out to them directly." };
  const contact = await findPortalContact(tenantId, email);
  if (!contact) return { ok: true, message: GENERIC }; // never reveal whether the email exists
  const token = issuePortalToken(tenantId, contact.id, contact.email);
  if (!token) return { ok: false, message: "Portal sign-in isn't available right now." };

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "app.aibizconnect.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const link = `${proto}://${host}/portal/${tenantId}/access?token=${token}`;
  const html = `<p>Hi ${contact.name},</p><p>Use the secure link below to access your account portal. It's private to you — please don't forward it.</p><p style="margin:20px 0"><a href="${link}" style="background:#1e3a8a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Sign in to your portal</a></p><p style="font-size:12px;color:#94a3b8">If you didn't request this, you can ignore this email.</p>`;
  await sendEmail(tenantId, { to: contact.email, subject: "Your secure sign-in link", html, footer: "none" });
  return { ok: true, message: GENERIC };
}

export async function logoutPortal(_tenantId: string): Promise<void> {
  const store = await cookies();
  store.delete({ name: "abizportal", path: "/" } as { name: string; path: string });
}
