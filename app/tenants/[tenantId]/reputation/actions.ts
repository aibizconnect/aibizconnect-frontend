"use server";

import { listReviews, setReviewStatus, deleteReview, type Review } from "@/lib/reputation";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { sendReviewRequest, listReviewRequests, type ReviewRequest } from "@/lib/server/review-requests";
import { listContacts } from "@/lib/crm";

export async function listReviewsAction(tenantId: string): Promise<Review[]> { return listReviews(tenantId); }

// ── Review Requests (D-322) ──────────────────────────────────────────────────
export interface ReqContact { id: string; name: string; email: string; phone: string }
export async function reputationBootstrapAction(tenantId: string): Promise<{ requests: ReviewRequest[]; contacts: ReqContact[] }> {
  await requireTenantAccess(tenantId);
  const [requests, contactsRaw] = await Promise.all([
    listReviewRequests(tenantId).catch(() => []),
    listContacts(tenantId).catch(() => []),
  ]);
  const contacts = contactsRaw.map((c) => ({ id: c.id, name: c.name || c.email || c.phone || "—", email: c.email, phone: c.phone }));
  return { requests, contacts };
}
export async function sendReviewRequestAction(tenantId: string, contactId: string, channel: "email" | "sms"): Promise<{ ok: boolean; error?: string; requests: ReviewRequest[] }> {
  await requireTenantAccess(tenantId);
  const r = await sendReviewRequest(tenantId, contactId, channel);
  return { ...r, requests: await listReviewRequests(tenantId) };
}

export async function setReviewStatusAction(tenantId: string, id: string, status: "published" | "hidden"): Promise<Review[]> {
  await setReviewStatus(tenantId, id, status);
  return listReviews(tenantId);
}

export async function deleteReviewAction(tenantId: string, id: string): Promise<Review[]> {
  await deleteReview(tenantId, id);
  return listReviews(tenantId);
}
