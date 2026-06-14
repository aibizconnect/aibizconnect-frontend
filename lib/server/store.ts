import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listProducts, type Product } from "@/lib/server/billing";
import { getStripeCreds, stripeReady } from "@/lib/server/payments";

/**
 * STORE / E-COMMERCE (D-350). A native storefront over the Payments product catalog
 * (tenant_products) with Stripe Checkout. Purchases are verified server-side on return (no
 * webhook) and recorded as orders, linking to a CRM contact by email. Store on/off + title are
 * tenant_settings. Storage: tenant_store_orders (0069).
 */

const svc = () => createSupabaseServiceClient();
function appBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
}

export interface StoreConfig { enabled: boolean; title: string }
export async function getStoreConfig(tenantId: string): Promise<StoreConfig> {
  const { data } = await svc().from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", ["store_enabled", "store_title"]);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  return { enabled: String(m.store_enabled) === "true", title: typeof m.store_title === "string" && m.store_title ? m.store_title : "Shop" };
}
export async function setStoreConfig(tenantId: string, patch: { enabled?: boolean; title?: string }): Promise<void> {
  const sb = svc();
  const put = async (k: string, v: string) => { await sb.from("tenant_settings").upsert({ tenant_id: tenantId, setting_key: k, setting_value: v, updated_at: new Date().toISOString() }, { onConflict: "tenant_id,setting_key" }); };
  if (patch.enabled !== undefined) await put("store_enabled", patch.enabled ? "true" : "false");
  if (patch.title !== undefined) await put("store_title", patch.title);
}

/** Active, sellable products for the storefront. */
export async function listStoreProducts(tenantId: string): Promise<Product[]> {
  const all = await listProducts(tenantId).catch(() => [] as Product[]);
  return all.filter((p) => p.isActive);
}
export async function getStoreProduct(tenantId: string, id: string): Promise<Product | null> {
  const all = await listProducts(tenantId).catch(() => [] as Product[]);
  return all.find((p) => p.id === id) ?? null;
}

export interface StoreOrder { id: string; productId: string | null; productName: string; email: string | null; amountCents: number; currency: string; status: string; createdAt: string }
export async function listOrders(tenantId: string, limit = 100): Promise<StoreOrder[]> {
  const { data, error } = await svc().from("tenant_store_orders").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit);
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, productId: r.product_id ?? null, productName: r.product_name, email: r.email ?? null, amountCents: r.amount_cents ?? 0, currency: r.currency ?? "USD", status: r.status, createdAt: r.created_at }));
}

/** Begin a product purchase: a Stripe Checkout session collecting the buyer's email. */
export async function startProductPurchase(tenantId: string, productId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!(await stripeReady(tenantId))) return { ok: false, error: "This store isn't accepting payments yet." };
  const product = await getStoreProduct(tenantId, productId);
  if (!product) return { ok: false, error: "Product not found." };
  if (product.price <= 0) return { ok: false, error: "This product has no price set." };
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${appBase()}/sites/${tenantId}/store/success?cs={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appBase()}/sites/${tenantId}/store/${productId}`);
  params.set("billing_address_collection", "auto");
  params.set("metadata[product_id]", productId);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", (product.currency || "USD").toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(product.price * 100)));
  params.set("line_items[0][price_data][product_data][name]", product.name);
  if (product.description) params.set("line_items[0][price_data][product_data][description]", product.description.slice(0, 500));
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${creds.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) return { ok: false, error: json?.error?.message || `Stripe ${res.status}` };
    return { ok: true, url: json.url };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Stripe request failed." }; }
}

/** Verify a returned session is paid, record the order, and link/create a CRM contact. Idempotent. */
export async function confirmProductPurchase(tenantId: string, sessionId: string): Promise<{ ok: boolean; productName?: string; error?: string }> {
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };
  const sb = svc();
  const existing = await sb.from("tenant_store_orders").select("product_name").eq("tenant_id", tenantId).eq("stripe_session_id", sessionId).maybeSingle();
  if (existing.data) return { ok: true, productName: existing.data.product_name };
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${creds.secret_key}` } });
    const s: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: s?.error?.message || `Stripe ${res.status}` };
    if (!(s?.payment_status === "paid" || s?.status === "complete")) return { ok: false, error: "Payment not completed." };
    const productId = s?.metadata?.product_id ?? null;
    const product = productId ? await getStoreProduct(tenantId, productId) : null;
    const email = (s?.customer_details?.email || s?.customer_email || "").trim().toLowerCase() || null;
    const name = s?.customer_details?.name || "";

    // Link or create a CRM contact for the buyer (best-effort).
    let contactId: string | null = null;
    if (email) {
      const { data: c } = await sb.from("tenant_contacts").select("id").eq("tenant_id", tenantId).ilike("email", email).limit(1).maybeSingle();
      if (c) contactId = c.id;
      else {
        try { const { createContact } = await import("@/lib/crm"); await createContact(tenantId, { name, email, source: "store", tags: ["customer"] }); const { data: nc } = await sb.from("tenant_contacts").select("id").eq("tenant_id", tenantId).ilike("email", email).limit(1).maybeSingle(); contactId = nc?.id ?? null; } catch { /* */ }
      }
    }
    await sb.from("tenant_store_orders").insert({
      tenant_id: tenantId, product_id: productId, product_name: product?.name ?? "Order", email, contact_id: contactId,
      amount_cents: typeof s?.amount_total === "number" ? s.amount_total : Math.round((product?.price ?? 0) * 100),
      currency: (s?.currency || product?.currency || "USD").toUpperCase(), status: "paid", stripe_session_id: sessionId,
    });
    return { ok: true, productName: product?.name ?? "your order" };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Verification failed." }; }
}
