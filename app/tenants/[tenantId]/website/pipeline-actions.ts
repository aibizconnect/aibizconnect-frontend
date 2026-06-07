"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { validateIntakeUrl, runStep0Checks, type Check, type InputType } from "@/lib/sites/intake-validation";
import { classifyMainPages, verifyPageContent, extractLogo } from "@/lib/sites/page-classify";
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

  // Extract the tenant's REAL logo from their homepage (never the platform default). Falls
  // back to a text wordmark of the business name when no logo is found.
  let logo_url: string | null = null;
  try { const home = await fetchPage(url); if (home.html) logo_url = extractLogo(home.html, url); } catch { /* no logo */ }

  const services = (p.services || "").split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
  const colors = p.primaryColor ? [p.primaryColor] : [];
  const analysis_data: Record<string, unknown> = {
    business_name: p.businessName || "",
    industry: p.industry || "",
    services_products: services,
    audience: p.audience || "",
    tone: p.tone || "",
    brand_colors: colors,
    logo_url,                          // real brand logo (or null → caller uses a text wordmark)
    logo_wordmark: logo_url ? "" : (p.businessName || ""),
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

/**
 * STEP 1b — count & verify ONLY the real main pages of the existing site (Home, About,
 * Services, Pricing, Contact, …), ignoring product/listing/blog-post/category/cart/account/
 * system pages. Deterministic (no AI spend): fetch -> classify -> seed website_page_extractions
 * (status 'pending') -> advance wizard_pipeline_state.step1_ai_analysis. Gated on Step 1a.
 */
export interface ClassifiedPage { title: string; url: string; verified_content_present: boolean }
export interface ClassifyMainPagesResult {
  status: "passed" | "blocked" | "invalid";
  websiteId: string;
  mainPages: ClassifiedPage[];
  count: number;
  checks: Check[];
  errors: { id: string; assertion: string }[];
  persisted: boolean;
  aiUsed: false;
}

export async function classifyMainPagesStep(tenantId: string, websiteId: string, urlOverride?: string): Promise<ClassifyMainPagesResult> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();

  let state: Record<string, any> = {};
  try {
    const { data } = await supabase.from("websites").select("wizard_pipeline_state").eq("id", websiteId).eq("tenant_id", tenantId).single();
    state = (data?.wizard_pipeline_state ?? {}) as Record<string, any>;
  } catch { /* migration not applied — rely on urlOverride */ }

  const url = (urlOverride || state.step1_ai_analysis?.data?.source_url || state.step0_intake?.data?.input_url || "").trim();
  if (!url) return { status: "invalid", websiteId, mainPages: [], count: 0, checks: [], errors: [{ id: "S1B_URL", assertion: "No source URL available." }], persisted: false, aiUsed: false };

  const fetched = await fetchPage(url);
  if (!fetched.ok || !fetched.html) {
    return { status: "blocked", websiteId, mainPages: [], count: 0, checks: [], errors: [{ id: "S1B_FETCH", assertion: "Could not fetch the site to classify pages." }], persisted: false, aiUsed: false };
  }

  const { main_pages } = classifyMainPages(fetched.html, url);

  // S1_V10: VERIFY each candidate's content (hero + >=2 sections + >=1 CTA). Fetch each page
  // in parallel; the homepage we already have. Keep only pages whose content verifies.
  const verifiedAll: ClassifiedPage[] = await Promise.all(main_pages.map(async (p) => {
    const html = p.path === "/" ? fetched.html : (await fetchPage(p.url)).html;
    const ok = !!html && verifyPageContent(html).verified;
    return { title: p.title, url: p.url, verified_content_present: ok };
  }));
  const kept = verifiedAll.filter((p) => p.verified_content_present);
  const count = kept.length;

  const noJunk = kept.every((p) => !/\/(products?|shop|cart|checkout|account|categor|tags?|listing|search)(\/|$)/i.test(p.url));
  const checks: Check[] = [
    { id: "S1_V9", assertion: "Counted only real main pages (no shop/listing/blog-post/system)", severity: "block", pass: count >= 1 && noJunk, detail: `${count} pages` },
    { id: "S1_V10", assertion: "Each kept page has verified content (hero + >=2 sections + >=1 CTA)", severity: "block", pass: kept.length >= 1 && kept.every((p) => p.verified_content_present) },
    { id: "S1B_HOME", assertion: "Home page present", severity: "warn", pass: kept.some((p) => { try { return new URL(p.url).pathname.replace(/\/+$/, "") === "" || new URL(p.url).pathname === "/"; } catch { return false; } }) },
  ];
  const blocked = checks.some((c) => c.severity === "block" && !c.pass);
  const failed = checks.filter((c) => c.severity === "block" && !c.pass).map((c) => ({ id: c.id, assertion: c.assertion }));

  // Persist: seed one website_page_extractions row per VERIFIED main page (idempotent).
  let persisted = false;
  const ids: string[] = [];
  try {
    for (const p of kept) {
      const { data } = await supabase.from("website_page_extractions").upsert(
        { tenant_id: tenantId, website_id: websiteId, original_url: p.url, page_title: p.title, extraction_status: "pending" },
        { onConflict: "website_id,original_url" }
      ).select("id").single();
      if (data?.id) ids.push(data.id);
    }
    state.version = state.version ?? "1.0";
    state.step1_ai_analysis = {
      ...(state.step1_ai_analysis ?? { data: {} }),
      status: blocked ? "failed" : "pages_classified",
      data: { ...(state.step1_ai_analysis?.data ?? {}), main_pages_detected: kept, page_extractions_ids: ids },
      verifiedAt: new Date().toISOString(),
      errors: failed,
    };
    await supabase.from("websites").update({ wizard_pipeline_state: state }).eq("id", websiteId).eq("tenant_id", tenantId);
    persisted = true;
  } catch { /* tables not migrated — verdict still returned */ }

  return { status: blocked ? "blocked" : "passed", websiteId, mainPages: kept, count, checks, errors: failed, persisted, aiUsed: false };
}
