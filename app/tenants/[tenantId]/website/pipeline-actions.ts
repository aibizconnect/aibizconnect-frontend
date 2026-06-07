"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { validateIntakeUrl, runStep0Checks, type Check, type InputType } from "@/lib/sites/intake-validation";
import { enrichFromPresence } from "./wizard-actions";
import { recordAiUsage } from "./actions";

/**
 * STEP 0 — intake + Supervisor URL-validation gate. Runs BEFORE any paid AI call (S0-V9).
 * Validates the link, fetches the page, runs the Step-0 Supervisor checks, records the result
 * to website_analysis_results, and advances websites.wizard_pipeline_state.step0_intake.
 * Returns structured JSON. No AI, no spend.
 *
 * `websiteId` anchors the pipeline (the draft website must exist). DB writes are best-effort so
 * the gate still returns its verdict even before migration 0029 is applied (persisted=false).
 */
export interface IntakeResult {
  status: "passed" | "blocked" | "invalid";
  websiteId: string;
  inputType?: InputType;
  url?: string;
  checks: Check[];
  errors: { id: string; assertion: string }[];
  persisted: boolean;
  aiCalled: false;
}

async function fetchPage(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; AIBizConnectBot/1.0)" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    const html = res.ok ? (await res.text()).slice(0, 400_000) : "";
    return { ok: res.ok, status: res.status, html };
  } catch {
    return { ok: false, status: 0, html: "" };
  }
}

export async function analyzeIntake(tenantId: string, websiteId: string, rawUrl: string): Promise<IntakeResult> {
  await requireTenantAccess(tenantId);

  const fmt = validateIntakeUrl(rawUrl);
  if (!fmt.ok || !fmt.url) {
    return { status: "invalid", websiteId, checks: [], errors: [{ id: "S0_FORMAT", assertion: fmt.error || "Invalid URL" }], persisted: false, aiCalled: false };
  }

  const fetched = await fetchPage(fmt.url);
  const { checks, blocked } = runStep0Checks(fetched);
  const failed = checks.filter((c) => c.severity === "block" && !c.pass).map((c) => ({ id: c.id, assertion: c.assertion }));
  const status: IntakeResult["status"] = blocked ? "blocked" : "passed";

  // Best-effort persistence (migration 0029).
  let persisted = false;
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("website_analysis_results").insert({
      tenant_id: tenantId,
      website_id: websiteId,
      source_url: fmt.url,
      analysis_status: blocked ? "failed" : "pending",
      supervisor_verification: { step0_intake: checks },
    });
    const { data: w } = await supabase.from("websites").select("wizard_pipeline_state").eq("id", websiteId).eq("tenant_id", tenantId).single();
    const state = (w?.wizard_pipeline_state ?? {}) as Record<string, any>;
    state.version = state.version ?? "1.0";
    state.step0_intake = {
      status: blocked ? "failed" : "done",
      data: { input_url: fmt.url, input_type: fmt.inputType },
      verifiedAt: new Date().toISOString(),
      errors: failed,
    };
    if (!blocked) {
      state.step1_ai_analysis = state.step1_ai_analysis ?? { status: "pending", data: {}, verifiedAt: null, errors: [] };
    }
    await supabase.from("websites").update({ wizard_pipeline_state: state }).eq("id", websiteId).eq("tenant_id", tenantId);
    persisted = true;
  } catch {
    /* tables not migrated yet, or website row absent — gate verdict still returned */
  }

  return { status, websiteId, inputType: fmt.inputType, url: fmt.url, checks, errors: failed, persisted, aiCalled: false };
}

/**
 * STEP 1a — AI business analysis (profile). Reuses enrichFromPresence (fetch + Gemini extract),
 * assembles analysis_data, records a metering event, writes website_analysis_results, advances
 * wizard_pipeline_state.step1_ai_analysis, and runs the S1a Supervisor checks (S1_V1..S1_V6).
 * Refuses unless Step 0 passed. Drafts-only; scoped tenant_id+website_id.
 */
export interface BusinessAnalysisResult {
  status: "passed" | "blocked" | "invalid";
  websiteId: string;
  analysisId?: string;
  profile?: Record<string, unknown>;
  checks: Check[];
  errors: { id: string; assertion: string }[];
  aiUsed: boolean;
  persisted: boolean;
}

