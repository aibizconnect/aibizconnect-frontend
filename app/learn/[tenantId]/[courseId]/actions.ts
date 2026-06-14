"use server";

import { cookies } from "next/headers";
import { readPortalToken } from "@/lib/server/portal";
import { startCoursePurchase, enrollContact, getCourse } from "@/lib/memberships";

/**
 * Customer-facing course actions (D-349). Identity comes from the Client Portal session cookie
 * (NOT a staff session). Free courses self-enroll; paid courses start a Stripe Checkout.
 */
async function sessionEmail(tenantId: string): Promise<{ contactId: string; email: string } | null> {
  const token = (await cookies()).get("abizportal")?.value;
  return token ? readPortalToken(token, tenantId) : null;
}

export async function buyCourse(tenantId: string, courseId: string): Promise<{ ok: boolean; url?: string; needLogin?: boolean; error?: string }> {
  const s = await sessionEmail(tenantId);
  if (!s) return { ok: false, needLogin: true };
  const r = await startCoursePurchase(tenantId, courseId, { email: s.email, contactId: s.contactId });
  return { ok: r.ok, url: r.url, error: r.error };
}

export async function enrollFree(tenantId: string, courseId: string): Promise<{ ok: boolean; needLogin?: boolean; error?: string }> {
  const s = await sessionEmail(tenantId);
  if (!s) return { ok: false, needLogin: true };
  const course = await getCourse(tenantId, courseId);
  if (!course) return { ok: false, error: "Course not found." };
  if (course.priceCents > 0) return { ok: false, error: "This course requires payment." };
  const r = await enrollContact(tenantId, courseId, { email: s.email, contactId: s.contactId, source: "free" });
  return { ok: r.ok, error: r.error };
}
