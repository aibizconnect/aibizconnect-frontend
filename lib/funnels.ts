import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Funnel Builder (converged architecture). Funnels live under Sites → Funnels; each STEP
 * is a real page (website_pages with funnel_id/funnel_step_type/funnel_order) so it
 * inherits the whole editor/critic/publish stack. Edges (website_funnel_edges) are the
 * canvas transitions. AI generation drafts a full funnel from the tenant + industry.
 *
 * SAFETY: drafts only — steps are private (is_public=false) until published per step
 * (O-3 critic gate). Checkout steps NEVER auto-charge. No DDL here; no send/spend.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export type StepType = "landing" | "optin" | "sales" | "checkout" | "upsell" | "downsell" | "thankyou";
export const STEP_TYPES: StepType[] = ["landing", "optin", "sales", "checkout", "upsell", "downsell", "thankyou"];
export const STEP_LABEL: Record<StepType, string> = {
  landing: "Landing", optin: "Opt-in", sales: "Sales", checkout: "Checkout", upsell: "Upsell", downsell: "Downsell", thankyou: "Thank you",
};

export interface FunnelStep { id: string; title: string; slug: string; stepType: StepType; order: number; isPublic: boolean; }
export interface Funnel { id: string; name: string; status: string; steps: FunnelStep[]; }

const slugify = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "step";

