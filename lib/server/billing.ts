import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getStripeCreds, stripeReady } from "./payments";

/**
 * Payments DATA layer (D-302..306) — Products, Invoices (+ line items), Estimates,
 * Transactions ledger. SERVER-ONLY (not "use server"). This module never charges or moves
 * money: the only Stripe call here (createInvoicePaymentLink) generates a *customer-initiated*
 * hosted checkout URL — the customer pays on Stripe's PCI page; we never call /v1/charges
 * (PAY-V14, D-303). lib/server/payments.ts stays purely credential-verify.
 *
 * Every read returns empty / every write no-ops gracefully until migration 0058 is applied.
 */

const svc = () => createSupabaseServiceClient();
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

export interface Product { id: string; name: string; description: string; price: number; currency: string; type: string; isActive: boolean; imageUrl: string | null; }
export interface LineItem { id?: string; description: string; quantity: number; unitPrice: number; lineTotal: number; productId?: string | null; }
export interface Invoice {
  id: string; invoiceNumber: string; contactId: string | null; contactName: string; status: string;
  issueDate: string; dueDate: string | null; subtotal: number; taxRate: number; taxAmount: number;
  totalAmount: number; amountPaid: number; currency: string; notes: string | null; customerNotes: string | null;
  paymentLinkUrl: string | null;
}
export interface InvoiceFull extends Invoice { items: LineItem[]; }
export interface Estimate {
  id: string; estimateNumber: string; contactId: string | null; contactName: string; status: string;
  issueDate: string; expiryDate: string | null; subtotal: number; taxRate: number; taxAmount: number;
  totalAmount: number; currency: string; notes: string | null; customerNotes: string | null;
}
export interface EstimateFull extends Estimate { items: LineItem[]; }
export interface Transaction { id: string; invoiceId: string | null; contactId: string | null; type: string; amount: number; currency: string; status: string; provider: string; createdAt: string; notes: string | null; }

