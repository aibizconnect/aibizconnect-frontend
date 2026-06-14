import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "@/lib/server/encryption";
import { listAppointmentsByEmail, listOpportunitiesForContact, type Opportunity } from "@/lib/crm";
import { listInvoices, listEstimates, type Invoice, type Estimate } from "@/lib/server/billing";

/**
 * CLIENT PORTAL (D-348). A logged-in, self-serve area where a tenant's CUSTOMER (a contact)
 * sees their own appointments, invoices, estimates and opportunities. Auth is a per-contact
 * magic-link token (AES-GCM, carries tenant+contact+email+expiry) delivered by email and stored
 * in an httpOnly cookie — entirely separate from the app's staff login.
 */

export interface PortalSession { tenantId: string; contactId: string; email: string; name: string }
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Issue a portal token for a contact. Returns null when encryption isn't configured. */
export function issuePortalToken(tenantId: string, contactId: string, email: string): string | null {
  if (!encryptionReady()) return null;
  const payload = { t: tenantId, c: contactId, e: email, x: Date.now() + TOKEN_TTL_MS };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}

/** Verify a portal token against the expected tenant. Returns the contact id+email or null. */
export function readPortalToken(token: string, expectTenantId: string): { contactId: string; email: string } | null {
  try {
    const json = JSON.parse(decryptSecret(Buffer.from(token, "base64url").toString("utf8")));
    if (!json?.t || json.t !== expectTenantId || !json?.c || !json?.e) return null;
    if (typeof json.x !== "number" || Date.now() > json.x) return null;
    return { contactId: String(json.c), email: String(json.e) };
  } catch { return null; }
}

/** Look up a contact by email (case-insensitive) for the magic-link request. */
export async function findPortalContact(tenantId: string, email: string): Promise<{ id: string; name: string; email: string } | null> {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;
  const { data } = await createSupabaseServiceClient()
    .from("tenant_contacts").select("id, name, email").eq("tenant_id", tenantId).ilike("email", e).limit(1).maybeSingle();
  if (!data) return null;
  return { id: data.id, name: data.name || data.email || "there", email: data.email };
}

export interface PortalData {
  appointments: { id: string; title: string | null; startAt: string; endAt: string | null; status: string }[];
  invoices: Invoice[];
  estimates: Estimate[];
  opportunities: Opportunity[];
}

/** Everything this customer can see. Drafts are hidden — only sent/paid invoices & estimates. */
export async function getPortalData(tenantId: string, contactId: string, email: string): Promise<PortalData> {
  const [appointments, opportunities, allInvoices, allEstimates] = await Promise.all([
    listAppointmentsByEmail(tenantId, email).catch(() => []),
    listOpportunitiesForContact(tenantId, contactId).catch(() => []),
    listInvoices(tenantId).catch(() => [] as Invoice[]),
    listEstimates(tenantId).catch(() => [] as Estimate[]),
  ]);
  const mine = (cid: string | null) => cid === contactId;
  const invoices = allInvoices.filter((i) => mine(i.contactId) && i.status !== "draft");
  const estimates = allEstimates.filter((e) => mine(e.contactId) && e.status !== "draft");
  return { appointments: appointments.map((a) => ({ id: a.id, title: a.title, startAt: a.startAt, endAt: a.endAt, status: a.status })), invoices, estimates, opportunities };
}
