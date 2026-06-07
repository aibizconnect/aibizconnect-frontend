"use server";

import { listCourses, getCourse, createCourse, setCourseStatus, deleteCourse, addLesson, updateLesson, deleteLesson, generateCourse, type Course } from "@/lib/memberships";

export async function listCoursesAction(tenantId: string): Promise<Course[]> { return listCourses(tenantId); }

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
