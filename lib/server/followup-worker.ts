import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { emailReady, sendEmail } from "./email-send";
import { twilioReady } from "./twilio";
import { sendSms } from "./twilio";

/**
 * Follow-up Sender Worker (architect-approved D-062..D-065). Turns Launchpad reminder DRAFTS into
 * real sends — but ONLY when the tenant has explicitly opted in and the channel is verified. Safe by
 * construction: idempotent claim (draft→sending), per-attempt audit, max-attempts cap, SMS quiet
 * hours, one-click unsubscribe (in the email). A reaper re-opens stuck 'sending' rows. Triggerable
 * three ways (manual button / cron endpoint / opportunistic) — all call runDueFollowups.
 */

const MAX_ATTEMPTS = 4;
const REAP_AFTER_MS = 10 * 60 * 1000;
const QUIET_START = 21; // 9pm
const QUIET_END = 8;    // 8am

interface Channels { email?: boolean; sms?: boolean; emailTo?: string; smsTo?: string }

async function settingsFor(supabase: any, tenantId: string): Promise<{ enabled: boolean; channels: Channels; tz: string }> {
  const { data } = await supabase.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", ["launchpad_followup_enabled", "launchpad_followup_channels", "default_timezone"]);
  const m = new Map((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  const enabled = m.get("launchpad_followup_enabled") === true || m.get("launchpad_followup_enabled") === "true";
  return { enabled, channels: (m.get("launchpad_followup_channels") as Channels) ?? {}, tz: (m.get("default_timezone") as string) || "America/Toronto" };
}

/** Local hour (0-23) in a tz, best-effort via Intl. */
function localHour(tz: string): number {
  try { return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date())); } catch { return 12; }
}
function inQuietHours(tz: string): boolean { const h = localHour(tz); return h >= QUIET_START || h < QUIET_END; }

function reminderCopy(templateKey: string, payload: any): { subject: string; html: string; sms: string } {
  const steps: { title: string; route: string }[] = payload?.incomplete ?? [];
  const list = steps.map((s) => `<li>${s.title}</li>`).join("");
  const n = steps.length;
  const subject = n ? `Finish setting up your account (${n} step${n > 1 ? "s" : ""} left)` : "Finish setting up your account";
  const html = `<p>You're almost set up. A few steps remain:</p><ul>${list}</ul><p>Pick up where you left off in your Launchpad.</p>`;
  const sms = `You have ${n} setup step${n > 1 ? "s" : ""} left. Open your AIBizConnect Launchpad to finish.`;
  return { subject, html, sms };
}

/** Are all steps referenced by this reminder already done? (don't nag a finished tenant) */
async function stepsAllDone(supabase: any, tenantId: string, payload: any): Promise<boolean> {
  const keys: string[] = (payload?.incomplete ?? []).map((s: any) => s.key).filter(Boolean);
  if (!keys.length) return false;
  const { data } = await supabase.from("tenant_onboarding").select("step_key, status").eq("tenant_id", tenantId).in("step_key", keys);
  const done = new Map((data ?? []).map((r: any) => [r.step_key, r.status]));
  return keys.every((k) => { const s = done.get(k); return s === "complete" || s === "skipped"; });
}

async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action, actorEmail: "followup_worker", meta });
  } catch { /* best effort */ }
}

export interface WorkerResult { processed: number; sent: number; blocked: number; failed: number; canceled: number; deferred: number }

/**
 * Run all due follow-ups (optionally for one tenant). Idempotent + safe to call concurrently.
 */
export async function runDueFollowups(tenantId?: string): Promise<WorkerResult> {
  const supabase = createSupabaseServiceClient();
  const res: WorkerResult = { processed: 0, sent: 0, blocked: 0, failed: 0, canceled: 0, deferred: 0 };
  const nowIso = new Date().toISOString();

  // Reaper: re-open rows stuck in 'sending' beyond the timeout (FW-V9).
  await supabase.from("tenant_onboarding_followups").update({ status: "draft", updated_at: nowIso })
    .eq("status", "sending").lt("last_attempt_at", new Date(Date.now() - REAP_AFTER_MS).toISOString());

  // Candidate due rows.
  let q = supabase.from("tenant_onboarding_followups").select("id, tenant_id, channel, template_key, payload, send_attempts")
    .eq("status", "draft").lte("scheduled_for", nowIso).limit(200);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data: due } = await q;
  const rows = (due ?? []) as any[];

  // Cache per-tenant settings.
  const settingsCache = new Map<string, { enabled: boolean; channels: Channels; tz: string }>();
  const getSettings = async (t: string) => { if (!settingsCache.has(t)) settingsCache.set(t, await settingsFor(supabase, t)); return settingsCache.get(t)!; };

  for (const row of rows) {
    res.processed++;
    const st = await getSettings(row.tenant_id);
    const recipient = row.channel === "email" ? st.channels.emailTo : st.channels.smsTo;

    // CLAIM idempotently: only the worker that flips draft→sending proceeds (FW-V4).
    const { data: claimed } = await supabase.from("tenant_onboarding_followups")
      .update({ status: "sending", send_attempts: (row.send_attempts ?? 0) + 1, last_attempt_at: nowIso, recipient: recipient ?? null, updated_at: nowIso })
      .eq("id", row.id).eq("status", "draft").select("id, send_attempts").single();
    if (!claimed) continue; // someone else claimed it

    const finalize = async (status: string, error?: string) => {
      await supabase.from("tenant_onboarding_followups").update({ status, error: error ?? null, sent_at: status === "sent" ? nowIso : null, updated_at: nowIso }).eq("id", row.id);
      await audit("followup.send", { tenantId: row.tenant_id, followupId: row.id, channel: row.channel, status, error });
    };
    const defer = async () => { res.deferred++; await supabase.from("tenant_onboarding_followups").update({ status: "draft", scheduled_for: new Date(Date.now() + 3 * 3600_000).toISOString(), updated_at: nowIso }).eq("id", row.id); };

    // Gates.
    if (!st.enabled || !st.channels[row.channel as "email" | "sms"]) { await finalize("blocked", "channel off"); res.blocked++; continue; }
    if (!recipient) { await finalize("blocked", "no recipient"); res.blocked++; continue; }
    if (claimed.send_attempts > MAX_ATTEMPTS) { await finalize("failed", "max attempts"); res.failed++; continue; }
    if (await stepsAllDone(supabase, row.tenant_id, row.payload)) { await finalize("canceled", "steps complete"); res.canceled++; continue; }

    const copy = reminderCopy(row.template_key, row.payload);
    if (row.channel === "email") {
      const r = await emailReady(row.tenant_id);
      if (!r.ok) { await finalize("blocked", r.reason || "email not ready"); res.blocked++; continue; }
      const sent = await sendEmail(row.tenant_id, { to: recipient, subject: copy.subject, html: copy.html });
      if (sent.ok) { await finalize("sent"); res.sent++; } else { await finalize("failed", sent.error); res.failed++; }
    } else if (row.channel === "sms") {
      if (!(await twilioReady(row.tenant_id))) { await finalize("blocked", "twilio not connected"); res.blocked++; continue; }
      if (inQuietHours(st.tz)) { await defer(); continue; }
      const sent = await sendSms(row.tenant_id, { to: recipient, body: copy.sms });
      if (sent.ok) { await finalize("sent"); res.sent++; } else { await finalize("failed", sent.error); res.failed++; }
    } else { await finalize("blocked", "unknown channel"); res.blocked++; }
  }
  return res;
}
