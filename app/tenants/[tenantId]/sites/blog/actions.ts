"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  listPosts, getPost, createPost, updatePost, setPostStatus, deletePost, draftPost,
  type BlogPost, type BlogPostSummary, type BlogPatch, type BlogStatus,
} from "@/lib/server/blog";

/** Blog admin actions (D-345). Auth-gated; drafts stay private until published. */

export async function listPostsAction(tenantId: string): Promise<BlogPostSummary[]> {
  await requireTenantAccess(tenantId);
  try { return await listPosts(tenantId); } catch { return []; }
}
export async function getPostAction(tenantId: string, id: string): Promise<BlogPost | null> {
  await requireTenantAccess(tenantId);
  return getPost(tenantId, id);
}
export async function createPostAction(tenantId: string, title?: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return createPost(tenantId, { title });
}
export async function updatePostAction(tenantId: string, id: string, patch: BlogPatch): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return updatePost(tenantId, id, patch);
}
export async function setPostStatusAction(tenantId: string, id: string, status: BlogStatus): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return setPostStatus(tenantId, id, status);
}
export async function deletePostAction(tenantId: string, id: string): Promise<{ ok: boolean }> {
  await requireTenantAccess(tenantId);
  await deletePost(tenantId, id);
  return { ok: true };
}
export async function draftPostAction(tenantId: string, brief: string): Promise<{ ok: boolean; draft?: { title: string; excerpt: string; body: string; seoTitle: string; seoDescription: string; tags: string[] }; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!brief.trim()) return { ok: false, message: "Tell the AI what to write about." };
  const d = await draftPost(tenantId, brief.trim());
  return d ? { ok: true, draft: d } : { ok: false, message: "The AI couldn't draft this — try rephrasing." };
}
