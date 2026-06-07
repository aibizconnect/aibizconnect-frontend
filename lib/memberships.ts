import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Memberships — reimagined as a clean "Courses & Member Hub" (better than GHL's noisy
 * community): AI-generated course outlines + lessons, a polished public viewer, drafts +
 * publish gate. Members are sourced from Contacts (no separate forum). Data-only.
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface Lesson { id: string; title: string; body: string; order: number; }
export interface Course { id: string; title: string; description: string; status: "draft" | "published"; lessons: Lesson[]; }

export async function listCourses(tenantId: string, opts?: { publishedOnly?: boolean }): Promise<Course[]> {
  const sb = service();
  let q = sb.from("tenant_courses").select("id,title,description,status").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (opts?.publishedOnly) q = q.eq("status", "published");
  const { data } = await q;
  const courses = data ?? [];
  const out: Course[] = [];
  for (const c of courses) out.push({ id: c.id, title: c.title, description: c.description ?? "", status: c.status, lessons: await listLessons(tenantId, c.id) });
  return out;
}

export async function getCourse(tenantId: string, id: string): Promise<Course | null> {
  const { data } = await service().from("tenant_courses").select("id,title,description,status").eq("tenant_id", tenantId).eq("id", id).single();
  if (!data) return null;
  return { id: data.id, title: data.title, description: data.description ?? "", status: data.status, lessons: await listLessons(tenantId, id) };
}

export async function listLessons(tenantId: string, courseId: string): Promise<Lesson[]> {
  const { data } = await service().from("tenant_lessons").select("id,title,body,order_index").eq("tenant_id", tenantId).eq("course_id", courseId).order("order_index");
  return (data ?? []).map((r: any) => ({ id: r.id, title: r.title, body: r.body ?? "", order: r.order_index }));
}

export async function createCourse(tenantId: string, title: string, description = ""): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await service().from("tenant_courses").insert({ tenant_id: tenantId, title: title.trim() || "New Course", description }).select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}
export async function setCourseStatus(tenantId: string, id: string, status: "draft" | "published"): Promise<void> {
  await service().from("tenant_courses").update({ status }).eq("tenant_id", tenantId).eq("id", id);
}
export async function deleteCourse(tenantId: string, id: string): Promise<void> {
  const sb = service();
  await sb.from("tenant_lessons").delete().eq("tenant_id", tenantId).eq("course_id", id);
  await sb.from("tenant_courses").delete().eq("tenant_id", tenantId).eq("id", id);
}

export async function addLesson(tenantId: string, courseId: string, title: string, body = ""): Promise<void> {
  const sb = service();
  const { count } = await sb.from("tenant_lessons").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("course_id", courseId);
  await sb.from("tenant_lessons").insert({ tenant_id: tenantId, course_id: courseId, title: title.trim() || "New lesson", body, order_index: count ?? 0 });
}
export async function updateLesson(tenantId: string, id: string, patch: { title?: string; body?: string }): Promise<void> {
  await service().from("tenant_lessons").update(patch).eq("tenant_id", tenantId).eq("id", id);
}
export async function deleteLesson(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_lessons").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** AI/template course generation — drafts a complete course outline in one shot. */
export async function generateCourse(tenantId: string, topic: string): Promise<{ ok: boolean; id?: string }> {
  const sb = service();
  const t = (topic || "").trim() || "Getting Started";
  const { data: c, error } = await sb.from("tenant_courses").insert({
    tenant_id: tenantId, status: "draft",
    title: `${t}: The Complete Course`,
    description: `A step-by-step program that takes you from beginner to confident in ${t}.`,
  }).select("id").single();
  if (error) return { ok: false };
  const lessons: { title: string; body: string }[] = [
    { title: `Welcome — what you'll achieve`, body: `In this course you'll master ${t} through practical, bite-sized lessons. Here's the roadmap and how to get the most out of it.` },
    { title: `The foundations of ${t}`, body: `Core concepts, the vocabulary, and the mental model you need before going hands-on.` },
    { title: `Your first hands-on win`, body: `A guided, do-it-with-me exercise so you get a real result in this lesson.` },
    { title: `Going deeper: strategies that work`, body: `Proven approaches, common pitfalls to avoid, and how the pros think about ${t}.` },
    { title: `Putting it all together`, body: `Combine everything into a repeatable workflow you can use again and again.` },
    { title: `Next steps & resources`, body: `Where to go from here, plus a checklist to keep you on track.` },
  ];
  for (let i = 0; i < lessons.length; i++) await sb.from("tenant_lessons").insert({ tenant_id: tenantId, course_id: c.id, title: lessons[i].title, body: lessons[i].body, order_index: i });
  return { ok: true, id: c.id };
}
