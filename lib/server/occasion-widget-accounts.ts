import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { defaultOccasionsConfig, normalizeDomain } from "./occasion-widget";
import type { OccasionsConfig } from "@/lib/occasions";

/**
 * Occasions Widget — PAID accounts layer (D-406, 2026-06-23). Sits ON TOP of the existing
 * per-domain widget (lib/server/occasion-widget.ts), additive only:
 *   - A "GHL account" = one GHL sub-account (location). Paid accounts get UNLIMITED domains
 *     free; free accounts get 1. (The public funnel path is unchanged: 1 domain per email.)
 *   - Surfaced inside GHL as a new menu (Custom Menu Link / Marketplace custom page). Identity
 *     comes from a GHL SSO blob (go-live) or a signed session token we mint (now).
 * Reuses the LOCKED occasions engine read-only via defaultOccasionsConfig().
 */

const sb = () => createSupabaseServiceClient();
const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
export const snippetForKey = (key: string) => `<script src="${APP_BASE}/api/occasions-widget/embed?k=${key}" async></script>`;
export const manageUrlForKey = (key: string) => `${APP_BASE}/tools/occasions/manage?k=${key}`;

export type WidgetPlan = "free" | "paid";
export interface WidgetAccount { ghlLocationId: string; ghlCompanyId?: string | null; accountName?: string | null; plan: WidgetPlan; active: boolean; siteCap: number | null; }
export interface AccountSite { key: string; domain: string; active: boolean; badge: boolean; plan: WidgetPlan; occasions: OccasionsConfig; lastSeenAt: string | null; }

// ── accounts ──────────────────────────────────────────────────────────────────
export async function getAccount(locationId: string): Promise<WidgetAccount | null> {
  if (!locationId) return null;
  const { data } = await sb().from("occasion_widget_accounts").select("*").eq("ghl_location_id", locationId).maybeSingle();
  if (!data) return null;
  return {
    ghlLocationId: data.ghl_location_id, ghlCompanyId: data.ghl_company_id, accountName: data.account_name,
    plan: data.plan === "paid" ? "paid" : "free", active: data.active !== false,
    siteCap: data.site_cap == null ? null : Number(data.site_cap),
  };
}

export async function upsertAccount(a: { locationId: string; companyId?: string; name?: string; plan?: WidgetPlan }): Promise<WidgetAccount> {
  const patch: Record<string, unknown> = { ghl_location_id: a.locationId, updated_at: new Date().toISOString() };
  if (a.companyId !== undefined) patch.ghl_company_id = a.companyId;
  if (a.name) patch.account_name = a.name;
  if (a.plan !== undefined) patch.plan = a.plan;
  await sb().from("occasion_widget_accounts").upsert(patch, { onConflict: "ghl_location_id" });
  return (await getAccount(a.locationId))!;
}

/** Set an account's plan (e.g. from the GHL "paid" tag webhook) + sync its sites' plan flag. */
export async function setAccountPlan(locationId: string, plan: WidgetPlan): Promise<void> {
  await upsertAccount({ locationId, plan });
  await sb().from("occasion_widget_sites").update({ plan }).eq("ghl_location_id", locationId);
}

// ── admin (staff-only; the action layer gates on isPlatformAdmin) ────────────────
export interface AdminSite { key: string; domain: string; active: boolean; lastSeenAt: string | null; installCount: number; installed: boolean; }
export interface AdminAccount {
  ghlLocationId: string; accountName: string | null; plan: WidgetPlan; active: boolean;
  siteCap: number | null;          // the raw per-account override (null = plan default)
  effectiveCap: number | null;     // resolved cap (null = unlimited, i.e. owner location)
  isOwner: boolean; siteCount: number; installedCount: number; sites: AdminSite[];
}

/** A site counts as "installed" if its feed phoned home from the live domain in the last 7 days. */
const INSTALLED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isInstalled = (lastSeenAt: string | null): boolean =>
  !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < INSTALLED_WINDOW_MS;

