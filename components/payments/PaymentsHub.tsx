"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  saveProductAction, deleteProductAction,
  getInvoiceAction, saveInvoiceAction, invoiceStatusAction, markPaidAction, deleteInvoiceAction, payLinkAction, sendInvoiceAction,
  getEstimateAction, saveEstimateAction, deleteEstimateAction, convertEstimateAction,
  type ContactLite,
} from "@/app/tenants/[tenantId]/payments/actions";
import type { Product, Invoice, Estimate, Transaction, LineItem } from "@/lib/server/billing";

/**
 * Payments hub (D-302..306) — GHL parity. Invoices · Estimates · Products · Transactions live;
 * Subscriptions/Recurring/Coupons/Orders are honest "soon". Invoices/estimates are records with
 * line items + live totals; "Send" emails the customer (transactional), "Pay link" generates a
 * customer-initiated Stripe checkout URL (we never charge), "Mark paid" logs a manual payment.
 */

type Bootstrap = { products: Product[]; invoices: Invoice[]; estimates: Estimate[]; transactions: Transaction[]; contacts: ContactLite[]; stripeOn: boolean };
type TabKey = "invoices" | "estimates" | "products" | "transactions" | "subscriptions" | "recurring" | "coupons" | "orders";
const TABS: { key: TabKey; label: string; soon?: boolean }[] = [
  { key: "invoices", label: "Invoices" }, { key: "estimates", label: "Estimates" },
  { key: "products", label: "Products" }, { key: "transactions", label: "Transactions" },
  { key: "subscriptions", label: "Subscriptions", soon: true }, { key: "recurring", label: "Recurring", soon: true },
  { key: "coupons", label: "Coupons", soon: true }, { key: "orders", label: "Orders", soon: true },
];

const money = (n: number, ccy = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(n || 0);
const STATUS_TINT: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", sent: "bg-sky-100 text-sky-700", viewed: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700", partially_paid: "bg-amber-100 text-amber-700", overdue: "bg-rose-100 text-rose-700",
  void: "bg-slate-200 text-slate-500", refunded: "bg-slate-100 text-slate-500",
  accepted: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700", converted: "bg-violet-100 text-violet-700",
};
const Badge = ({ s }: { s: string }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[s] ?? "bg-slate-100 text-slate-600"}`}>{s.replace("_", " ")}</span>;

export default function PaymentsHub({ tenantId, initial }: { tenantId: string; initial: Bootstrap }) {
  const [tab, setTab] = useState<TabKey>("invoices");
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [invoices, setInvoices] = useState<Invoice[]>(initial.invoices);
  const [estimates, setEstimates] = useState<Estimate[]>(initial.estimates);
  const [transactions] = useState<Transaction[]>(initial.transactions);
  const [editor, setEditor] = useState<{ kind: "invoice" | "estimate"; id?: string } | null>(null);
  const [productModal, setProductModal] = useState<Product | "new" | null>(null);

  const outstanding = useMemo(() => invoices.filter((i) => i.status !== "paid" && i.status !== "void").reduce((s, i) => s + i.totalAmount, 0), [invoices]);
  const collected = useMemo(() => transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0), [transactions]);

  return (
    <div className="mx-auto max-w-6xl px-2 py-1">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-500">Invoices, estimates, products — get paid without leaving the platform.</p>
        </div>
        <div className="flex gap-2 text-right text-xs text-slate-500">
          <div className="rounded-lg border border-slate-200 px-3 py-1.5"><div className="text-[11px] uppercase tracking-wide">Outstanding</div><div className="text-sm font-semibold text-slate-900">{money(outstanding)}</div></div>
          <div className="rounded-lg border border-slate-200 px-3 py-1.5"><div className="text-[11px] uppercase tracking-wide">Collected</div><div className="text-sm font-semibold text-emerald-700">{money(collected)}</div></div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-5 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} disabled={t.soon} onClick={() => !t.soon && setTab(t.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium ${tab === t.key ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-800"} ${t.soon ? "cursor-default opacity-50" : ""}`}>
            {t.label}{t.soon && <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] uppercase text-slate-400">soon</span>}
          </button>
        ))}
        <Link href={`/tenants/${tenantId}/settings`} className="-mb-px ml-auto border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-slate-400 hover:text-slate-700">Settings ↗</Link>
      </div>

      {tab === "invoices" && (
        <DocList kind="invoice" rows={invoices} stripeOn={initial.stripeOn} tenantId={tenantId}
          onNew={() => setEditor({ kind: "invoice" })} onOpen={(id) => setEditor({ kind: "invoice", id })} setInvoices={setInvoices} />
      )}
      {tab === "estimates" && (
        <DocList kind="estimate" rows={estimates} stripeOn={initial.stripeOn} tenantId={tenantId}
          onNew={() => setEditor({ kind: "estimate" })} onOpen={(id) => setEditor({ kind: "estimate", id })} setEstimates={setEstimates} setInvoices={setInvoices} setTab={setTab} />
      )}
      {tab === "products" && <ProductsTab products={products} onNew={() => setProductModal("new")} onEdit={(p) => setProductModal(p)} onDelete={async (id) => setProducts(await deleteProductAction(tenantId, id))} />}
      {tab === "transactions" && <TransactionsTab rows={transactions} />}

      {editor && (
        <DocEditor tenantId={tenantId} kind={editor.kind} id={editor.id} products={products} contacts={initial.contacts}
          onClose={() => setEditor(null)}
          onSaved={(inv, est) => { if (inv) setInvoices(inv); if (est) setEstimates(est); setEditor(null); }} />
      )}
      {productModal && (
        <ProductModal tenantId={tenantId} initial={productModal === "new" ? null : productModal}
          onClose={() => setProductModal(null)} onSaved={(list) => { setProducts(list); setProductModal(null); }} />
      )}
    </div>
  );
}

