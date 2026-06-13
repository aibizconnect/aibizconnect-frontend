"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { listContacts } from "@/lib/crm";
import { stripeReady } from "@/lib/server/payments";
import {
  listProducts, upsertProduct, deleteProduct,
  listInvoices, getInvoice, createInvoice, updateInvoice, setInvoiceStatus, markInvoicePaid, deleteInvoice,
  createInvoicePaymentLink, sendInvoiceEmail,
  listEstimates, getEstimate, createEstimate, updateEstimate, setEstimateStatus, deleteEstimate, convertEstimateToInvoice,
  listTransactions,
  type Product, type Invoice, type InvoiceFull, type InvoiceInput, type Estimate, type EstimateFull, type Transaction,
} from "@/lib/server/billing";

export interface ContactLite { id: string; name: string; email: string }

export async function paymentsBootstrap(tenantId: string): Promise<{
  products: Product[]; invoices: Invoice[]; estimates: Estimate[]; transactions: Transaction[]; contacts: ContactLite[]; stripeOn: boolean;
}> {
  await requireTenantAccess(tenantId);
  const [products, invoices, estimates, transactions, contactsRaw, stripeOn] = await Promise.all([
    listProducts(tenantId).catch(() => []),
    listInvoices(tenantId).catch(() => []),
    listEstimates(tenantId).catch(() => []),
    listTransactions(tenantId).catch(() => []),
    listContacts(tenantId).catch(() => []),
    stripeReady(tenantId).catch(() => false),
  ]);
  const contacts = contactsRaw.map((c) => ({ id: c.id, name: c.name || c.email || c.phone || "—", email: c.email }));
  return { products, invoices, estimates, transactions, contacts, stripeOn };
}

// products
export async function saveProductAction(tenantId: string, p: Partial<Product> & { name: string }): Promise<Product[]> {
  await requireTenantAccess(tenantId); await upsertProduct(tenantId, p); return listProducts(tenantId);
}
export async function deleteProductAction(tenantId: string, id: string): Promise<Product[]> {
  await requireTenantAccess(tenantId); await deleteProduct(tenantId, id); return listProducts(tenantId);
}

// invoices
export async function getInvoiceAction(tenantId: string, id: string): Promise<InvoiceFull | null> {
  await requireTenantAccess(tenantId); return getInvoice(tenantId, id);
}
export async function saveInvoiceAction(tenantId: string, input: InvoiceInput, id?: string): Promise<{ ok: boolean; id?: string; error?: string; invoices: Invoice[] }> {
  await requireTenantAccess(tenantId);
  const res = id ? { ...(await updateInvoice(tenantId, id, input)), id } : await createInvoice(tenantId, input);
  return { ...res, invoices: await listInvoices(tenantId) };
}
export async function invoiceStatusAction(tenantId: string, id: string, status: string): Promise<Invoice[]> {
  await requireTenantAccess(tenantId); await setInvoiceStatus(tenantId, id, status); return listInvoices(tenantId);
}
export async function markPaidAction(tenantId: string, id: string): Promise<Invoice[]> {
  await requireTenantAccess(tenantId); await markInvoicePaid(tenantId, id, "manual"); return listInvoices(tenantId);
}
export async function deleteInvoiceAction(tenantId: string, id: string): Promise<Invoice[]> {
  await requireTenantAccess(tenantId); await deleteInvoice(tenantId, id); return listInvoices(tenantId);
}
export async function payLinkAction(tenantId: string, id: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireTenantAccess(tenantId); return createInvoicePaymentLink(tenantId, id);
}
export async function sendInvoiceAction(tenantId: string, id: string): Promise<{ ok: boolean; error?: string; invoices: Invoice[] }> {
  await requireTenantAccess(tenantId);
  const res = await sendInvoiceEmail(tenantId, id);
  return { ...res, invoices: await listInvoices(tenantId) };
}

// estimates
export async function getEstimateAction(tenantId: string, id: string): Promise<EstimateFull | null> {
  await requireTenantAccess(tenantId); return getEstimate(tenantId, id);
}
export async function saveEstimateAction(tenantId: string, input: InvoiceInput & { expiryDate?: string | null }, id?: string): Promise<{ ok: boolean; id?: string; error?: string; estimates: Estimate[] }> {
  await requireTenantAccess(tenantId);
  const res = id ? { ...(await updateEstimate(tenantId, id, input)), id } : await createEstimate(tenantId, input);
  return { ...res, estimates: await listEstimates(tenantId) };
}
export async function estimateStatusAction(tenantId: string, id: string, status: string): Promise<Estimate[]> {
  await requireTenantAccess(tenantId); await setEstimateStatus(tenantId, id, status); return listEstimates(tenantId);
}
export async function deleteEstimateAction(tenantId: string, id: string): Promise<Estimate[]> {
  await requireTenantAccess(tenantId); await deleteEstimate(tenantId, id); return listEstimates(tenantId);
}
export async function convertEstimateAction(tenantId: string, id: string): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  await requireTenantAccess(tenantId); return convertEstimateToInvoice(tenantId, id);
}