async function uniqueSlug(sb: SupabaseClient, tenantId: string, base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 50; i++) {
    const { data } = await sb.from("website_pages").select("id").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${slugify(base)}-${i + 2}`;
  }
  return `${slugify(base)}-x`;
}

/** On-brand starter sections per step type (design-system component content; critic-safe). */
function stepSections(type: StepType, biz: string): Array<Record<string, any>> {
  const cta = (label: string, href = "#") => ({ label, href });
  // NOTE: types/fields MUST match lib/sections/schemas.ts exactly, or the editor
  // marks them "Invalid section content" and the step can't publish.
  switch (type) {
    case "landing":
      return [
        { type: "hero", heading: `Transform your business with ${biz}`, subheading: "The offer your audience has been waiting for.", primaryCta: cta("Get started") },
        { type: "features", heading: "Why it works", features: [{ title: "Proven", description: "Results you can measure." }, { title: "Fast", description: "Up and running quickly." }, { title: "Supported", description: "We're with you the whole way." }] },
        { type: "cta", heading: "Ready to start?", cta: cta("Claim your spot") },
      ];
    case "optin":
      return [
        { type: "hero", heading: "Get the free guide", subheading: "Enter your details and we'll send it straight over." },
        { type: "contact-form", heading: "Where should we send it?", fields: [{ name: "name", label: "Name", type: "text" }, { name: "email", label: "Email", type: "email" }], submitLabel: "Send it to me" },
      ];
    case "sales":
      return [
        { type: "hero", heading: `The complete ${biz} offer`, subheading: "Everything you need to win — in one place.", primaryCta: cta("Buy now") },
        { type: "features", heading: "What's included", features: [{ title: "Core program", description: "The full system." }, { title: "Bonuses", description: "Extra wins." }, { title: "Support", description: "Help when you need it." }] },
        { type: "pricing", plans: [{ name: "Standard", price: "$497", features: [{ text: "Core program" }, { text: "Email support" }], ctaLabel: "Get Standard", ctaHref: "#" }, { name: "Premium", price: "$997", features: [{ text: "Everything" }, { text: "1:1 support" }], ctaLabel: "Get Premium", ctaHref: "#" }] },
        { type: "cta", heading: "Start today", cta: cta("Buy now") },
      ];
    case "checkout":
      return [
        { type: "hero", heading: "Complete your order", subheading: "Secure checkout. Your details are protected." },
        { type: "heading", text: "Order summary", level: "h3" },
        { type: "text", text: "Payment is processed securely. (Checkout never auto-charges until billing is connected and you approve.)" },
      ];
    case "upsell":
      return [{ type: "hero", heading: "Wait — add this and save", subheading: "A one-time offer just for you.", primaryCta: cta("Yes, add it") }, { type: "cta", heading: "Limited time", cta: cta("Add to my order") }];
    case "downsell":
      return [{ type: "hero", heading: "Prefer a lighter option?", subheading: "Get started for less.", primaryCta: cta("Yes, I'll take it") }];
    case "thankyou":
      return [{ type: "hero", heading: "🎉 Thank you!", subheading: "Your spot is confirmed. Check your email for next steps." }, { type: "cta", heading: "While you're here", cta: cta("Explore more") }];
  }
}

export async function listFunnels(tenantId: string): Promise<Funnel[]> {
  const sb = service();
  const { data: funnels } = await sb.from("website_funnels").select("id, name, status").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  const out: Funnel[] = [];
  for (const f of funnels ?? []) out.push({ id: f.id, name: f.name, status: f.status, steps: await listSteps(tenantId, f.id) });
  return out;
}

export async function listSteps(tenantId: string, funnelId: string): Promise<FunnelStep[]> {
  const sb = service();
  const { data } = await sb.from("website_pages")
    .select("id, title, slug, funnel_step_type, funnel_order, is_public")
    .eq("tenant_id", tenantId).eq("funnel_id", funnelId).order("funnel_order");
  return (data ?? []).map((r: any) => ({ id: r.id, title: r.title, slug: r.slug, stepType: r.funnel_step_type, order: r.funnel_order ?? 0, isPublic: r.is_public }));
}

export async function getFunnel(tenantId: string, funnelId: string): Promise<Funnel | null> {
  const sb = service();
  const { data: f } = await sb.from("website_funnels").select("id, name, status").eq("tenant_id", tenantId).eq("id", funnelId).single();
  if (!f) return null;
  return { id: f.id, name: f.name, status: f.status, steps: await listSteps(tenantId, funnelId) };
}

export async function createFunnel(tenantId: string, name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = service();
  const { data, error } = await sb.from("website_funnels").insert({ tenant_id: tenantId, name: name.trim() || "New funnel" }).select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function deleteFunnel(tenantId: string, funnelId: string): Promise<{ ok: boolean }> {
  const sb = service();
  const steps = await listSteps(tenantId, funnelId);
  for (const s of steps) { await sb.from("website_page_sections").delete().eq("tenant_id", tenantId).eq("page_id", s.id); }
  await sb.from("website_pages").delete().eq("tenant_id", tenantId).eq("funnel_id", funnelId);
  await sb.from("website_funnel_edges").delete().eq("tenant_id", tenantId).eq("funnel_id", funnelId);
  await sb.from("website_funnels").delete().eq("tenant_id", tenantId).eq("id", funnelId);
  return { ok: true };
}

export async function addStep(tenantId: string, funnelId: string, stepType: StepType, bizName?: string): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const steps = await listSteps(tenantId, funnelId);
  const order = steps.length;
  const biz = bizName || "Your Business";
  const title = STEP_LABEL[stepType];
  const slug = await uniqueSlug(sb, tenantId, `funnel-${title}`);
  const sections = stepSections(stepType, biz);
  const { data: row, error } = await sb.from("website_pages").insert({
    tenant_id: tenantId, title, slug, order_index: 0, is_public: false,
    funnel_id: funnelId, funnel_step_type: stepType, funnel_order: order,
    draft_title: title, draft_slug: slug, draft_seo: {}, draft_sections: sections,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  // connect from the previous step
  if (steps.length > 0) {
    await sb.from("website_funnel_edges").insert({ tenant_id: tenantId, funnel_id: funnelId, from_step: steps[steps.length - 1].id, to_step: row.id });
  }
  return { ok: true };
}

export async function deleteStep(tenantId: string, stepId: string): Promise<{ ok: boolean }> {
  const sb = service();
  await sb.from("website_page_sections").delete().eq("tenant_id", tenantId).eq("page_id", stepId);
  await sb.from("website_funnel_edges").delete().eq("tenant_id", tenantId).or(`from_step.eq.${stepId},to_step.eq.${stepId}`);
  await sb.from("website_pages").delete().eq("tenant_id", tenantId).eq("id", stepId);
  return { ok: true };
}

export async function reorderStep(tenantId: string, stepId: string, dir: "up" | "down"): Promise<{ ok: boolean }> {
  const sb = service();
  const { data: step } = await sb.from("website_pages").select("funnel_id, funnel_order").eq("tenant_id", tenantId).eq("id", stepId).single();
  if (!step?.funnel_id) return { ok: false };
  const steps = await listSteps(tenantId, step.funnel_id);
  const idx = steps.findIndex((s) => s.id === stepId);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= steps.length) return { ok: false };
  await sb.from("website_pages").update({ funnel_order: steps[swap].order }).eq("tenant_id", tenantId).eq("id", steps[idx].id);
  await sb.from("website_pages").update({ funnel_order: steps[idx].order }).eq("tenant_id", tenantId).eq("id", steps[swap].id);
  return { ok: true };
}

/** Clone a step (independent copy) within the same funnel, placed after it. */
export async function cloneStep(tenantId: string, stepId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { data: src } = await sb.from("website_pages")
    .select("title, slug, funnel_id, funnel_step_type, draft_seo, draft_sections")
    .eq("tenant_id", tenantId).eq("id", stepId).single();
  if (!src?.funnel_id) return { ok: false, error: "Step not found." };
  const steps = await listSteps(tenantId, src.funnel_id);
  const title = `${src.title} copy`;
  const slug = await uniqueSlug(sb, tenantId, `${src.slug}-copy`);
  const { data: live } = await sb.from("website_page_sections").select("content, order_index").eq("tenant_id", tenantId).eq("page_id", stepId).order("order_index");
  const sections = Array.isArray(src.draft_sections) && src.draft_sections.length ? src.draft_sections : (live ?? []).map((r: any) => r.content);
  const { error } = await sb.from("website_pages").insert({
    tenant_id: tenantId, title, slug, order_index: 0, is_public: false,
    funnel_id: src.funnel_id, funnel_step_type: src.funnel_step_type, funnel_order: steps.length,
    draft_title: title, draft_slug: slug, draft_seo: src.draft_seo ?? {}, draft_sections: sections,
  });
  return { ok: !error, error: error?.message };
}

/** Unpublish a step (revert to private draft). */
export async function unpublishStep(tenantId: string, stepId: string): Promise<{ ok: boolean }> {
  const sb = service();
  await sb.from("website_pages").update({ is_public: false }).eq("tenant_id", tenantId).eq("id", stepId);
  return { ok: true };
}

/** AI/template funnel generation — drafts a classic funnel in one shot. */
export async function generateFunnel(tenantId: string, funnelId: string, kind: "lead" | "sales" = "sales"): Promise<{ ok: boolean; steps: number }> {
  const sb = service();
  const { data: t } = await sb.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const biz = t?.name || "Your Business";
  const plan: StepType[] = kind === "lead" ? ["landing", "optin", "thankyou"] : ["landing", "sales", "checkout", "upsell", "thankyou"];
  // clear any existing steps for a clean generate
  const existing = await listSteps(tenantId, funnelId);
  for (const s of existing) await deleteStep(tenantId, s.id);
  for (const st of plan) await addStep(tenantId, funnelId, st, biz);
  return { ok: true, steps: plan.length };
}