// ── document list (invoices + estimates share this) ───────────────────────────────
function DocList({ kind, rows, tenantId, stripeOn, onNew, onOpen, setInvoices, setEstimates, setTab }: {
  kind: "invoice" | "estimate"; rows: (Invoice | Estimate)[]; tenantId: string; stripeOn: boolean;
  onNew: () => void; onOpen: (id: string) => void;
  setInvoices?: (v: Invoice[]) => void; setEstimates?: (v: Estimate[]) => void; setTab?: (t: TabKey) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const isInv = kind === "invoice";

  async function act(fn: () => Promise<void>, id: string) { setBusy(id); setMsg(null); try { await fn(); } finally { setBusy(null); } }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">{rows.length} {isInv ? "invoice" : "estimate"}{rows.length === 1 ? "" : "s"}</span>
        <button onClick={onNew} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a]">+ New {isInv ? "invoice" : "estimate"}</button>
      </div>
      {msg && <div className="mb-2 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">{msg}</div>}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-400">
          No {isInv ? "invoices" : "estimates"} yet. Create one to bill a contact.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Customer</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Total</th><th className="px-4 py-2.5">{isInv ? "Due" : "Expires"}</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const number = isInv ? (r as Invoice).invoiceNumber : (r as Estimate).estimateNumber;
                const dateV = isInv ? (r as Invoice).dueDate : (r as Estimate).expiryDate;
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5"><button onClick={() => onOpen(r.id)} className="font-medium text-[#1e3a8a] hover:underline">{number}</button></td>
                    <td className="px-4 py-2.5 text-slate-700">{r.contactName}</td>
                    <td className="px-4 py-2.5"><Badge s={r.status} /></td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(r.totalAmount, r.currency)}</td>
                    <td className="px-4 py-2.5 text-slate-500">{dateV ? new Date(dateV).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5 text-xs">
                        {isInv ? (
                          <>
                            <button disabled={busy === r.id} onClick={() => act(async () => { const res = await sendInvoiceAction(tenantId, r.id); setInvoices?.(res.invoices); if (!res.ok) setMsg(res.error ?? "Send failed."); else setMsg(`Sent ${number}.`); }, r.id)} className="rounded border border-slate-200 px-2 py-1 hover:bg-white">Send</button>
                            <button disabled={busy === r.id} onClick={() => act(async () => { const res = await payLinkAction(tenantId, r.id); setMsg(res.ok ? `Pay link ready: ${res.url}` : (res.error ?? "Could not create link.")); }, r.id)} title={stripeOn ? "Generate a customer-pay Stripe link" : "Connect Stripe in Settings to enable"} className="rounded border border-slate-200 px-2 py-1 hover:bg-white">Pay link</button>
                            <button disabled={busy === r.id || r.status === "paid"} onClick={() => act(async () => setInvoices?.(await markPaidAction(tenantId, r.id)), r.id)} className="rounded border border-emerald-200 px-2 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Mark paid</button>
                            <button disabled={busy === r.id} onClick={() => act(async () => { if (confirm(`Delete ${number}?`)) setInvoices?.(await deleteInvoiceAction(tenantId, r.id)); }, r.id)} className="rounded border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">Delete</button>
                          </>
                        ) : (
                          <>
                            <button disabled={busy === r.id || r.status === "converted"} onClick={() => act(async () => { const res = await convertEstimateAction(tenantId, r.id); if (res.ok) { setMsg(`Converted ${number} → invoice. See Invoices.`); setTab?.("invoices"); } else setMsg(res.error ?? "Convert failed."); }, r.id)} className="rounded border border-violet-200 px-2 py-1 text-violet-700 hover:bg-violet-50 disabled:opacity-40">Convert → invoice</button>
                            <button disabled={busy === r.id} onClick={() => act(async () => { if (confirm(`Delete ${number}?`)) setEstimates?.(await deleteEstimateAction(tenantId, r.id)); }, r.id)} className="rounded border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── invoice/estimate editor (modal) ────────────────────────────────────────────────
type DraftItem = { description: string; quantity: number; unitPrice: number; productId: string | null };
function DocEditor({ tenantId, kind, id, products, contacts, onClose, onSaved }: {
  tenantId: string; kind: "invoice" | "estimate"; id?: string; products: Product[]; contacts: ContactLite[];
  onClose: () => void; onSaved: (inv?: Invoice[], est?: Estimate[]) => void;
}) {
  const isInv = kind === "invoice";
  const [loading, setLoading] = useState(!!id);
  const [contactId, setContactId] = useState("");
  const [dateV, setDateV] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ description: "", quantity: 1, unitPrice: 0, productId: null }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // load existing
  useMemo(() => {
    if (!id) return;
    (async () => {
      const doc = isInv ? await getInvoiceAction(tenantId, id) : await getEstimateAction(tenantId, id);
      if (doc) {
        setContactId(doc.contactId ?? ""); setTaxRate(doc.taxRate); setCurrency(doc.currency);
        setNotes(doc.notes ?? ""); setCustomerNotes(doc.customerNotes ?? "");
        setDateV(isInv ? ((doc as any).dueDate?.slice(0, 10) ?? "") : ((doc as any).expiryDate?.slice(0, 10) ?? ""));
        setItems(doc.items.length ? doc.items.map((i: LineItem) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, productId: i.productId ?? null })) : [{ description: "", quantity: 1, unitPrice: 0, productId: null }]);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const taxAmount = Math.round(subtotal * (Number(taxRate) || 0) / 100 * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  function setItem(i: number, patch: Partial<DraftItem>) { setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  function pickProduct(i: number, pid: string) {
    const p = products.find((x) => x.id === pid);
    if (p) setItem(i, { productId: p.id, description: p.name, unitPrice: p.price });
    else setItem(i, { productId: null });
  }

  async function save() {
    setSaving(true); setErr(null);
    const cleanItems: LineItem[] = items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 0, unitPrice: Number(i.unitPrice) || 0, lineTotal: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), productId: i.productId }));
    if (!cleanItems.length) { setErr("Add at least one line item."); setSaving(false); return; }
    const input = { contactId: contactId || null, taxRate: Number(taxRate) || 0, currency, notes, customerNotes, items: cleanItems, ...(isInv ? { dueDate: dateV || null } : { expiryDate: dateV || null }) };
    try {
      if (isInv) { const r = await saveInvoiceAction(tenantId, input, id); if (!r.ok) { setErr(r.error ?? "Save failed."); return; } onSaved(r.invoices); }
      else { const r = await saveEstimateAction(tenantId, input as any, id); if (!r.ok) { setErr(r.error ?? "Save failed."); return; } onSaved(undefined, r.estimates); }
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} title={`${id ? "Edit" : "New"} ${isInv ? "invoice" : "estimate"}`} wide>
      {loading ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Customer</span>
              <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">— select contact —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">{isInv ? "Due date" : "Expiry date"}</span>
              <input type="date" value={dateV} onChange={(e) => setDateV(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {["USD", "CAD", "EUR", "GBP", "AUD"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr,70px,110px,90px,32px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span className="text-right">Total</span><span></span>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr,70px,110px,90px,32px] items-center gap-2 px-3 py-2">
                <div className="space-y-1">
                  <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Description" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                  {products.length > 0 && (
                    <select value={it.productId ?? ""} onChange={(e) => pickProduct(i, e.target.value)} className="w-full rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">
                      <option value="">from product…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price, p.currency)}</option>)}
                    </select>
                  )}
                </div>
                <input type="number" min={0} value={it.quantity} onChange={(e) => setItem(i, { quantity: Number(e.target.value) })} className="rounded border border-slate-200 px-2 py-1 text-right text-sm" />
                <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })} className="rounded border border-slate-200 px-2 py-1 text-right text-sm" />
                <span className="text-right text-sm text-slate-700">{money((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), currency)}</span>
                <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-600" title="Remove">✕</button>
              </div>
            ))}
            <button onClick={() => setItems((p) => [...p, { description: "", quantity: 1, unitPrice: 0, productId: null }])} className="px-3 py-2 text-xs font-medium text-[#1e3a8a] hover:underline">+ Add line</button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} rows={2} placeholder="Notes to customer (shown on the invoice)" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1">Tax <input type="number" min={0} step="0.1" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right text-xs" />%</span>
                <span>{money(taxAmount, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900"><span>Total</span><span>{money(total, currency)}</span></div>
            </div>
          </div>

          {err && <div className="rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a] disabled:opacity-50">{saving ? "Saving…" : `Save ${isInv ? "invoice" : "estimate"}`}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── products ─────────────────────────────────────────────────────────────────────
function ProductsTab({ products, onNew, onEdit, onDelete }: { products: Product[]; onNew: () => void; onEdit: (p: Product) => void; onDelete: (id: string) => void }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">{products.length} product{products.length === 1 ? "" : "s"}</span>
        <button onClick={onNew} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a]">+ New product</button>
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-400">No products yet. Add your services or products to reuse them on invoices.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{p.name}</div>
                  <div className="text-xs capitalize text-slate-400">{p.type.replace("_", " ")}{!p.isActive && " · inactive"}</div>
                </div>
                <div className="text-right font-semibold text-slate-900">{money(p.price, p.currency)}</div>
              </div>
              {p.description && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
              <div className="mt-3 flex gap-2 text-xs">
                <button onClick={() => onEdit(p)} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Edit</button>
                <button onClick={() => { if (confirm(`Delete ${p.name}?`)) onDelete(p.id); }} className="rounded border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductModal({ tenantId, initial, onClose, onSaved }: { tenantId: string; initial: Product | null; onClose: () => void; onSaved: (list: Product[]) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [type, setType] = useState(initial?.type ?? "service");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr(null);
    try {
      const list = await saveProductAction(tenantId, { id: initial?.id, name, description, price: Number(price) || 0, currency, type, isActive });
      onSaved(list);
    } finally { setSaving(false); }
  }
  return (
    <Modal onClose={onClose} title={initial ? "Edit product" : "New product"}>
      <div className="space-y-3">
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Price</span><input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Currency</span><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{["USD", "CAD", "EUR", "GBP", "AUD"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Type</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="service">Service</option><option value="product">Product</option><option value="one_time_fee">One-time fee</option></select></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" /> Active</label>
        {err && <div className="rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a] disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function TransactionsTab({ rows }: { rows: Transaction[] }) {
  if (!rows.length) return <div className="rounded-xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-400">No transactions yet. Payments logged against invoices appear here.</div>;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Provider</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5 text-right">Amount</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2.5 capitalize text-slate-700">{t.type}</td>
              <td className="px-4 py-2.5 capitalize text-slate-500">{t.provider}</td>
              <td className="px-4 py-2.5"><Badge s={t.status} /></td>
              <td className="px-4 py-2.5 text-right font-medium text-slate-900">{money(t.amount, t.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-2xl bg-white p-5 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
