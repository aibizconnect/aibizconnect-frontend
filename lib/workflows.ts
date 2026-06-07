import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Automation / Workflows — our take on the leading builder workflows, built "similar but better":
 * AI-generated nurture AND lead-scoring workflows out of the box, on our safety rails.
 *
 * SAFETY (core doctrine): a workflow is a DEFINITION only. Nothing here sends, charges,
 * or enrolls live. Steps that would send/spend (send_email, send_sms) are marked
 * `gated:true` and require live keys + G-approval at execution time (not built/enabled).
 * "Publish" only flips status; it does NOT start live automation. No DDL in this file.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export type TriggerType = "form_submitted" | "page_visited" | "email_opened" | "email_replied" | "appointment_booked" | "tag_added" | "manual";
export type StepType = "send_email" | "send_sms" | "wait" | "add_score" | "add_tag" | "notify" | "if_else";

export const TRIGGERS: { type: TriggerType; label: string }[] = [
  { type: "form_submitted", label: "Form submitted" },
  { type: "page_visited", label: "Page visited" },
  { type: "email_opened", label: "Email opened" },
  { type: "email_replied", label: "Email replied" },
  { type: "appointment_booked", label: "Appointment booked" },
  { type: "tag_added", label: "Tag added" },
  { type: "manual", label: "Manual / added to workflow" },
];
export const STEP_DEFS: { type: StepType; label: string; gated?: boolean }[] = [
  { type: "send_email", label: "Send email", gated: true },
  { type: "send_sms", label: "Send SMS", gated: true },
  { type: "wait", label: "Wait" },
  { type: "add_score", label: "Add lead score" },
  { type: "add_tag", label: "Add tag" },
  { type: "notify", label: "Notify me" },
  { type: "if_else", label: "If / else branch" },
];
export const isGated = (t: StepType) => STEP_DEFS.find((s) => s.type === t)?.gated === true;

export interface WfStep { id: string; type: StepType; label: string; config?: Record<string, any> }
export interface WfTrigger { type: TriggerType; label: string; config?: Record<string, any> }
export interface Workflow { id: string; name: string; status: "draft" | "published"; trigger: WfTrigger; steps: WfStep[]; enrolled: number; }

const sid = (i: number) => `s${i}_${Math.abs(((i + 7) * 2654435761) % 100000)}`;

export async function listWorkflows(tenantId: string): Promise<Workflow[]> {
  const sb = service();
  const { data } = await sb.from("tenant_workflows").select("id,name,status,trigger,steps,enrolled").eq("tenant_id", tenantId).order("updated_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, status: r.status, trigger: r.trigger ?? { type: "manual", label: "Manual" }, steps: r.steps ?? [], enrolled: r.enrolled ?? 0 }));
}

export async function getWorkflow(tenantId: string, id: string): Promise<Workflow | null> {
  const sb = service();
  const { data } = await sb.from("tenant_workflows").select("id,name,status,trigger,steps,enrolled").eq("tenant_id", tenantId).eq("id", id).single();
  if (!data) return null;
  return { id: data.id, name: data.name, status: data.status, trigger: data.trigger, steps: data.steps ?? [], enrolled: data.enrolled ?? 0 };
}

export async function createWorkflow(tenantId: string, name: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const sb = service();
  const { data, error } = await sb.from("tenant_workflows").insert({ tenant_id: tenantId, name: name.trim() || "New workflow", trigger: { type: "manual", label: "Manual / added to workflow" }, steps: [] }).select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function updateWorkflow(tenantId: string, id: string, patch: Partial<Pick<Workflow, "name" | "status" | "trigger" | "steps">>): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  const { error } = await sb.from("tenant_workflows").update({ ...patch, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
  return { ok: !error, error: error?.message };
}

export async function deleteWorkflow(tenantId: string, id: string): Promise<{ ok: boolean }> {
  const sb = service();
  await sb.from("tenant_workflows").delete().eq("tenant_id", tenantId).eq("id", id);
  return { ok: true };
}

/** AI/template workflow generation — drafts a complete, on-rails workflow in one shot. */
export function buildWorkflowTemplate(kind: "nurture" | "scoring" | "booking", biz: string): { name: string; trigger: WfTrigger; steps: WfStep[] } {
  if (kind === "scoring") {
    return {
      name: "Lead Scoring (ABC)",
      trigger: { type: "page_visited", label: "Page visited" },
      steps: [
        { id: sid(1), type: "add_score", label: "+10 — visited a page", config: { points: 10 } },
        { id: sid(2), type: "add_score", label: "+5 — opened an email", config: { points: 5, on: "email_opened" } },
        { id: sid(3), type: "add_score", label: "+20 — replied to an email", config: { points: 20, on: "email_replied" } },
        { id: sid(4), type: "add_score", label: "+30 — submitted a form", config: { points: 30, on: "form_submitted" } },
        { id: sid(5), type: "add_tag", label: "Tag 'Hot lead' when score ≥ 50", config: { tag: "Hot lead", when: "score>=50" } },
        { id: sid(6), type: "notify", label: "Notify me about hot leads" },
      ],
    };
  }
  if (kind === "booking") {
    return {
      name: "Appointment Follow-up",
      trigger: { type: "appointment_booked", label: "Appointment booked" },
      steps: [
        { id: sid(1), type: "send_email", label: "Confirmation email (draft)", config: { gated: true, subject: "You're booked!" } },
        { id: sid(2), type: "wait", label: "Wait until 1 day before", config: { until: "1d_before" } },
        { id: sid(3), type: "send_sms", label: "Reminder SMS (draft)", config: { gated: true } },
        { id: sid(4), type: "add_score", label: "+40 — booked", config: { points: 40 } },
      ],
    };
  }
  // nurture
  return {
    name: `${biz} Lead Nurture`,
    trigger: { type: "form_submitted", label: "Form submitted" },
    steps: [
      { id: sid(1), type: "send_email", label: "Welcome email (draft)", config: { gated: true, subject: `Welcome to ${biz}` } },
      { id: sid(2), type: "wait", label: "Wait 1 day", config: { days: 1 } },
      { id: sid(3), type: "send_email", label: "Value email (draft)", config: { gated: true, subject: "Here's how we help" } },
      { id: sid(4), type: "wait", label: "Wait 2 days", config: { days: 2 } },
      { id: sid(5), type: "add_score", label: "+10 — engaged", config: { points: 10 } },
      { id: sid(6), type: "send_email", label: "Offer email (draft)", config: { gated: true, subject: "A special offer for you" } },
      { id: sid(7), type: "notify", label: "Notify me to follow up" },
    ],
  };
}

export async function generateWorkflow(tenantId: string, kind: "nurture" | "scoring" | "booking"): Promise<{ ok: boolean; id?: string }> {
  const sb = service();
  const { data: t } = await sb.from("tenants").select("name").eq("id", tenantId).maybeSingle();
  const tpl = buildWorkflowTemplate(kind, t?.name || "Your Business");
  const { data, error } = await sb.from("tenant_workflows").insert({ tenant_id: tenantId, name: tpl.name, trigger: tpl.trigger, steps: tpl.steps }).select("id").single();
  return error ? { ok: false } : { ok: true, id: data.id };
}
