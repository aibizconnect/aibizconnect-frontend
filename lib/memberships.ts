import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Memberships — reimagined as a clean "Courses & Member Hub" (better than the leading builder's noisy
 * community): AI-generated course outlines + lessons, a polished public viewer, drafts +
 * publish gate. Members are sourced from Contacts (no separate forum). Data-only.
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface Lesson { id: string; title: string; body: string; order: number; }
export interface Course {
  id: string; title: string; description: string; status: "draft" | "published"; lessons: Lesson[];
  priceCents: number; currency: string; coverImageUrl: string | null;
}
function rowToCourse(c: any, lessons: Lesson[]): Course {
  return { id: c.id, title: c.title, description: c.description ?? "", status: c.status, lessons, priceCents: Number(c.price_cents) || 0, currency: c.currency ?? "USD", coverImageUrl: c.cover_image_url ?? null };
}

export async function listCourses(tenantId: string, opts?: { publishedOnly?: boolean }): Promise<Course[]> {
  const sb = service();
  let q = sb.from("tenant_courses").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (opts?.publishedOnly) q = q.eq("status", "published");
  const { data } = await q;
  const courses = data ?? [];
  const out: Course[] = [];
  for (const c of courses) out.push(rowToCourse(c, await listLessons(tenantId, c.id)));
  return out;
}

export async function getCourse(tenantId: string, id: string): Promise<Course | null> {
  const { data } = await service().from("tenant_courses").select("*").eq("tenant_id", tenantId).eq("id", id).single();
  if (!data) return null;
  return rowToCourse(data, await listLessons(tenantId, id));
}

/** Update a course's offer/details (title, description, price, currency, cover). Pre-0068 cols fall back. */
export async function updateCourse(tenantId: string, id: string, patch: { title?: string; description?: string; priceCents?: number; currency?: string; coverImageUrl?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const core: Record<string, unknown> = {};
  if (patch.title !== undefined) core.title = patch.title;
  if (patch.description !== undefined) core.description = patch.description;
  const ext: Record<string, unknown> = { ...core };
  if (patch.priceCents !== undefined) ext.price_cents = Math.max(0, Math.round(patch.priceCents));
  if (patch.currency !== undefined) ext.currency = patch.currency;
  if (patch.coverImageUrl !== undefined) ext.cover_image_url = patch.coverImageUrl;
  const miss = (m?: string) => !!m && /column .* does not exist|could not find|schema cache/i.test(m);
  let { error } = await service().from("tenant_courses").update(ext).eq("tenant_id", tenantId).eq("id", id);
  if (error && miss(error.message) && Object.keys(core).length) ({ error } = await service().from("tenant_courses").update(core).eq("tenant_id", tenantId).eq("id", id));
  return { ok: !error, error: error?.message };
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

// ── Enrollments + paid access (D-349) ────────────────────────────────────────
export interface Enrollment { id: string; courseId: string; contactId: string | null; email: string; status: string; source: string | null; createdAt: string }
const lc = (s: string) => (s || "").trim().toLowerCase();

export async function isEnrolled(tenantId: string, courseId: string, email: string): Promise<boolean> {
  if (!email) return false;
  const { data } = await service().from("tenant_course_enrollments").select("status").eq("tenant_id", tenantId).eq("course_id", courseId).eq("email", lc(email)).maybeSingle();
  return !!data && data.status !== "revoked";
}
export async function enrollContact(tenantId: string, courseId: string, input: { email: string; contactId?: string | null; source?: string }): Promise<{ ok: boolean; error?: string }> {
  const email = lc(input.email);
  if (!email) return { ok: false, error: "An email is required to enroll." };
  let contactId = input.contactId ?? null;
  if (!contactId) {
    const { data: c } = await service().from("tenant_contacts").select("id").eq("tenant_id", tenantId).ilike("email", email).limit(1).maybeSingle();
    contactId = c?.id ?? null;
  }
  const { error } = await service().from("tenant_course_enrollments").upsert(
    { tenant_id: tenantId, course_id: courseId, email, contact_id: contactId, status: "active", source: input.source ?? "manual" },
    { onConflict: "tenant_id,course_id,email" },
  );
  return { ok: !error, error: error?.message };
}
export async function listEnrollments(tenantId: string, courseId: string): Promise<Enrollment[]> {
  const { data } = await service().from("tenant_course_enrollments").select("*").eq("tenant_id", tenantId).eq("course_id", courseId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ id: r.id, courseId: r.course_id, contactId: r.contact_id ?? null, email: r.email, status: r.status, source: r.source ?? null, createdAt: r.created_at }));
}
export async function removeEnrollment(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_course_enrollments").delete().eq("tenant_id", tenantId).eq("id", id);
}
/** Published courses a customer is enrolled in (for the portal). */
export async function listEnrolledCourses(tenantId: string, email: string): Promise<{ id: string; title: string; coverImageUrl: string | null }[]> {
  if (!email) return [];
  const { data } = await service().from("tenant_course_enrollments").select("course_id").eq("tenant_id", tenantId).eq("email", lc(email)).neq("status", "revoked");
  const ids = Array.from(new Set((data ?? []).map((r: any) => r.course_id)));
  if (!ids.length) return [];
  const { data: cs } = await service().from("tenant_courses").select("id,title,cover_image_url,status").eq("tenant_id", tenantId).in("id", ids);
  return (cs ?? []).filter((c: any) => c.status === "published").map((c: any) => ({ id: c.id, title: c.title, coverImageUrl: c.cover_image_url ?? null }));
}