// ── numbering + helpers ───────────────────────────────────────────────────────
async function nextNumber(tenantId: string, table: string, prefix: string): Promise<string> {
  const { count } = await svc().from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  return `${prefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}
function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((s, it) => s + num(it.quantity) * num(it.unitPrice), 0);
  const taxAmount = Math.round(subtotal * (num(taxRate) / 100) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, taxAmount, total: Math.round((subtotal + taxAmount) * 100) / 100 };
}
async function contactNames(tenantId: string, ids: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const real = Array.from(new Set(ids.filter(Boolean)));
  if (!real.length) return m;
  const { data } = await svc().from("tenant_contacts").select("id, name, email, phone").eq("tenant_id", tenantId).in("id", real);
  (data ?? []).forEach((c: any) => m.set(c.id, c.name || c.email || c.phone || "—"));
  return m;
}

// ── products ──────────────────────────────────────────────────────────────────
function rowToProduct(r: any): Product {
  return { id: r.id, name: r.name ?? "", description: r.description ?? "", price: num(r.price), currency: r.currency ?? "USD", type: r.type ?? "service", isActive: r.is_active !== false, imageUrl: r.image_url ?? null };
}
export async function listProducts(tenantId: string): Promise<Product[]> {
  const { data, error } = await svc().from("tenant_products").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToProduct);
}
export async function upsertProduct(tenantId: string, p: Partial<Product> & { name: string }): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = {
    tenant_id: tenantId, name: p.name, description: p.description ?? "", price: num(p.price),
    currency: p.currency ?? "USD", type: p.type ?? "service", is_active: p.isActive !== false,
    image_url: p.imageUrl ?? null, updated_at: new Date().toISOString(),
  };
  if (p.id) {
    const { error } = await svc().from("tenant_products").update(row).eq("tenant_id", tenantId).eq("id", p.id);
    return { ok: !error, error: error?.message };
  }
  const { error } = await svc().from("tenant_products").insert(row);
  return { ok: !error, error: error?.message };
}
export async function deleteProduct(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_products").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ── line items (shared invoice/estimate) ────────────────────────────────────────
async function replaceLineItems(tenantId: string, key: "invoice_id" | "estimate_id", parentId: string, items: LineItem[]): Promise<void> {
  const sb = svc();
  await sb.from("tenant_invoice_line_items").delete().eq("tenant_id", tenantId).eq(key, parentId);
  if (!items.length) return;
  const rows = items.map((it, i) => ({
    tenant_id: tenantId, [key]: parentId, product_id: it.productId ?? null,
    description: it.description, quantity: num(it.quantity), unit_price: num(it.unitPrice),
    line_total: Math.round(num(it.quantity) * num(it.unitPrice) * 100) / 100, position: i,
  }));
  await sb.from("tenant_invoice_line_items").insert(rows);
}
async function loadLineItems(tenantId: string, key: "invoice_id" | "estimate_id", parentId: string): Promise<LineItem[]> {
  const { data } = await svc().from("tenant_invoice_line_items").select("*").eq("tenant_id", tenantId).eq(key, parentId).order("position", { ascending: true });
  return (data ?? []).map((r: any) => ({ id: r.id, description: r.description ?? "", quantity: num(r.quantity), unitPrice: num(r.unit_price), lineTotal: num(r.line_total), productId: r.product_id ?? null }));
}

// ── invoices ────────────────────────────────────────────────────────────────────
function rowToInvoice(r: any, name: string): Invoice {
  return {
    id: r.id, invoiceNumber: r.invoice_number ?? "", contactId: r.contact_id ?? null, contactName: name,
    status: r.status ?? "draft", issueDate: r.issue_date, dueDate: r.due_date ?? null,
    subtotal: num(r.subtotal), taxRate: num(r.tax_rate), taxAmount: num(r.tax_amount), totalAmount: num(r.total_amount),
    amountPaid: num(r.amount_paid), currency: r.currency ?? "USD", notes: r.notes ?? null, customerNotes: r.customer_notes ?? null,
    paymentLinkUrl: r.payment_link_url ?? null,
  };
}
export async function listInvoices(tenantId: string, opts: { status?: string } = {}): Promise<Invoice[]> {
  let q = svc().from("tenant_invoices").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error || !data) return [];
  const names = await contactNames(tenantId, data.map((r: any) => r.contact_id));
  return data.map((r: any) => rowToInvoice(r, r.contact_id ? names.get(r.contact_id) ?? "—" : "—"));
}
export async function getInvoice(tenantId: string, id: string): Promise<InvoiceFull | null> {
  const { data, error } = await svc().from("tenant_invoices").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const names = await contactNames(tenantId, [data.contact_id]);
  const items = await loadLineItems(tenantId, "invoice_id", id);
  return { ...rowToInvoice(data, data.contact_id ? names.get(data.contact_id) ?? "—" : "—"), items };
}
export interface InvoiceInput { contactId?: string | null; dueDate?: string | null; taxRate?: number; notes?: string; customerNotes?: string; currency?: string; items: LineItem[]; }
export async function createInvoice(tenantId: string, input: InvoiceInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const t = computeTotals(input.items, input.taxRate ?? 0);
  const number = await nextNumber(tenantId, "tenant_invoices", "INV");
  const { data, error } = await svc().from("tenant_invoices").insert({
    tenant_id: tenantId, contact_id: input.contactId ?? null, invoice_number: number, status: "draft",
    due_date: input.dueDate ?? null, subtotal: t.subtotal, tax_rate: num(input.taxRate), tax_amount: t.taxAmount,
    total_amount: t.total, currency: input.currency ?? "USD", notes: input.notes ?? null, customer_notes: input.customerNotes ?? null,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message };
  await replaceLineItems(tenantId, "invoice_id", data.id, input.items);
  return { ok: true, id: data.id };
}
export async function updateInvoice(tenantId: string, id: string, input: InvoiceInput): Promise<{ ok: boolean; error?: string }> {
  const t = computeTotals(input.items, input.taxRate ?? 0);
  const { error } = await svc().from("tenant_invoices").update({
    contact_id: input.contactId ?? null, due_date: input.dueDate ?? null, subtotal: t.subtotal,
    tax_rate: num(input.taxRate), tax_amount: t.taxAmount, total_amount: t.total, currency: input.currency ?? "USD",
    notes: input.notes ?? null, customer_notes: input.customerNotes ?? null, updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await replaceLineItems(tenantId, "invoice_id", id, input.items);
  return { ok: true };
}
export async function setInvoiceStatus(tenantId: string, id: string, status: string): Promise<void> {
  await svc().from("tenant_invoices").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
}
export async function markInvoicePaid(tenantId: string, id: string, provider: "manual" | "stripe" = "manual"): Promise<{ ok: boolean }> {
  const inv = await getInvoice(tenantId, id);
  if (!inv) return { ok: false };
  await svc().from("tenant_invoices").update({ status: "paid", amount_paid: inv.totalAmount, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
  await svc().from("tenant_transactions").insert({
    tenant_id: tenantId, invoice_id: id, contact_id: inv.contactId, type: "payment",
    amount: inv.totalAmount, currency: inv.currency, status: "succeeded", provider, notes: `Invoice ${inv.invoiceNumber}`,
  });
  return { ok: true };
}
export async function deleteInvoice(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_invoices").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ── estimates ────────────────────────────────────────────────────────────────────
function rowToEstimate(r: any, name: string): Estimate {
  return {
    id: r.id, estimateNumber: r.estimate_number ?? "", contactId: r.contact_id ?? null, contactName: name,
    status: r.status ?? "draft", issueDate: r.issue_date, expiryDate: r.expiry_date ?? null,
    subtotal: num(r.subtotal), taxRate: num(r.tax_rate), taxAmount: num(r.tax_amount), totalAmount: num(r.total_amount),
    currency: r.currency ?? "USD", notes: r.notes ?? null, customerNotes: r.customer_notes ?? null,
  };
}
export async function listEstimates(tenantId: string): Promise<Estimate[]> {
  const { data, error } = await svc().from("tenant_estimates").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error || !data) return [];
  const names = await contactNames(tenantId, data.map((r: any) => r.contact_id));
  return data.map((r: any) => rowToEstimate(r, r.contact_id ? names.get(r.contact_id) ?? "—" : "—"));
}
export async function getEstimate(tenantId: string, id: string): Promise<EstimateFull | null> {
  const { data, error } = await svc().from("tenant_estimates").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error || !data) return null;
  const names = await contactNames(tenantId, [data.contact_id]);
  const items = await loadLineItems(tenantId, "estimate_id", id);
  return { ...rowToEstimate(data, data.contact_id ? names.get(data.contact_id) ?? "—" : "—"), items };
}
export async function createEstimate(tenantId: string, input: InvoiceInput & { expiryDate?: string | null }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const t = computeTotals(input.items, input.taxRate ?? 0);
  const number = await nextNumber(tenantId, "tenant_estimates", "EST");
  const { data, error } = await svc().from("tenant_estimates").insert({
    tenant_id: tenantId, contact_id: input.contactId ?? null, estimate_number: number, status: "draft",
    expiry_date: input.expiryDate ?? null, subtotal: t.subtotal, tax_rate: num(input.taxRate), tax_amount: t.taxAmount,
    total_amount: t.total, currency: input.currency ?? "USD", notes: input.notes ?? null, customer_notes: input.customerNotes ?? null,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message };
  await replaceLineItems(tenantId, "estimate_id", data.id, input.items);
  return { ok: true, id: data.id };
}
export async function updateEstimate(tenantId: string, id: string, input: InvoiceInput & { expiryDate?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const t = computeTotals(input.items, input.taxRate ?? 0);
  const { error } = await svc().from("tenant_estimates").update({
    contact_id: input.contactId ?? null, expiry_date: input.expiryDate ?? null, subtotal: t.subtotal,
    tax_rate: num(input.taxRate), tax_amount: t.taxAmount, total_amount: t.total, currency: input.currency ?? "USD",
    notes: input.notes ?? null, customer_notes: input.customerNotes ?? null, updated_at: new Date().toISOString(),
  }).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await replaceLineItems(tenantId, "estimate_id", id, input.items);
  return { ok: true };
}
export async function setEstimateStatus(tenantId: string, id: string, status: string): Promise<void> {
  await svc().from("tenant_estimates").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
}
export async function deleteEstimate(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_estimates").delete().eq("tenant_id", tenantId).eq("id", id);
}
/** Convert an accepted estimate into a draft invoice (copies line items + totals). */
export async function convertEstimateToInvoice(tenantId: string, estimateId: string): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const est = await getEstimate(tenantId, estimateId);
  if (!est) return { ok: false, error: "Estimate not found." };
  const created = await createInvoice(tenantId, {
    contactId: est.contactId, taxRate: est.taxRate, notes: est.notes ?? undefined, customerNotes: est.customerNotes ?? undefined,
    currency: est.currency, items: est.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal, productId: i.productId })),
  });
  if (!created.ok || !created.id) return { ok: false, error: created.error };
  await svc().from("tenant_estimates").update({ status: "converted", converted_invoice_id: created.id, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", estimateId);
  return { ok: true, invoiceId: created.id };
}

// ── transactions ──────────────────────────────────────────────────────────────────
export async function listTransactions(tenantId: string, limit = 100): Promise<Transaction[]> {
  const { data, error } = await svc().from("tenant_transactions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, invoiceId: r.invoice_id ?? null, contactId: r.contact_id ?? null, type: r.type, amount: num(r.amount), currency: r.currency ?? "USD", status: r.status, provider: r.provider ?? "manual", createdAt: r.created_at, notes: r.notes ?? null }));
}

// ── customer-initiated Stripe pay link (D-303 — NOT a charge) ─────────────────────
const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

/**
 * Generate a Stripe-hosted Checkout URL for an invoice. The CUSTOMER completes payment on
 * Stripe's page — we never call /v1/charges. Requires the tenant's Stripe to be connected.
 * Returns the hosted url, also stored on the invoice. (Auto-mark-paid via Stripe webhook is a
 * planned fast-follow; for now the tenant marks the invoice paid once funds clear.)
 */
export async function createInvoicePaymentLink(tenantId: string, invoiceId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!(await stripeReady(tenantId))) return { ok: false, error: "Connect Stripe in Settings → Integrations to enable pay links." };
  const inv = await getInvoice(tenantId, invoiceId);
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.totalAmount <= 0) return { ok: false, error: "Invoice total must be greater than zero." };
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${APP_BASE}/pay/thanks?inv=${invoiceId}`);
  params.set("cancel_url", `${APP_BASE}/pay/cancelled?inv=${invoiceId}`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", inv.currency.toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(Math.round(inv.totalAmount * 100)));
  params.set("line_items[0][price_data][product_data][name]", `Invoice ${inv.invoiceNumber}`);
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.secret_key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) return { ok: false, error: json?.error?.message || `Stripe ${res.status}` };
    await svc().from("tenant_invoices").update({ payment_link_url: json.url, external_invoice_id: json.id, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", invoiceId);
    return { ok: true, url: json.url };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Stripe request failed." }; }
}

// ── send invoice email (transactional, drafts-only safe) ──────────────────────────
import { sendEmail } from "./email-send";
export async function sendInvoiceEmail(tenantId: string, invoiceId: string): Promise<{ ok: boolean; error?: string }> {
  const inv = await getInvoice(tenantId, invoiceId);
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (!inv.contactId) return { ok: false, error: "Attach a contact (with an email) first." };
  const { data: c } = await svc().from("tenant_contacts").select("email, name").eq("tenant_id", tenantId).eq("id", inv.contactId).maybeSingle();
  if (!c?.email) return { ok: false, error: "This contact has no email address." };

  const rows = inv.items.map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.description)}</td><td style="text-align:right">${i.quantity} × ${money(i.unitPrice, inv.currency)}</td><td style="text-align:right">${money(i.lineTotal, inv.currency)}</td></tr>`).join("");
  const payBtn = inv.paymentLinkUrl ? `<p style="margin:18px 0"><a href="${inv.paymentLinkUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Pay invoice</a></p>` : "";
  const html = `
    <h2 style="margin:0 0 4px">Invoice ${escapeHtml(inv.invoiceNumber)}</h2>
    <p style="color:#64748b;margin:0 0 16px">${inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "Thank you for your business."}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    <hr style="margin:12px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="text-align:right;font-size:15px"><strong>Total: ${money(inv.totalAmount, inv.currency)}</strong></p>
    ${payBtn}
    ${inv.customerNotes ? `<p style="color:#64748b;font-size:13px">${escapeHtml(inv.customerNotes)}</p>` : ""}`;
  const res = await sendEmail(tenantId, { to: c.email, subject: `Invoice ${inv.invoiceNumber}`, html, footer: "appointment" });
  if (res.ok) await setInvoiceStatus(tenantId, invoiceId, "sent");
  return { ok: res.ok, error: res.error };
}
function money(n: number, ccy: string): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(n); }
function escapeHtml(s: string): string { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
