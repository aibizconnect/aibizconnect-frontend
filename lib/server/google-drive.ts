import crypto from "node:crypto";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret, setIntegrationSecret, deleteIntegrationSecret } from "./integrations";

/**
 * Server-only Google Drive connector (NOT "use server"). PER-TENANT: each tenant connects their own
 * Drive, and imported images land in that tenant's Media Library (stored to R2 via lib/media/storage).
 *
 * Platform app creds: env GOOGLE_DRIVE_CLIENT_ID/SECRET, else the encrypted platform secret under
 * SYSTEM_TENANT_ID provider 'google_drive_platform_app' { client_id, client_secret }. (You can reuse
 * the same Google Cloud project as Calendar — just enable the Drive API + add this redirect URI.)
 * Tokens are stored encrypted as a per-tenant integration secret, provider 'google_drive'.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export async function driveCreds(): Promise<{ id: string; secret: string } | null> {
  const id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "google_drive_platform_app");
    if (s?.client_id && s?.client_secret) return { id: String(s.client_id), secret: String(s.client_secret) };
  } catch { /* not configured */ }
  return null;
}
export async function driveReady(): Promise<boolean> { return !!(await driveCreds()); }

function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}
export function driveRedirectUri(): string { return `${appBase()}/api/drive/callback`; }

interface DState { tenantId: string; nonce: string; ts: number }
export function makeDriveState(tenantId: string): string | null {
  if (!encryptionReady()) return null;
  const payload: DState = { tenantId, nonce: crypto.randomBytes(12).toString("hex"), ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readDriveState(state: string): DState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as DState;
    if (!p?.tenantId || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

export async function buildDriveAuthUrl(tenantId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await driveCreds();
  if (!creds) return { ok: false, error: "Google Drive isn't configured (missing platform app credentials)." };
  const state = makeDriveState(tenantId);
  if (!state) return { ok: false, error: "Set SETTINGS_ENCRYPTION_KEY first." };
  const params = new URLSearchParams({
    client_id: creds.id, redirect_uri: driveRedirectUri(), response_type: "code",
    scope: SCOPES.join(" "), access_type: "offline", prompt: "consent", include_granted_scopes: "true", state,
  });
  return { ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

interface DriveTokens { access_token: string; refresh_token?: string; expiry_date?: number; scope?: string; email?: string }

export async function completeDriveConnectCore(tenantId: string, code: string): Promise<{ ok: boolean; message?: string; email?: string }> {
  const creds = await driveCreds();
  if (!creds) return { ok: false, message: "Google Drive isn't configured." };
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: creds.id, client_secret: creds.secret, redirect_uri: driveRedirectUri(), grant_type: "authorization_code" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (!res.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${res.status}).` };
    let email = "";
    try {
      const u = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
      const uj: any = await u.json().catch(() => ({})); email = uj?.email || "";
    } catch { /* best-effort */ }
    const tokens: DriveTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000, scope: tok.scope, email };
    await setIntegrationSecret(tenantId, "google_drive", tokens as any);
    return { ok: true, email };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Google Drive connection failed." }; }
}

export async function driveConnection(tenantId: string): Promise<{ email: string | null } | null> {
  try { const s = await getIntegrationSecret(tenantId, "google_drive"); return s?.access_token ? { email: (s.email as string) || null } : null; } catch { return null; }
}
export async function disconnectDrive(tenantId: string): Promise<void> { await deleteIntegrationSecret(tenantId, "google_drive"); }

async function validDriveToken(tenantId: string): Promise<string | null> {
  let tokens: DriveTokens | null = null;
  try { tokens = (await getIntegrationSecret(tenantId, "google_drive")) as any; } catch { return null; }
  if (!tokens?.access_token) return null;
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
  const creds = await driveCreds();
  if (!creds || !tokens.refresh_token) return tokens.access_token || null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (res.ok && tok?.access_token) {
      const next: DriveTokens = { ...tokens, access_token: tok.access_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };
      await setIntegrationSecret(tenantId, "google_drive", next as any);
      return tok.access_token;
    }
  } catch { /* fall through */ }
  return tokens.access_token || null;
}

export interface DriveImage { id: string; name: string; mimeType: string; thumbnailLink?: string; iconLink?: string; size?: number }

/** List the tenant's Drive image files (newest first). `query` filters by name. */
export async function listDriveImages(tenantId: string, opts?: { pageToken?: string; query?: string }): Promise<{ ok: boolean; files: DriveImage[]; nextPageToken?: string; error?: string }> {
  const token = await validDriveToken(tenantId);
  if (!token) return { ok: false, files: [], error: "Not connected to Google Drive." };
  const q = ["mimeType contains 'image/'", "trashed = false", opts?.query ? `name contains '${opts.query.replace(/'/g, "\\'")}'` : ""].filter(Boolean).join(" and ");
  const params = new URLSearchParams({ q, pageSize: "30", fields: "nextPageToken, files(id,name,mimeType,thumbnailLink,iconLink,size)", orderBy: "modifiedTime desc", spaces: "drive" });
  if (opts?.pageToken) params.set("pageToken", opts.pageToken);
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, files: [], error: j?.error?.message || `Drive list failed (${res.status}).` };
    return { ok: true, files: (j.files ?? []).map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType, thumbnailLink: f.thumbnailLink, iconLink: f.iconLink, size: f.size ? Number(f.size) : undefined })), nextPageToken: j.nextPageToken };
  } catch (e: any) { return { ok: false, files: [], error: e?.message ?? "Drive list failed." }; }
}

/** Download a Drive file's bytes (server-side, with the tenant's token). */
export async function downloadDriveFile(tenantId: string, fileId: string): Promise<{ buf: Buffer; mime: string; name: string } | null> {
  const token = await validDriveToken(tenantId);
  if (!token) return null;
  try {
    const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`, { headers: { Authorization: `Bearer ${token}` } });
    const mj: any = await meta.json().catch(() => ({}));
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, mime: mj?.mimeType || "application/octet-stream", name: mj?.name || `${fileId}.bin` };
  } catch { return null; }
}