/** Every GHL account with its sites + install status — for the staff admin panel. */
export async function listAllAccounts(): Promise<AdminAccount[]> {
  const db = sb();
  const [accountsRes, sitesRes] = await Promise.all([
    db.from("occasion_widget_accounts").select("*").order("created_at", { ascending: true }),
    db.from("occasion_widget_sites").select("key, domain, active, last_seen_at, install_count, ghl_location_id").not("ghl_location_id", "is", null),
  ]);
  const byLoc = new Map<string, AdminSite[]>();
  for (const r of (sitesRes.data ?? []) as Record<string, unknown>[]) {
    const loc = String(r.ghl_location_id);
    const arr = byLoc.get(loc) ?? [];
    const lastSeenAt = (r.last_seen_at as string | null) ?? null;
    arr.push({ key: String(r.key), domain: String(r.domain), active: r.active !== false, lastSeenAt, installCount: Number(r.install_count ?? 0), installed: isInstalled(lastSeenAt) });
    byLoc.set(loc, arr);
  }
  return ((accountsRes.data ?? []) as Record<string, unknown>[]).map((a) => {
    const loc = String(a.ghl_location_id);
    const plan: WidgetPlan = a.plan === "paid" ? "paid" : "free";
    const siteCap = a.site_cap == null ? null : Number(a.site_cap);
    const cap = siteCapFor(loc, plan, siteCap);
    const sites = byLoc.get(loc) ?? [];
    return {
      ghlLocationId: loc, accountName: (a.account_name as string | null) ?? null, plan,
      active: a.active !== false, siteCap, effectiveCap: Number.isFinite(cap) ? cap : null,
      isOwner: loc === OWNER_LOCATION_ID, siteCount: sites.length,
      installedCount: sites.filter((s) => s.installed).length, sites,
    };
  });
}

