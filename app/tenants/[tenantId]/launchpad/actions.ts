"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { STEP_REGISTRY, getStep, primaryWebsiteId, type StepStatus } from "@/lib/server/launchpad";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}
async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action, actorEmail: await getCurrentUserEmail(), meta });
  } catch { /* best effort */ }
}

export interface LaunchpadStep {
  step_key: string; title: string; desc: string; route: string;
  category: string; optional: boolean; status: StepStatus;
  verified_at: string | null; evidence: Record<string, unknown>;
}
export interface LaunchpadState {
  steps: LaunchpadStep[]; progress: number; dismissed: boolean;
  followup: { enabled: boolean; email: boolean; sms: boolean; emailTo: string; smsTo: string };
}

/** Run every step's verify(), upsert tenant_onboarding, return the full state + progress%. */
export async function getLaunchpadState(tenantId: string): Promise<LaunchpadState> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const websiteId = await primaryWebsiteId(tenantId);
  const now = new Date().toISOString();

  // Preserve manual overrides (skipped) already stored.
  const { data: existing } = await supabase.from("tenant_onboarding").select("step_key, status").eq("tenant_id", tenantId);
  const overrides = new Map((existing ?? []).map((r: any) => [r.step_key, r.status]));

  const steps: LaunchpadStep[] = [];
  for (const def of STEP_REGISTRY) {
    let status: StepStatus = "pending";
    let evidence: Record<string, unknown> = {};
    let verified_at: string | null = null;

    if (overrides.get(def.key) === "skipped") {
      status = "skipped";
    } else if (def.verify) {
      const r = await def.verify({ tenantId, websiteId });
      if (r.status) status = r.status;
      else status = r.complete ? "complete" : "pending";
      evidence = r.evidence ?? {};
      if (status === "complete") verified_at = now;
    }

    await supabase.from("tenant_onboarding").upsert(
      { tenant_id: tenantId, step_key: def.key, status, verified_at, last_checked_at: now, meta: evidence, updated_at: now },
      { onConflict: "tenant_id,step_key" }
    );
    steps.push({ step_key: def.key, title: def.title, desc: def.desc, route: def.route(tenantId, websiteId), category: def.category, optional: def.optional, status, verified_at, evidence });
  }

  // Progress = complete / (required steps). Optional steps don't drag the bar down.
  const required = steps.filter((s) => !s.optional);
  const done = required.filter((s) => s.status === "complete").length;
  const progress = required.length ? Math.round((done / required.length) * 100) : 100;

  const { data: settings } = await supabase.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", ["launchpad_dismissed", "launchpad_followup_enabled", "launchpad_followup_channels"]);
  const sv = new Map((settings ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  const channels = (sv.get("launchpad_followup_channels") as any) ?? {};
  return {
    steps, progress,
    dismissed: sv.get("launchpad_dismissed") === true || sv.get("launchpad_dismissed") === "true",
    followup: { enabled: sv.get("launchpad_followup_enabled") === true || sv.get("launchpad_followup_enabled") === "true", email: !!channels.email, sms: !!channels.sms, emailTo: channels.emailTo ?? "", smsTo: channels.smsTo ?? "" },
  };
}

/** Re-run a single step's check on demand. */
export async function verifyStep(tenantId: string, stepKey: string): Promise<{ ok: boolean; status: StepStatus; evidence: Record<string, unknown> }> {
  await requireTenantAccess(tenantId);
  const def = getStep(stepKey);
  if (!def?.verify) return { ok: false, status: "pending", evidence: {} };
  const websiteId = await primaryWebsiteId(tenantId);
  const r = await def.verify({ tenantId, websiteId });
  const status: StepStatus = r.status ?? (r.complete ? "complete" : "pending");
  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_onboarding").upsert(
    { tenant_id: tenantId, step_key: stepKey, status, verified_at: status === "complete" ? now : null, last_checked_at: now, meta: r.evidence ?? {}, updated_at: now },
    { onConflict: "tenant_id,step_key" }
  );
  return { ok: status === "complete", status, evidence: r.evidence ?? {} };
}

