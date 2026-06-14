"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  listCourses, getCourse, createCourse, updateCourse, setCourseStatus, deleteCourse,
  addLesson, updateLesson, deleteLesson, generateCourse,
  listEnrollments, enrollContact, removeEnrollment,
  type Course, type Enrollment,
} from "@/lib/memberships";

export async function listCoursesAction(tenantId: string): Promise<Course[]> { return listCourses(tenantId); }

export async function updateCourseAction(tenantId: string, id: string, patch: { title?: string; description?: string; priceCents?: number; currency?: string; coverImageUrl?: string | null }): Promise<Course | null> {
  await requireTenantAccess(tenantId);
  await updateCourse(tenantId, id, patch);
  return getCourse(tenantId, id);
}
export async function listEnrollmentsAction(tenantId: string, courseId: string): Promise<Enrollment[]> {
  await requireTenantAccess(tenantId);
  return listEnrollments(tenantId, courseId);
}
export async function enrollByEmailAction(tenantId: string, courseId: string, email: string): Promise<{ ok: boolean; error?: string; enrollments: Enrollment[] }> {
  await requireTenantAccess(tenantId);
  const r = await enrollContact(tenantId, courseId, { email, source: "manual" });
  return { ok: r.ok, error: r.error, enrollments: await listEnrollments(tenantId, courseId) };
}
export async function removeEnrollmentAction(tenantId: string, courseId: string, id: string): Promise<Enrollment[]> {
  await requireTenantAccess(tenantId);
  await removeEnrollment(tenantId, id);
  return listEnrollments(tenantId, courseId);
}

export async function createCourseAction(tenantId: string, title: string): Promise<Course[]> {
  await createCourse(tenantId, title);
  return listCourses(tenantId);
}
export async function generateCourseAction(tenantId: string, topic: string): Promise<Course[]> {
  await generateCourse(tenantId, topic);
  return listCourses(tenantId);
}
export async function setCourseStatusAction(tenantId: string, id: string, status: "draft" | "published"): Promise<Course[]> {
  await setCourseStatus(tenantId, id, status);
  return listCourses(tenantId);
}
export async function deleteCourseAction(tenantId: string, id: string): Promise<Course[]> {
  await deleteCourse(tenantId, id);
  return listCourses(tenantId);
}
export async function addLessonAction(tenantId: string, courseId: string, title: string): Promise<Course | null> {
  await addLesson(tenantId, courseId, title);
  return getCourse(tenantId, courseId);
}
export async function updateLessonAction(tenantId: string, courseId: string, id: string, patch: { title?: string; body?: string }): Promise<Course | null> {
  await updateLesson(tenantId, id, patch);
  return getCourse(tenantId, courseId);
}
export async function deleteLessonAction(tenantId: string, courseId: string, id: string): Promise<Course | null> {
  await deleteLesson(tenantId, id);
  return getCourse(tenantId, courseId);
}