/** Activate / suspend an account (blocks its dashboard + adding sites while off). */
export async function setAccountActive(locationId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("occasion_widget_accounts").update({ active, updated_at: new Date().toISOString() }).eq("ghl_location_id", locationId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
/** Set (or clear, with null) a per-account domain cap that overrides the plan default. */
export async function setAccountSiteCap(locationId: string, cap: number | null): Promise<{ ok: boolean; error?: string }> {
  const clean = cap == null || Number.isNaN(cap) ? null : Math.max(0, Math.floor(cap));
  const { error } = await sb().from("occasion_widget_accounts").update({ site_cap: clean, updated_at: new Date().toISOString() }).eq("ghl_location_id", locationId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
/** Add (or touch) an account by GHL location id, so staff can activate/cap it before the customer opens the menu. */
export async function adminUpsertAccount(input: { locationId: string; name?: string; plan?: WidgetPlan }): Promise<{ ok: boolean; error?: string }> {
  const locationId = input.locationId?.trim();
  if (!locationId) return { ok: false, error: "A GHL location id is required." };
  await upsertAccount({ locationId, name: input.name?.trim() || undefined, plan: input.plan });
  return { ok: true };
}

// ── sites (account-scoped) ──────────────────────────────────────────────────────
export async function listSitesForLocation(locationId: string): Promise<AccountSite[]> {
  if (!locationId) return [];
  const { data } = await sb()
    .from("occasion_widget_sites")
    .select("key, domain, active, badge, plan, occasions, last_seen_at")
    .eq("ghl_location_id", locationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r: Record<string, unknown>) => ({
    key: String(r.key), domain: String(r.domain), active: r.active !== false, badge: r.badge !== false,
    plan: r.plan === "paid" ? "paid" : "free", occasions: (r.occasions ?? {}) as OccasionsConfig,
    lastSeenAt: (r.last_seen_at as string | null) ?? null,
  }));
}

/** AI Biz Connect's OWN GHL sub-account (location id) → UNLIMITED Occasions sites. Env-overridable. */
export const OWNER_LOCATION_ID = process.env.OCCASIONS_OWNER_LOCATION_ID || "yDwou55cNKwHB5cg0Frs";
/** Sub-account holders on a paid plan get up to this many sites (our own location is unlimited; free = 1). */
export const PAID_SITE_CAP = 5;
/**
 * How many Occasions sites a GHL location may create. Infinity = unlimited (our own location).
 * `siteCapOverride` (from the admin panel, a per-account number) wins over the plan default when set.
 */
export function siteCapFor(locationId: string, plan: WidgetPlan, siteCapOverride?: number | null): number {
  if (locationId === OWNER_LOCATION_ID) return Infinity;
  if (siteCapOverride != null && Number.isFinite(siteCapOverride)) return Math.max(0, Math.floor(siteCapOverride));
  return plan === "paid" ? PAID_SITE_CAP : 1;
}

export interface CreateSiteResult { ok: boolean; key?: string; error?: string }
export async function createSiteForLocation(input: { locationId: string; domain: string; accountName?: string }): Promise<CreateSiteResult> {
  const domain = normalizeDomain(input.domain);
  if (!domain || !domain.includes(".")) return { ok: false, error: "Enter a valid domain like yourdomain.com." };
  const db = sb();
  const account = await getAccount(input.locationId);
  const plan: WidgetPlan = account?.plan === "paid" ? "paid" : "free";

  // A suspended account (staff-deactivated) can't add new sites.
  if (account && account.active === false) return { ok: false, error: "This account is paused. Contact AI Biz Connect to reactivate it." };

  // Domain is globally unique — a domain belongs to exactly one widget.
  const { data: existing } = await db.from("occasion_widget_sites").select("key, ghl_location_id").eq("domain", domain).maybeSingle();
  if (existing) {
    if ((existing as Record<string, unknown>).ghl_location_id === input.locationId) return { ok: true, key: String((existing as Record<string, unknown>).key) };
    return { ok: false, error: "That domain is already registered." };
  }
  // Per-location cap: free = 1, paid sub-account = 5, our own AI Biz Connect location = unlimited —
  // unless staff set a custom cap on the account, which overrides the plan default.
  const cap = siteCapFor(input.locationId, plan, account?.siteCap ?? null);
  if (Number.isFinite(cap)) {
    const { count } = await db.from("occasion_widget_sites").select("key", { count: "exact", head: true }).eq("ghl_location_id", input.locationId);
    if ((count ?? 0) >= cap) {
      return { ok: false, error: cap <= 1
        ? "Your plan includes 1 site — upgrade to add more."
        : `Your plan includes up to ${cap} sites; you've reached the limit.` };
    }
  }

  const key = `ocw_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const { error } = await db.from("occasion_widget_sites").insert({
    key, domain, name: input.accountName ?? account?.accountName ?? null, occasions: defaultOccasionsConfig(),
    active: true, verified: true, source: "ghl_dashboard", owner_type: "ghl", ghl_location_id: input.locationId, plan, badge: true,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) return { ok: false, error: "That domain is already registered." };
    return { ok: false, error: error.message };
  }
  return { ok: true, key };
}

export async function removeSiteForLocation(locationId: string, key: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("occasion_widget_sites").delete().eq("key", key).eq("ghl_location_id", locationId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function setSiteActiveForLocation(locationId: string, key: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("occasion_widget_sites").update({ active }).eq("key", key).eq("ghl_location_id", locationId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function setSiteBadgeForLocation(locationId: string, key: string, badge: boolean): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("occasion_widget_sites").update({ badge }).eq("key", key).eq("ghl_location_id", locationId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
export async function saveOccasionsForLocation(locationId: string, key: string, occasions: OccasionsConfig): Promise<{ ok: boolean; error?: string }> {
  const { data } = await sb().from("occasion_widget_sites").select("key").eq("key", key).eq("ghl_location_id", locationId).maybeSingle();
  if (!data) return { ok: false, error: "That site isn't part of this account." };
  const { error } = await sb().from("occasion_widget_sites").update({ occasions, updated_at: new Date().toISOString() }).eq("key", key);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── signed session token (HMAC over locationId + expiry) ─────────────────────────
function secret(): string { return process.env.OCCASIONS_WIDGET_SECRET || ""; }
function b64url(b: Buffer): string { return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function fromB64url(s: string): Buffer { return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"); }

export function signLocationToken(locationId: string, ttlMs = 1000 * 60 * 60 * 8): string {
  const body = `${locationId}.${Date.now() + ttlMs}`;
  const sig = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${b64url(Buffer.from(body))}.${sig}`;
}
export function verifyLocationToken(token: string): { locationId: string } | null {
  if (!token || !secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let body: string;
  try { body = fromB64url(parts[0]).toString("utf8"); } catch { return null; }
  const expect = b64url(createHmac("sha256", secret()).update(body).digest());
  const got = Buffer.from(parts[1]); const exp = Buffer.from(expect);
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) return null;
  const [locationId, expStr] = body.split(".");
  if (!locationId || !expStr || Date.now() > Number(expStr)) return null;
  return { locationId };
}

// ── GHL Marketplace SSO (DORMANT until the app is registered + GHL_SSO_KEY is set) ──
// GHL custom pages post an AES-encrypted user blob; the app decrypts it with its SSO shared
// secret to learn { activeLocation, companyId, userName, email, role }. Wiring the decrypt is
// the go-live step (needs the marketplace app + its shared secret). Until then we use the
// signed token above. Mirrors the dormant-credential pattern used for Cloudflare auto-fix.
export function ghlSsoReady(): boolean { return !!process.env.GHL_SSO_KEY; }
export async function decodeGhlSso(_encrypted: string): Promise<{ locationId?: string; companyId?: string; name?: string; email?: string } | null> {
  if (!ghlSsoReady()) return null;
  // TODO(go-live): decrypt _encrypted with process.env.GHL_SSO_KEY (GHL uses CryptoJS AES) and
  // return { locationId: json.activeLocation, companyId, name: json.userName, email }.
  return null;
}

// ── "Occasions is now included" email (sent when an account becomes paid) ────────
const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const NAVY = "#090966"; const PRIMARY = "#3D49C4";
const escEmail = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildPerkEmail(accountName: string | undefined, panelUrl: string): { subject: string; html: string; text: string } {
  const who = accountName ? escEmail(accountName) : "your account";
  const subject = "Occasions is now included with your plan 🎉";
  const html = `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#3A3D55;max-width:560px;margin:0 auto">
    <div style="display:inline-block;width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2F399D,#555FC4);text-align:center;line-height:34px;color:#fff;font-weight:700;margin-bottom:14px">▶</div>
    <div style="display:inline-block;background:#E2F3EC;color:#0f6e44;font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:12px">New perk</div>
    <h1 style="font-size:20px;color:#12123A;margin:0 0 8px">Occasions is included with your plan</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 18px">Good news for <b style="color:${NAVY}">${who}</b> — Occasions is now part of your plan. Add festive holiday banners to <b>as many sites as you like</b>, free, and remove the AIBizConnect badge.</p>
    <p style="margin:0 0 8px"><a href="${panelUrl}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:10px">Add unlimited sites →</a></p>
    <p style="color:#75788C;font-size:12px;line-height:1.5;margin:18px 0 0">Open Occasions any time from the left menu in your AIBizConnect workspace.</p>
  </div>`;
  const text = `Occasions is now included with your plan.

${accountName ? accountName + " — y" : "Y"}our plan now includes Occasions. Add holiday banners to as many sites as you like, free, and remove the AIBizConnect badge.

Add unlimited sites: ${panelUrl}

Open Occasions any time from the left menu in your AIBizConnect workspace.`;
  return { subject, html, text };
}

/** Best-effort: tell an account their plan now includes Occasions. Never throws. */
export async function sendPerkEmail(email: string, accountName?: string): Promise<boolean> {
  try {
    if (!email || !/.+@.+\..+/.test(email)) return false;
    const { sendEmail } = await import("./email-send");
    const { subject, html, text } = buildPerkEmail(accountName, `${APP_BASE}/tools/occasions/app`);
    const res = await sendEmail(PLATFORM_TENANT, { to: email, subject, html, text, footer: "none" });
    return res.ok;
  } catch { return false; }
}