/** Mark a step skipped (or un-skip → back to pending so it re-verifies). Admin-gated, audited. */
export async function setStepSkipped(tenantId: string, stepKey: string, skipped: boolean): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  if (!getStep(stepKey)) return { ok: false, message: "Unknown step." };
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_onboarding").upsert(
    { tenant_id: tenantId, step_key: stepKey, status: skipped ? "skipped" : "pending", updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,step_key" }
  );
  await audit("launchpad.set_step_skipped", { tenantId, stepKey, skipped });
  return { ok: true };
}

export async function dismissLaunchpad(tenantId: string, dismissed: boolean): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: "launchpad_dismissed", setting_value: dismissed, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,setting_key" }
  );
  await audit("launchpad.dismiss", { tenantId, dismissed });
  return { ok: true };
}

/**
 * Enable/disable the follow-up sequence and choose channels. When enabled, (re)SCHEDULES DRAFT
 * reminder rows for the still-incomplete steps at day 1/3/7 — it NEVER sends. A separate worker
 * (later) flips drafts→sent. SMS rows are created but parked as 'skipped' (note 'twilio pending')
 * until the Twilio backend lands. Admin-gated, audited.
 */
export async function setFollowupPrefs(
  tenantId: string, prefs: { enabled: boolean; email: boolean; sms: boolean; emailTo?: string; smsTo?: string }
): Promise<{ ok: boolean; scheduled?: number; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  await supabase.from("tenant_settings").upsert([
    { tenant_id: tenantId, setting_key: "launchpad_followup_enabled", setting_value: prefs.enabled, updated_at: nowIso },
    { tenant_id: tenantId, setting_key: "launchpad_followup_channels", setting_value: { email: prefs.email, sms: prefs.sms, emailTo: (prefs.emailTo ?? "").trim(), smsTo: (prefs.smsTo ?? "").trim() }, updated_at: nowIso },
  ], { onConflict: "tenant_id,setting_key" });

  let scheduled = 0;
  if (prefs.enabled) {
    const state = await getLaunchpadState(tenantId);
    const incomplete = state.steps.filter((s) => !s.optional && s.status !== "complete" && s.status !== "skipped");
    const cadence: { template_key: string; days: number }[] = [
      { template_key: "reminder_d1", days: 1 }, { template_key: "reminder_d3", days: 3 }, { template_key: "reminder_d7", days: 7 },
    ];
    const rows: any[] = [];
    for (const c of cadence) {
      const scheduled_for = new Date(now + c.days * 86400000).toISOString();
      const payload = { incomplete: incomplete.map((s) => ({ key: s.step_key, title: s.title, route: s.route })) };
      if (prefs.email) rows.push({ tenant_id: tenantId, channel: "email", template_key: c.template_key, scheduled_for, status: "draft", payload, updated_at: nowIso });
      // SMS parked until Twilio lands — created so prefs persist, but never schedulable yet.
      if (prefs.sms) rows.push({ tenant_id: tenantId, channel: "sms", template_key: c.template_key, scheduled_for, status: "skipped", note: "twilio pending", payload, updated_at: nowIso });
    }
    if (rows.length) {
      await supabase.from("tenant_onboarding_followups").upsert(rows, { onConflict: "tenant_id,channel,template_key" });
      scheduled = rows.filter((r) => r.status === "draft").length;
    }
  } else {
    // Disabling cancels any pending drafts/scheduled rows (never deletes history of sent).
    await supabase.from("tenant_onboarding_followups").update({ status: "canceled", updated_at: nowIso }).eq("tenant_id", tenantId).in("status", ["draft", "scheduled"]);
  }
  await audit("launchpad.set_followup_prefs", { tenantId, enabled: prefs.enabled, email: prefs.email, sms: prefs.sms, scheduled });
  return { ok: true, scheduled };
}

/** Manual trigger (admin): run this tenant's due follow-ups now. Idempotent + gated by the worker. */
export async function runDueFollowupsAction(tenantId: string): Promise<{ ok: boolean; sent?: number; blocked?: number; failed?: number; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const { runDueFollowups } = await import("@/lib/server/followup-worker");
  const r = await runDueFollowups(tenantId);
  return { ok: true, sent: r.sent, blocked: r.blocked, failed: r.failed };
}
