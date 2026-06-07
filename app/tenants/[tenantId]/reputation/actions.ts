"use server";

import { listReviews, setReviewStatus, deleteReview, type Review } from "@/lib/reputation";

export async function listReviewsAction(tenantId: string): Promise<Review[]> { return listReviews(tenantId); }

export async function setReviewStatusAction(tenantId: string, id: string, status: "published" | "hidden"): Promise<Review[]> {
  await setReviewStatus(tenantId, id, status);
  return listReviews(tenantId);
}

export async function deleteReviewAction(tenantId: string, id: string): Promise<Review[]> {
  await deleteReview(tenantId, id);
  return listReviews(tenantId);
}
