import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { setIntegrationSecret, getIntegrationSecret, deleteIntegrationSecret } from "./integrations";
import { googleCalCreds, googleRedirectUri } from "./google-calendar";

/**
 * Google Contacts import sync (D-258, Blueprint v3.2) — READ-ONLY v1. Tenant-level
 * connection (reuses the platform Google OAuth client with the contacts.readonly scope).
 * The tenant picks which Google contact GROUPS to sync; matching people upsert into
 * tenant_contacts, and EVERY user-group label they carry becomes one of our tags
 * (group "Lawyers" → tag "Lawyers"). Fill-empty-only on core fields — our edits win.
 * No deletes, no writes back to Google. Tokens encrypted in tenant_secrets
 * ('google_contacts'); non-secret state in tenant_integrations.config.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];
const PROVIDER = "google_contacts";

/** The contacts flow rides the CALENDAR redirect URI — it's the one registered on the
 *  platform's Google OAuth client (a second URI would 400 redirect_uri_mismatch). The
 *  calendar callback disambiguates via the `flow` marker in our encrypted state. */
export function contactsRedirectUri(): string { return googleRedirectUri(); }

interface CState { flow: "contacts"; tenantId: string; nonce: string; ts: number }
export function makeContactsState(tenantId: string): string | null {
  if (!encryptionReady()) return null;
  const payload: CState = { flow: "contacts", tenantId, nonce: crypto.randomBytes(12).toString("hex"), ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readContactsState(state: string): CState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as CState;
    if (p?.flow !== "contacts" || !p?.tenantId || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

export async function buildContactsAuthUrl(tenantId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await googleCalCreds(); // same platform OAuth app as calendar
  if (!creds) return { ok: false, error: "Google isn't configured (missing platform app credentials)." };
  const state = makeContactsState(tenantId);
  if (!state) return { ok: false, error: "Set SETTINGS_ENCRYPTION_KEY first." };
  const params = new URLSearchParams({
    client_id: creds.id, redirect_uri: contactsRedirectUri(), response_type: "code",
    scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return { ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

interface GTokens { access_token: string; refresh_token?: string; expiry_date?: number }

export async function completeContactsConnectCore(tenantId: string, code: string): Promise<{ ok: boolean; message?: string; email?: string }> {
  const creds = await googleCalCreds();
  if (!creds) return { ok: false, message: "Google isn't configured." };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: creds.id, client_secret: creds.secret, redirect_uri: contactsRedirectUri(), grant_type: "authorization_code" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (!res.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${res.status}).` };
    const tokens: GTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };

    let email = "";
    try {
      const u = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const uj: any = await u.json().catch(() => ({})); email = uj?.email || "";
    } catch { /* best-effort */ }

    await setIntegrationSecret(tenantId, PROVIDER, tokens as unknown as Record<string, unknown>);
    const sb = createSupabaseServiceClient();
    await sb.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider: PROVIDER, status: "connected", config: { accountEmail: email || null, selectedGroups: [], lastSyncAt: null, lastReport: null }, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" },
    );
    return { ok: true, email };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Google Contacts connection failed." }; }
}

async function validToken(tenantId: string): Promise<string | null> {
  const sec = await getIntegrationSecret(tenantId, PROVIDER).catch(() => null);
  if (!sec?.access_token) return null;
  const tokens = sec as unknown as GTokens;
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
  const creds = await googleCalCreds();
  if (!creds || !tokens.refresh_token) return tokens.access_token ?? null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (res.ok && tok?.access_token) {
      const next: GTokens = { access_token: tok.access_token, refresh_token: tokens.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };
      await setIntegrationSecret(tenantId, PROVIDER, next as unknown as Record<string, unknown>);
      return tok.access_token;
    }
  } catch { /* fall through */ }
  return null;
}

export interface SelectedPerson { resourceName: string; name: string | null; email: string | null }
export interface GcSyncState {
  connected: boolean; accountEmail: string | null;
  selectedGroups: { resourceName: string; name: string }[];
  selectedPeople: SelectedPerson[];
  lastSyncAt: string | null;
  lastReport: { matched: number; created: number; updated: number; skippedNoEmail: number; tagsApplied: number; tagsCreated?: number } | null;
}
export async function getContactsSyncState(tenantId: string): Promise<GcSyncState> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("status, config").eq("tenant_id", tenantId).eq("provider", PROVIDER).maybeSingle();
  const cfg = (data as any)?.config ?? {};
  return {
    connected: (data as any)?.status === "connected",
    accountEmail: cfg.accountEmail ?? null,
    selectedGroups: Array.isArray(cfg.selectedGroups) ? cfg.selectedGroups : [],
    selectedPeople: Array.isArray(cfg.selectedPeople) ? cfg.selectedPeople : [],
    lastSyncAt: cfg.lastSyncAt ?? null,
    lastReport: cfg.lastReport ?? null,
  };
}

export async function saveSelectedGroups(tenantId: string, groups: { resourceName: string; name: string }[]): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("config").eq("tenant_id", tenantId).eq("provider", PROVIDER).maybeSingle();
  const config = { ...((data as any)?.config ?? {}), selectedGroups: groups.slice(0, 20) };
  const { error } = await sb.from("tenant_integrations").update({ config, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", PROVIDER);
  return { ok: !error, error: error?.message };
}

export async function saveSelectedPeople(tenantId: string, people: SelectedPerson[]): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("config").eq("tenant_id", tenantId).eq("provider", PROVIDER).maybeSingle();
  const config = { ...((data as any)?.config ?? {}), selectedPeople: people.slice(0, 200) };
  const { error } = await sb.from("tenant_integrations").update({ config, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", PROVIDER);
  return { ok: !error, error: error?.message };
}

/** Search the account's contacts by name/email substring (D-265) — powers the
 *  "Specific contacts" picker. Top 20 matches. */
export async function searchPeople(tenantId: string, query: string): Promise<{ ok: boolean; people?: { resourceName: string; name: string | null; email: string | null; groupNames: string[] }[]; error?: string }> {
  const f = await fetchPeople(tenantId);
  if (!f.ok) return { ok: false, error: f.error };
  const q = (query || "").trim().toLowerCase();
  const hits = f.people!
    .filter((p) => !q || (p.name ?? "").toLowerCase().includes(q) || (p.email ?? "").includes(q))
    .slice(0, 20)
    .map((p) => ({ resourceName: p.resourceName, name: p.name, email: p.email, groupNames: p.groupNames }));
  return { ok: true, people: hits };
}

export async function disconnectContacts(tenantId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  await sb.from("tenant_integrations").delete().eq("tenant_id", tenantId).eq("provider", PROVIDER);
  await deleteIntegrationSecret(tenantId, PROVIDER).catch(() => { /* */ });
}

/** User-created contact groups (system groups like myContacts/starred excluded). */
export async function listContactGroups(tenantId: string): Promise<{ ok: boolean; groups?: { resourceName: string; name: string; memberCount: number }[]; error?: string }> {
  const token = await validToken(tenantId);
  if (!token) return { ok: false, error: "Not connected." };
  try {
    const res = await fetch("https://people.googleapis.com/v1/contactGroups?pageSize=200&groupFields=name,groupType,memberCount", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = j?.error?.message || `People API ${res.status}`;
      return { ok: false, error: /has not been used|disabled/i.test(msg) ? "Enable the People API for the platform's Google Cloud project, then retry." : msg };
    }
    const groups = ((j?.contactGroups ?? []) as any[])
      .filter((g) => g.groupType === "USER_CONTACT_GROUP")
      .map((g) => ({ resourceName: g.resourceName as string, name: (g.name as string) ?? "", memberCount: g.memberCount ?? 0 }));
    return { ok: true, groups };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Could not list groups." }; }
}

export interface SyncPerson {
  resourceName: string;
  name: string | null; email: string | null; phone: string | null; company: string | null;
  /** Display names of ALL user groups this person belongs to (these become tags). */
  groupNames: string[];
  /** Resource names of those groups — used to scope the sync to the selected groups. */
  groupRns: string[];
}

/** Pull every connection with memberships, mapped to SyncPerson (group names resolved). */
async function fetchPeople(tenantId: string): Promise<{ ok: boolean; people?: SyncPerson[]; groupsByRn?: Map<string, string>; error?: string }> {
  const token = await validToken(tenantId);
  if (!token) return { ok: false, error: "Not connected." };
  const lg = await listContactGroups(tenantId);
  if (!lg.ok) return { ok: false, error: lg.error };
  const groupsByRn = new Map(lg.groups!.map((g) => [g.resourceName, g.name]));

  const people: SyncPerson[] = [];
  let pageToken = "";
  try {
    do {
      const url = `https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=${encodeURIComponent("names,emailAddresses,phoneNumbers,organizations,memberships")}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: j?.error?.message || `People API ${res.status}` };
      for (const p of (j?.connections ?? []) as any[]) {
        const groupRns = ((p.memberships ?? []) as any[])
          .map((m) => m?.contactGroupMembership?.contactGroupResourceName as string | undefined)
          .filter(Boolean) as string[];
        people.push({
          resourceName: p.resourceName,
          name: p.names?.[0]?.displayName ?? null,
          email: (p.emailAddresses?.[0]?.value ?? null)?.toLowerCase() ?? null,
          phone: p.phoneNumbers?.[0]?.value ?? null,
          company: p.organizations?.[0]?.name ?? null,
          groupNames: groupRns.map((rn) => groupsByRn.get(rn)).filter(Boolean) as string[],
          groupRns,
        });
      }
      pageToken = j?.nextPageToken ?? "";
    } while (pageToken);
  } catch (e: any) { return { ok: false, error: e?.message ?? "Could not fetch contacts." }; }
  return { ok: true, people, groupsByRn };
}

export interface SyncReport { matched: number; created: number; updated: number; skippedNoEmail: number; tagsApplied: number; tagsCreated: number }

/** Upsert synced people into tenant_contacts (D-258): match custom.googleResourceName →
 *  email; fill-empty-only on name/phone/company (our edits win); tags = union of ours +
 *  ALL their group labels; no deletes. Exported separately so tests can drive it with
 *  fabricated payloads — no live Google needed. */
export async function applySyncedPeople(tenantId: string, people: SyncPerson[]): Promise<SyncReport> {
  const sb = createSupabaseServiceClient();
  const report: SyncReport = { matched: people.length, created: 0, updated: 0, skippedNoEmail: 0, tagsApplied: 0, tagsCreated: 0 };
  const allTagNames = new Set<string>();
  for (const p of people) {
    if (!p.email) { report.skippedNoEmail++; continue; }
    let { data: row } = await sb.from("tenant_contacts").select("id, name, phone, company, tags, custom, deleted_at")
      .eq("tenant_id", tenantId).eq("custom->>googleResourceName", p.resourceName).maybeSingle();
    if (!row) {
      const { data: byEmail } = await sb.from("tenant_contacts").select("id, name, phone, company, tags, custom, deleted_at")
        .eq("tenant_id", tenantId).eq("email", p.email).is("deleted_at", null).limit(1);
      row = byEmail?.[0] ?? null;
    }
    const groupTags = [...new Set(p.groupNames.map((g) => g.trim()).filter(Boolean))];
    groupTags.forEach((t) => allTagNames.add(t));
    if (row) {
      const existingTags: string[] = Array.isArray((row as any).tags) ? (row as any).tags : [];
      const have = new Set(existingTags.map((t) => t.toLowerCase()));
      const newTags = groupTags.filter((t) => !have.has(t.toLowerCase()));
      const upd: Record<string, unknown> = {
        custom: { ...(((row as any).custom && typeof (row as any).custom === "object") ? (row as any).custom : {}), googleResourceName: p.resourceName },
        updated_at: new Date().toISOString(),
      };
      if (newTags.length) { upd.tags = [...existingTags, ...newTags]; report.tagsApplied += newTags.length; }
      if (!(row as any).name && p.name) upd.name = p.name;
      if (!(row as any).phone && p.phone) upd.phone = p.phone;
      if (!(row as any).company && p.company) upd.company = p.company;
      const { error } = await sb.from("tenant_contacts").update(upd).eq("tenant_id", tenantId).eq("id", (row as any).id);
      if (!error) report.updated++;
    } else {
      const ins: Record<string, unknown> = {
        tenant_id: tenantId, name: p.name || p.email, email: p.email, phone: p.phone, company: p.company,
        source: "google contacts", tags: groupTags, custom: { googleResourceName: p.resourceName },
      };
      let { error } = await sb.from("tenant_contacts").insert(ins);
      if (error && /column .* does not exist|could not find/i.test(error.message)) {
        delete ins.company; delete ins.custom;
        ({ error } = await sb.from("tenant_contacts").insert(ins));
      }
      if (!error) { report.created++; report.tagsApplied += groupTags.length; }
    }
  }
  // Register brand-new labels in the tenant's tag registry (D-265) so they show up in
  // Settings → Tags and every tag filter — unique on (tenant_id, lower(name)).
  if (allTagNames.size) {
    const { data: existing } = await sb.from("tenant_tags").select("name").eq("tenant_id", tenantId);
    const have = new Set(((existing ?? []) as any[]).map((r) => String(r.name).toLowerCase()));
    const fresh = [...allTagNames].filter((t) => !have.has(t.toLowerCase()));
    if (fresh.length) {
      const { error } = await sb.from("tenant_tags").insert(fresh.map((name) => ({ tenant_id: tenantId, name, color: "#64748b" })));
      if (!error) report.tagsCreated = fresh.length;
    }
  }
  return report;
}

/** Full sync run: fetch → filter to the selected scope → apply → record the report. */
export async function runContactSync(tenantId: string): Promise<{ ok: boolean; report?: SyncReport; error?: string }> {
  const state = await getContactsSyncState(tenantId);
  if (!state.connected) return { ok: false, error: "Google Contacts is not connected." };
  if (!state.selectedGroups.length && !state.selectedPeople.length) return { ok: false, error: "Pick at least one group or contact to sync." };

  const f = await fetchPeople(tenantId);
  if (!f.ok) return { ok: false, error: f.error };
  // Scope = members of the selected groups ∪ individually selected contacts (D-265);
  // every group label a synced person carries becomes a tag either way.
  const selected = new Set(state.selectedGroups.map((g) => g.resourceName));
  const selectedRns = new Set(state.selectedPeople.map((p) => p.resourceName));
  const inScope = f.people!.filter((p) => p.groupRns.some((rn) => selected.has(rn)) || selectedRns.has(p.resourceName));

  const report = await applySyncedPeople(tenantId, inScope);

  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("config").eq("tenant_id", tenantId).eq("provider", PROVIDER).maybeSingle();
  const config = { ...((data as any)?.config ?? {}), lastSyncAt: new Date().toISOString(), lastReport: report };
  await sb.from("tenant_integrations").update({ config, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", PROVIDER);

  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "crm.contacts.google_sync", meta: { tenantId, ...report } });
  } catch { /* best-effort */ }
  return { ok: true, report };
}

/** Cron entry: sync every connected tenant at most once per hour. */
export async function runDueContactSyncs(): Promise<{ tenants: number; synced: number; errors: string[] }> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("tenant_id, config").eq("provider", PROVIDER).eq("status", "connected");
  const rows = (data ?? []) as any[];
  let synced = 0; const errors: string[] = [];
  for (const r of rows) {
    const last = r.config?.lastSyncAt ? new Date(r.config.lastSyncAt).getTime() : 0;
    if (Date.now() - last < 60 * 60_000) continue;
    if (!Array.isArray(r.config?.selectedGroups) || !r.config.selectedGroups.length) continue;
    const res = await runContactSync(r.tenant_id);
    if (res.ok) synced++; else errors.push(res.error ?? "sync failed");
  }
  return { tenants: rows.length, synced, errors: [...new Set(errors)].slice(0, 5) };
}
