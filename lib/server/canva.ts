import crypto from "node:crypto";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret, setIntegrationSecret, deleteIntegrationSecret } from "./integrations";

/**
 * Server-only Canva connector (NOT "use server"). PER-TENANT: each tenant connects their own Canva
 * (OAuth 2.0 + PKCE), browses their designs, and imports them as PNGs into their Media Library
 * (optimized → R2). Canva exports are ASYNC jobs (create → poll → download).
 *
 * Platform app creds: env CANVA_CLIENT_ID/SECRET, else encrypted platform secret under
 * SYSTEM_TENANT_ID provider 'canva_platform_app' { client_id, client_secret }. Tokens stored
 * encrypted per tenant, provider 'canva'.
 */

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
const API = "https://api.canva.com/rest/v1";
const SCOPES = ["design:meta:read", "design:content:read", "asset:read", "profile:read"];

export async function canvaCreds(): Promise<{ id: string; secret: string } | null> {
  const id = process.env.CANVA_CLIENT_ID;
  const secret = process.env.CANVA_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "canva_platform_app");
    if (s?.client_id && s?.client_secret) return { id: String(s.client_id), secret: String(s.client_secret) };
  } catch { /* not configured */ }
  return null;
}
export async function canvaReady(): Promise<boolean> { return !!(await canvaCreds()); }

function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}
export function canvaRedirectUri(): string { return `${appBase()}/api/canva/callback`; }

// PKCE per Canva docs: verifier 43–128 chars (base64url of 96 random bytes), challenge = base64url(sha256(verifier)).
export function canvaPkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(96).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// State carries ONLY tenantId + nonce (NOT the verifier — Canva forbids storing the verifier in
// state). The verifier is held server-side in a short-lived HttpOnly cookie (see canva-actions).
interface CState { tenantId: string; nonce: string; ts: number }
export function makeCanvaState(tenantId: string, nonce: string): string | null {
  if (!encryptionReady()) return null;
  const payload: CState = { tenantId, nonce, ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readCanvaState(state: string): CState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as CState;
    if (!p?.tenantId || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

/** Build the Canva authorization URL given a PKCE challenge and an opaque state. */
export async function buildCanvaAuthUrl(challenge: string, state: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await canvaCreds();
  if (!creds) return { ok: false, error: "Canva isn't configured (missing platform app credentials)." };
  const params = new URLSearchParams({
    client_id: creds.id, redirect_uri: canvaRedirectUri(), response_type: "code",
    scope: SCOPES.join(" "), code_challenge: challenge, code_challenge_method: "S256", state,
  });
  return { ok: true, url: `${AUTH_URL}?${params.toString()}` };
}

interface CanvaTokens { access_token: string; refresh_token?: string; expiry_date?: number; scope?: string; name?: string }
function basicAuth(creds: { id: string; secret: string }): string { return "Basic " + Buffer.from(`${creds.id}:${creds.secret}`).toString("base64"); }

export async function completeCanvaConnectCore(tenantId: string, code: string, verifier: string): Promise<{ ok: boolean; message?: string; name?: string }> {
  const creds = await canvaCreds();
  if (!creds) return { ok: false, message: "Canva isn't configured." };
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth(creds) },
      body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: canvaRedirectUri() }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (!res.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${res.status}).` };
    let name = "";
    try { const u = await fetch(`${API}/users/me/profile`, { headers: { Authorization: `Bearer ${tok.access_token}` } }); const uj: any = await u.json().catch(() => ({})); name = uj?.display_name || uj?.profile?.display_name || ""; } catch { /* best-effort */ }
    const tokens: CanvaTokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000, scope: tok.scope, name };
    await setIntegrationSecret(tenantId, "canva", tokens as any);
    return { ok: true, name };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Canva connection failed." }; }
}

export async function canvaConnection(tenantId: string): Promise<{ name: string | null } | null> {
  try { const s = await getIntegrationSecret(tenantId, "canva"); return s?.access_token ? { name: (s.name as string) || null } : null; } catch { return null; }
}
export async function disconnectCanva(tenantId: string): Promise<void> { await deleteIntegrationSecret(tenantId, "canva"); }

async function validCanvaToken(tenantId: string): Promise<string | null> {
  let tokens: CanvaTokens | null = null;
  try { tokens = (await getIntegrationSecret(tenantId, "canva")) as any; } catch { return null; }
  if (!tokens?.access_token) return null;
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 60_000) return tokens.access_token;
  const creds = await canvaCreds();
  if (!creds || !tokens.refresh_token) return tokens.access_token || null;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth(creds) },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token }),
    });
    const tok: any = await res.json().catch(() => ({}));
    if (res.ok && tok?.access_token) {
      const next: CanvaTokens = { ...tokens, access_token: tok.access_token, refresh_token: tok.refresh_token || tokens.refresh_token, expiry_date: Date.now() + (tok.expires_in ?? 3600) * 1000 };
      await setIntegrationSecret(tenantId, "canva", next as any);
      return tok.access_token;
    }
  } catch { /* fall through */ }
  return tokens.access_token || null;
}

export interface CanvaDesign { id: string; title: string; thumbnail?: string }

export async function listCanvaDesigns(tenantId: string, opts?: { continuation?: string; query?: string }): Promise<{ ok: boolean; designs: CanvaDesign[]; continuation?: string; error?: string }> {
  const token = await validCanvaToken(tenantId);
  if (!token) return { ok: false, designs: [], error: "Not connected to Canva." };
  const params = new URLSearchParams({ limit: "30" });
  if (opts?.continuation) params.set("continuation", opts.continuation);
  if (opts?.query) params.set("query", opts.query);
  try {
    const res = await fetch(`${API}/designs?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, designs: [], error: j?.message || j?.error || `Canva list failed (${res.status}).` };
    const designs: CanvaDesign[] = (j.items ?? []).map((d: any) => ({ id: d.id, title: d.title || "Untitled", thumbnail: d.thumbnail?.url }));
    return { ok: true, designs, continuation: j.continuation };
  } catch (e: any) { return { ok: false, designs: [], error: e?.message ?? "Canva list failed." }; }
}

/** Export a design to PNG (async job → poll) and return the page image URLs. */
export async function exportCanvaDesign(tenantId: string, designId: string): Promise<string[]> {
  const token = await validCanvaToken(tenantId);
  if (!token) return [];
  try {
    const create = await fetch(`${API}/exports`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
    });
    const cj: any = await create.json().catch(() => ({}));
    const jobId = cj?.job?.id;
    if (!create.ok || !jobId) return [];
    // Poll up to ~25s.
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const poll = await fetch(`${API}/exports/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      const pj: any = await poll.json().catch(() => ({}));
      const status = pj?.job?.status;
      if (status === "success") return (pj.job.urls ?? []).filter(Boolean) as string[];
      if (status === "failed") return [];
    }
    return [];
  } catch { return []; }
}