export async function analyzeBusiness(tenantId: string, websiteId: string, urlOverride?: string): Promise<BusinessAnalysisResult> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();

  // Gate on Step 0 + resolve the source URL from pipeline state (urlOverride for testing).
  let state: Record<string, any> = {};
  try {
    const { data } = await supabase.from("websites").select("wizard_pipeline_state").eq("id", websiteId).eq("tenant_id", tenantId).single();
    state = (data?.wizard_pipeline_state ?? {}) as Record<string, any>;
  } catch { /* migration not applied — rely on urlOverride */ }
  const step0 = state.step0_intake;
  if (step0 && step0.status && step0.status !== "done") {
    return { status: "blocked", websiteId, checks: [], errors: [{ id: "S1_GATE", assertion: "Step 0 must pass before analysis." }], aiUsed: false, persisted: false };
  }
  const url = (urlOverride || step0?.data?.input_url || "").trim();
  if (!url) return { status: "invalid", websiteId, checks: [], errors: [{ id: "S1_URL", assertion: "No source URL available from Step 0." }], aiUsed: false, persisted: false };

  // AI extraction (Gemini-first) + metering.
  const p = await enrichFromPresence(tenantId, { websiteUrl: url });
  try { await recordAiUsage(tenantId, "analysis", 1, { step: "1a", websiteId, source: "wizard" }); } catch { /* metering best-effort */ }

  const services = (p.services || "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  const colors = p.primaryColor ? [p.primaryColor] : [];
  const analysis_data: Record<string, unknown> = {
    business_name: p.businessName || "",
    industry: p.industry || "",
    services_products: services,
    audience: p.audience || "",
    tone: p.tone || "",
    brand_colors: colors,
    template_family: p.templateFamily || "",
    country: p.country || "",
    city: p.city || "",
    location: [p.city, p.country].filter(Boolean).join(", "),
    image_count: p.imageCount || 0,
    source_url: p.sourceUrl || url,
  };

  const expected = ["business_name", "industry", "services_products", "tone", "brand_colors", "location"];
  const filled = expected.filter((k) => { const v = analysis_data[k]; return Array.isArray(v) ? v.length > 0 : !!v; }).length;
  const fillFrac = filled / expected.length;
  const hexOk = colors.length === 0 || colors.every((c) => /^#?[0-9a-fA-F]{3,8}$/.test(c));
  const checks: Check[] = [
    { id: "S1_V1", assertion: ">=80% key profile fields filled", severity: "warn", pass: fillFrac >= 0.8, detail: `${filled}/${expected.length}` },
    { id: "S1_V2", assertion: "Business name detected (not Unknown)", severity: "block", pass: !!analysis_data.business_name && !/^unknown$/i.test(String(analysis_data.business_name)) },
    { id: "S1_V3", assertion: "Industry detected", severity: "block", pass: !!analysis_data.industry },
    { id: "S1_V4", assertion: ">=1 service/product detected", severity: "block", pass: services.length >= 1 },
    { id: "S1_V6", assertion: "Brand colors are valid hex (or none)", severity: "warn", pass: hexOk },
  ];
  const blocked = checks.some((c) => c.severity === "block" && !c.pass);
  const failed = checks.filter((c) => c.severity === "block" && !c.pass).map((c) => ({ id: c.id, assertion: c.assertion }));

  // Persist (best-effort — needs migration 0029).
  let persisted = false, analysisId: string | undefined;
  try {
    const { data: ins } = await supabase.from("website_analysis_results").insert({
      tenant_id: tenantId, website_id: websiteId, source_url: url,
      analysis_data, analysis_status: blocked ? "failed" : "completed",
      supervisor_verification: { step1a: checks },
    }).select("id").single();
    analysisId = ins?.id;
    state.version = state.version ?? "1.0";
    state.step1_ai_analysis = {
      status: blocked ? "failed" : "profile_analyzed",
      data: { analysis_id: analysisId, ...analysis_data },
      verifiedAt: new Date().toISOString(),
      errors: failed,
    };
    await supabase.from("websites").update({ wizard_pipeline_state: state }).eq("id", websiteId).eq("tenant_id", tenantId);
    persisted = true;
  } catch { /* tables not migrated yet — verdict still returned */ }

  return { status: blocked ? "blocked" : "passed", websiteId, analysisId, profile: analysis_data, checks, errors: failed, aiUsed: true, persisted };
}