function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}

/** Begin a paid-course purchase: a Stripe Checkout session whose success returns to the verify route. */
export async function startCoursePurchase(tenantId: string, courseId: string, buyer: { email: string; contactId?: string | null }): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { getStripeCreds, stripeReady } = await import("@/lib/server/payments");
  if (!(await stripeReady(tenantId))) return { ok: false, error: "This business hasn't enabled online payment yet." };
  const course = await getCourse(tenantId, courseId);
  if (!course) return { ok: false, error: "Course not found." };
  if (course.priceCents <= 0) return { ok: false, error: "This course is free — just enroll." };
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };
  const email = lc(buyer.email);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${appBase()}/learn/${tenantId}/${courseId}/success?cs={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appBase()}/learn/${tenantId}/${courseId}`);
  if (email) params.set("customer_email", email);
  params.set("client_reference_id", `${courseId}:${email}`);
  params.set("metadata[course_id]", courseId);
  params.set("metadata[email]", email);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (course.currency || "USD").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(course.priceCents));
  params.set("line_items[0][price_data][product_data][name]", course.title);
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${creds.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) return { ok: false, error: json?.error?.message || `Stripe ${res.status}` };
    return { ok: true, url: json.url };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Stripe request failed." }; }
}

/** Verify a returned Checkout session is paid, then enroll the buyer. Idempotent. */
export async function confirmCoursePurchase(tenantId: string, courseId: string, checkoutSessionId: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  const { getStripeCreds } = await import("@/lib/server/payments");
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`, { headers: { Authorization: `Bearer ${creds.secret_key}` } });
    const s: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: s?.error?.message || `Stripe ${res.status}` };
    const paid = s?.payment_status === "paid" || s?.status === "complete";
    const email = lc(s?.metadata?.email || s?.customer_details?.email || s?.customer_email || "");
    if (!paid) return { ok: false, error: "Payment not completed." };
    if (s?.metadata?.course_id && s.metadata.course_id !== courseId) return { ok: false, error: "Session/course mismatch." };
    if (!email) return { ok: false, error: "No email on the payment." };
    await enrollContact(tenantId, courseId, { email, source: "purchase" });
    return { ok: true, email };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Verification failed." }; }
}
