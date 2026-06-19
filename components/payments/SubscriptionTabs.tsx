"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  savePlanAction, deletePlanAction, reorderPlansAction,
  createSubscriptionAction, activateSubscriptionAction, renewSubscriptionAction,
  extendTrialAction, compSubscriptionAction, subscriptionStatusAction, changePlanAction, deleteSubscriptionAction,
  saveCouponAction, deleteCouponAction,
} from "@/app/tenants/[tenantId]/payments/subscriptions-actions";
import type { SubscriptionPlan, SubscriptionRow, SubState, SubInterval, Entitlement, EnforceMode } from "@/lib/server/subscriptions";
import type { Coupon, CouponType } from "@/lib/server/coupons";
import type { ContactLite } from "@/app/tenants/[tenantId]/payments/actions";

/**
 * The subscription flow tabs (D-400): Subscriptions (define levels) → Orders (new orders/trials)
 * → Recurring (converted, paying clients) → Coupons. All ride the lib/server/subscriptions engine
 * (per-tenant plans + contact subscriptions); Coupons use lib/server/coupons (tenant_coupons).
 */

const m = (cents: number | null, ccy = "USD") =>
  cents === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(cents / 100);
const per = (i: SubInterval) => (i === "year" ? "/yr" : i === "week" ? "/wk" : "/mo");
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

const SUB_BADGE: Record<SubState, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
  trial: { label: "Trial", cls: "bg-sky-100 text-sky-700" },
  trial_expired: { label: "Trial expired", cls: "bg-rose-100 text-rose-700" },
  paying: { label: "Active", cls: "bg-emerald-100 text-emerald-700" },
  due: { label: "Past due", cls: "bg-rose-100 text-rose-700" },
  comp: { label: "Free (comp)", cls: "bg-violet-100 text-violet-700" },
  canceled: { label: "Canceled", cls: "bg-slate-200 text-slate-500" },
};
const Badge = ({ s }: { s: SubState }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SUB_BADGE[s].cls}`}>{SUB_BADGE[s].label}</span>;
const btn = "rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40";
const primaryBtn = "rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";

function Empty({ title, sub }: { title: string; sub: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"><p className="font-medium text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{sub}</p></div>;
}

// ════════════════════════ Subscriptions (define levels) ════════════════════════
export function SubscriptionsTab({ tenantId, plans, onChange }: { tenantId: string; plans: SubscriptionPlan[]; onChange: (p: SubscriptionPlan[]) => void }) {
  const [editing, setEditing] = useState<SubscriptionPlan | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    onChange(await deletePlanAction(tenantId, id));
    setBusy(null);
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= plans.length) return;
    const next = [...plans];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next); // optimistic — reflects instantly
    setBusy("reorder");
    onChange(await reorderPlansAction(tenantId, next.map((p) => p.id)));
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">Define the subscription <b>levels</b> you offer (Basic, Pro, …). These are what customers subscribe to.</p>
        <button className={primaryBtn} onClick={() => setEditing("new")}>+ New level</button>
      </div>
      {plans.length === 0 ? (
        <Empty title="No subscription levels yet" sub="Create your tiers — name, price, billing cadence and an optional free trial." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p, i) => (
            <div key={p.id} className={`rounded-xl border bg-white p-4 ${p.isActive ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-sm text-slate-500">{m(p.amountCents, p.currency)}<span className="text-slate-400">{per(p.interval)}</span></div>
                </div>
                <div className="flex items-center gap-1">
                  {!p.isActive && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">inactive</span>}
                  <button title="Move earlier" disabled={i === 0 || busy === "reorder"} onClick={() => move(i, -1)}
                    className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30">←</button>
                  <button title="Move later" disabled={i === plans.length - 1 || busy === "reorder"} onClick={() => move(i, 1)}
                    className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30">→</button>
                </div>
              </div>
              {p.trialDays > 0 && <div className="mt-1 text-[11px] text-sky-600">{p.trialDays}-day free trial</div>}
              {p.description && <p className="mt-2 text-xs text-slate-500">{p.description}</p>}
              {p.features.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">{p.features.slice(0, 5).map((f, i) => <li key={i}>• {f}</li>)}</ul>
              )}
              <div className="mt-3 flex gap-2">
                <button className={btn} onClick={() => setEditing(p)}>Edit</button>
                <button className={`${btn} text-rose-500 hover:bg-rose-50`} disabled={busy === p.id} onClick={() => remove(p.id)}>{busy === p.id ? "…" : "Delete"}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <PlanEditor tenantId={tenantId} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(list) => { onChange(list); setEditing(null); }} />}
    </div>
  );
}

function PlanEditor({ tenantId, initial, onClose, onSaved }: { tenantId: string; initial: SubscriptionPlan | null; onClose: () => void; onSaved: (p: SubscriptionPlan[]) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amountCents / 100) : "");
  const [interval, setInterval] = useState<SubInterval>(initial?.interval ?? "month");
  const [trial, setTrial] = useState(String(initial?.trialDays ?? 0));
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [ents, setEnts] = useState<Entitlement[]>(initial?.entitlements ?? []);
  const [annKind, setAnnKind] = useState<string>(initial?.annualDiscountKind ?? "");   // "" = auto 20% off
  const [annVal, setAnnVal] = useState(initial?.annualDiscountValue != null ? String(initial.annualDiscountValue) : "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [ctaHref, setCtaHref] = useState(initial?.ctaHref ?? "");
  const [inheritLower, setInheritLower] = useState(initial?.inheritLower ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setBusy(true); setErr(null);
    try {
      const list = await savePlanAction(tenantId, {
        id: initial?.id, name: name.trim(), description: desc.trim() || null,
        amountCents: Math.round((Number(amount) || 0) * 100), interval, trialDays: Math.round(Number(trial) || 0),
        features: features.split("\n").map((f) => f.trim()).filter(Boolean), isActive: active,
        entitlements: ents.filter((e) => e.key && e.label),
        annualAmountCents: null,
        annualDiscountKind: (annKind || null) as any,
        annualDiscountValue: (annKind === "percent" || annKind === "amount") && annVal.trim() !== "" ? Number(annVal) : null,
        ctaLabel: ctaLabel.trim() || null, ctaHref: ctaHref.trim() || null, inheritLower,
      });
      onSaved(list);
    } catch (e: any) { setErr(e?.message ?? "Save failed."); } finally { setBusy(false); }
  }

  return (
    <Modal title={initial ? "Edit level" : "New subscription level"} onClose={onClose} max="max-w-2xl">
      <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price ($ / month)"><input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="49" type="number" className={inputCls} /></Field>
        <Field label="Annual discount">
          <div className="flex gap-2">
            <select value={annKind} onChange={(e) => setAnnKind(e.target.value)} className={inputCls}>
              <option value="">Auto (20% off)</option>
              <option value="percent">% off</option>
              <option value="amount">$ off / mo</option>
              <option value="none">No annual option</option>
            </select>
            {(annKind === "percent" || annKind === "amount") && (
              <input value={annVal} onChange={(e) => setAnnVal(e.target.value)} type="number"
                placeholder={annKind === "percent" ? "20" : "10"} className={`${inputCls} w-24`} />
            )}
          </div>
          {amount && (annKind === "percent" || annKind === "amount") && annVal && (
            <span className="mt-1 block text-[11px] text-slate-400">
              = ${annKind === "percent"
                ? Math.max(0, Math.round(Number(amount) * (1 - Number(annVal) / 100)))
                : Math.max(0, Math.round(Number(amount) - Number(annVal)))}/mo billed yearly
            </span>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Billing"><select value={interval} onChange={(e) => setInterval(e.target.value as SubInterval)} className={inputCls}><option value="month">Monthly</option><option value="year">Yearly</option><option value="week">Weekly</option></select></Field>
        <Field label="Free trial (days, 0 = none)"><input value={trial} onChange={(e) => setTrial(e.target.value)} type="number" className={inputCls} /></Field>
      </div>
      <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="For growing teams" className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Button text"><input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder='e.g. "Start Free" / "Start Now"' className={inputCls} /></Field>
        <Field label="Button link"><input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/start" className={inputCls} /></Field>
      </div>
      <Field label="Features (one per line)"><textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} className={inputCls} /></Field>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={inheritLower} onChange={(e) => setInheritLower(e.target.checked)} /> Include the tier below (show &ldquo;Everything in …, plus&rdquo;)</label>
      <EntitlementsEditor ents={ents} setEnts={setEnts} />
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (offered to customers)</label>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="mt-2 flex justify-end gap-2"><button className={btn} onClick={onClose}>Cancel</button><button className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save level"}</button></div>
    </Modal>
  );
}

// ════════════════════════ Orders (new orders / trials) ════════════════════════
export function OrdersTab({ tenantId, subscriptions, plans, contacts, onChange }: { tenantId: string; subscriptions: SubscriptionRow[]; plans: SubscriptionPlan[]; contacts: ContactLite[]; onChange: (s: SubscriptionRow[]) => void }) {
  const orders = useMemo(() => subscriptions.filter((s) => s.status === "pending" || s.status === "trialing"), [subscriptions]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<SubscriptionRow[]>) {
    setBusy(id); setErr(null);
    try { onChange(await fn()); } catch (e: any) { setErr(e?.message ?? "Failed."); } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">New <b>orders & trials</b>. Convert one to a client and it moves to <b>Recurring</b>.</p>
        <button className={primaryBtn} disabled={plans.length === 0} title={plans.length === 0 ? "Create a subscription level first" : undefined} onClick={() => setAdding(true)}>+ New order</button>
      </div>
      {err && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      {orders.length === 0 ? (
        <Empty title="No open orders or trials" sub={plans.length === 0 ? "Define a subscription level first, then start an order." : "New sign-ups and trials will land here."} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>
              <th className="px-4 py-2">Subscriber</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Started</th><th className="px-4 py-2">Trial ends</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {orders.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.contactName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.planName}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(s.startedAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(s.trialEndsAt)}{s.daysLeft !== null && s.status === "trialing" && <span className="ml-1 text-[11px] text-slate-400">({s.daysLeft < 0 ? `${Math.abs(s.daysLeft)}d ago` : `${s.daysLeft}d`})</span>}</td>
                  <td className="px-4 py-3"><Badge s={s.state} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button className={`${btn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`} disabled={busy === s.id} onClick={() => run(s.id, () => activateSubscriptionAction(tenantId, s.id))}>Convert to client</button>
                      <button className={btn} disabled={busy === s.id} onClick={() => run(s.id, () => extendTrialAction(tenantId, s.id, 14))}>+14d trial</button>
                      <button className={`${btn} text-rose-500 hover:bg-rose-50`} disabled={busy === s.id} onClick={() => run(s.id, () => subscriptionStatusAction(tenantId, s.id, "canceled"))}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <NewOrder tenantId={tenantId} plans={plans} contacts={contacts} onClose={() => setAdding(false)} onCreated={(list) => { onChange(list); setAdding(false); }} />}
    </div>
  );
}

function NewOrder({ tenantId, plans, contacts, onClose, onCreated }: { tenantId: string; plans: SubscriptionPlan[]; contacts: ContactLite[]; onClose: () => void; onCreated: (s: SubscriptionRow[]) => void }) {
  const active = plans.filter((p) => p.isActive);
  const [contactId, setContactId] = useState("");
  const [planId, setPlanId] = useState(active[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const filtered = useMemo(() => contacts.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.toLowerCase().includes(q.toLowerCase())).slice(0, 8), [contacts, q]);

  async function create() {
    if (!contactId) { setErr("Pick a contact."); return; }
    if (!planId) { setErr("Pick a level."); return; }
    setBusy(true); setErr(null);
    try { onCreated(await createSubscriptionAction(tenantId, contactId, planId)); } catch (e: any) { setErr(e?.message ?? "Failed."); } finally { setBusy(false); }
  }

  return (
    <Modal title="New order" onClose={onClose}>
      <Field label="Subscription level"><select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls}>{active.length === 0 ? <option value="">No active levels</option> : active.map((p) => <option key={p.id} value={p.id}>{p.name} — {m(p.amountCents, p.currency)}{per(p.interval)}{p.trialDays > 0 ? ` · ${p.trialDays}d trial` : ""}</option>)}</select></Field>
      <Field label="Customer (contact)">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className={inputCls} />
        <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-slate-200">
          {filtered.length === 0 ? <div className="px-3 py-2 text-xs text-slate-400">No contacts match.</div> : filtered.map((c) => (
            <button key={c.id} onClick={() => setContactId(c.id)} className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${contactId === c.id ? "bg-sky-50" : ""}`}>
              <span className="text-slate-700">{c.name}</span><span className="text-xs text-slate-400">{c.email}</span>
            </button>
          ))}
        </div>
      </Field>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="mt-2 flex justify-end gap-2"><button className={btn} onClick={onClose}>Cancel</button><button className={primaryBtn} disabled={busy} onClick={create}>{busy ? "Creating…" : "Create order"}</button></div>
    </Modal>
  );
}

// ════════════════════════ Recurring (paying clients) ════════════════════════
export function RecurringTab({ tenantId, subscriptions, plans, onChange }: { tenantId: string; subscriptions: SubscriptionRow[]; plans: SubscriptionPlan[]; onChange: (s: SubscriptionRow[]) => void }) {
  const rows = useMemo(() => subscriptions.filter((s) => s.status === "active" || s.status === "past_due" || s.status === "comp"), [subscriptions]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const mrr = useMemo(() => rows.filter((s) => s.state === "paying").reduce((sum, s) => sum + s.monthlyCents, 0), [rows]);
  const pastDue = rows.filter((s) => s.state === "due").length;

  async function run(id: string, fn: () => Promise<SubscriptionRow[]>) {
    setBusy(id); setErr(null);
    try { onChange(await fn()); } catch (e: any) { setErr(e?.message ?? "Failed."); } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat k="MRR" v={m(mrr)} />
        <Stat k="Active clients" v={String(rows.filter((s) => s.state === "paying" || s.state === "comp").length)} />
        <Stat k="Past due" v={String(pastDue)} tone={pastDue ? "rose" : undefined} />
      </div>
      {err && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      {rows.length === 0 ? (
        <Empty title="No recurring clients yet" sub="Convert an order/trial to a client and it appears here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>
              <th className="px-4 py-2">Client</th><th className="px-4 py-2">Level</th><th className="px-4 py-2">Amount</th><th className="px-4 py-2">Next due</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.contactName}</td>
                  <td className="px-4 py-3">
                    <select value={s.planId ?? ""} disabled={busy === s.id} onChange={(e) => run(s.id, () => changePlanAction(tenantId, s.id, e.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      {!s.planId && <option value="">—</option>}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.status === "comp" ? <span className="text-violet-600">$0 (comp)</span> : <>{m(s.amountCents, "USD")}<span className="text-slate-400">{per(s.interval)}</span></>}</td>
                  <td className={`px-4 py-3 ${s.daysLeft !== null && s.daysLeft < 0 ? "text-rose-600 font-medium" : "text-slate-500"}`}>{fmt(s.dueDate)}</td>
                  <td className="px-4 py-3"><Badge s={s.state} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button className={`${btn} border-emerald-200 text-emerald-700 hover:bg-emerald-50`} disabled={busy === s.id} onClick={() => run(s.id, () => renewSubscriptionAction(tenantId, s.id))}>Record payment</button>
                      {s.status === "comp"
                        ? <button className={`${btn} border-violet-200 text-violet-700 hover:bg-violet-50`} disabled={busy === s.id} onClick={() => run(s.id, () => compSubscriptionAction(tenantId, s.id, false))}>End comp</button>
                        : <button className={`${btn} border-violet-200 text-violet-700 hover:bg-violet-50`} disabled={busy === s.id} onClick={() => run(s.id, () => compSubscriptionAction(tenantId, s.id, true))}>Comp</button>}
                      <button className={`${btn} text-rose-500 hover:bg-rose-50`} disabled={busy === s.id} onClick={() => run(s.id, () => subscriptionStatusAction(tenantId, s.id, "canceled"))}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════ Coupons ════════════════════════
export function CouponsTab({ tenantId, coupons, onChange }: { tenantId: string; coupons: Coupon[]; onChange: (c: Coupon[]) => void }) {
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) { setBusy(id); onChange(await deleteCouponAction(tenantId, id)); setBusy(null); }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">Discount <b>codes</b> for your subscriptions and invoices.</p>
        <button className={primaryBtn} onClick={() => setEditing("new")}>+ New coupon</button>
      </div>
      {coupons.length === 0 ? (
        <Empty title="No coupons yet" sub="Create percentage or fixed-amount discount codes." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>
              <th className="px-4 py-2">Code</th><th className="px-4 py-2">Discount</th><th className="px-4 py-2">Expires</th><th className="px-4 py-2">Used</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{c.code}</td>
                  <td className="px-4 py-3 text-slate-600">{c.type === "percentage" ? `${c.value}%` : m(Math.round(c.value * 100), c.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(c.expiresAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{c.redemptions}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="px-4 py-3">{c.isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Active</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500">Off</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button className={btn} onClick={() => setEditing(c)}>Edit</button>
                      <button className={`${btn} text-rose-500 hover:bg-rose-50`} disabled={busy === c.id} onClick={() => remove(c.id)}>{busy === c.id ? "…" : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <CouponEditor tenantId={tenantId} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={(list) => { onChange(list); setEditing(null); }} />}
    </div>
  );
}

function CouponEditor({ tenantId, initial, onClose, onSaved }: { tenantId: string; initial: Coupon | null; onClose: () => void; onSaved: (c: Coupon[]) => void }) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [type, setType] = useState<CouponType>(initial?.type ?? "percentage");
  const [value, setValue] = useState(String(initial?.value ?? ""));
  const [expires, setExpires] = useState(initial?.expiresAt ? initial.expiresAt.slice(0, 10) : "");
  const [max, setMax] = useState(initial?.maxRedemptions ? String(initial.maxRedemptions) : "");
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!code.trim()) { setErr("Code is required."); return; }
    setBusy(true); setErr(null);
    try {
      const list = await saveCouponAction(tenantId, {
        id: initial?.id, code: code.trim(), type, value: Number(value) || 0,
        expiresAt: expires ? new Date(expires).toISOString() : null, maxRedemptions: max ? Math.round(Number(max)) : null, isActive: active,
      });
      onSaved(list);
    } catch (e: any) { setErr(e?.message ?? "Save failed."); } finally { setBusy(false); }
  }

  return (
    <Modal title={initial ? "Edit coupon" : "New coupon"} onClose={onClose}>
      <Field label="Code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="LAUNCH20" className={`${inputCls} font-mono`} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as CouponType)} className={inputCls}><option value="percentage">Percentage %</option><option value="fixed_amount">Fixed amount $</option></select></Field>
        <Field label={type === "percentage" ? "Percent off" : "Amount off ($)"}><input value={value} onChange={(e) => setValue(e.target.value)} type="number" className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expires (optional)"><input value={expires} onChange={(e) => setExpires(e.target.value)} type="date" className={inputCls} /></Field>
        <Field label="Max uses (optional)"><input value={max} onChange={(e) => setMax(e.target.value)} type="number" className={inputCls} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="mt-2 flex justify-end gap-2"><button className={btn} onClick={onClose}>Cancel</button><button className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save coupon"}</button></div>
    </Modal>
  );
}

// ════════════════════════ entitlements editor (plan limits) ════════════════════════
const KNOWN_ENTS: { key: string; label: string; unit: string }[] = [
  { key: "contacts", label: "Contacts", unit: "contacts" },
  { key: "seats", label: "Team seats", unit: "seats" },
  { key: "ai_credits", label: "AI credits", unit: "credits/mo" },
  { key: "websites", label: "Websites", unit: "sites" },
];

function EntitlementsEditor({ ents, setEnts }: { ents: Entitlement[]; setEnts: (e: Entitlement[]) => void }) {
  const has = (k: string) => ents.some((e) => e.key === k);
  const add = (key: string, label: string, unit: string) =>
    setEnts([...ents, { key, label, included: 0, unit, overageCents: null, enforce: "off" }]);
  const update = (i: number, patch: Partial<Entitlement>) => setEnts(ents.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => setEnts(ents.filter((_, j) => j !== i));

  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="mb-1 text-xs font-medium text-slate-500">Limits &amp; entitlements <span className="font-normal text-slate-400">— what this level grants</span></div>
      {ents.length > 0 && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[minmax(110px,1fr)_70px_64px_80px_84px_24px] items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
            <span>Limit</span><span>Included</span><span>Unit</span><span>Overage $</span><span>At cap</span><span />
          </div>
          {ents.map((e, i) => (
            <div key={i} className="grid grid-cols-[minmax(110px,1fr)_70px_64px_80px_84px_24px] items-center gap-1.5">
              <input value={e.label} onChange={(ev) => update(i, { label: ev.target.value })} placeholder="Limit name" className="rounded border border-slate-200 px-1.5 py-1 text-xs" />
              <input value={e.included} onChange={(ev) => update(i, { included: Number(ev.target.value) || 0 })} type="number" className="rounded border border-slate-200 px-1.5 py-1 text-xs" />
              <input value={e.unit} onChange={(ev) => update(i, { unit: ev.target.value })} placeholder="unit" className="rounded border border-slate-200 px-1.5 py-1 text-xs" />
              <input value={e.overageCents == null ? "" : e.overageCents / 100} onChange={(ev) => update(i, { overageCents: ev.target.value === "" ? null : Math.round(Number(ev.target.value) * 100) })} type="number" placeholder="—" title="Price per extra unit" className="rounded border border-slate-200 px-1.5 py-1 text-xs" />
              <select value={e.enforce} onChange={(ev) => update(i, { enforce: ev.target.value as EnforceMode })} title="What happens at the cap" className="rounded border border-slate-200 px-1 py-1 text-xs">
                <option value="off">Track</option><option value="warn">Warn</option><option value="block">Block</option>
              </select>
              <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-rose-500" title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {KNOWN_ENTS.filter((k) => !has(k.key)).map((k) => (
          <button key={k.key} type="button" onClick={() => add(k.key, k.label, k.unit)} className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50">+ {k.label}</button>
        ))}
        <button type="button" onClick={() => add(`custom_${ents.length}`, "", "")} className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50">+ Custom</button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400"><b>At cap:</b> Track = count only · Warn = allow + flag · Block = hard stop. Overage $ bills each extra unit (used in a later step).</p>
    </div>
  );
}

// ════════════════════════ shared primitives ════════════════════════
const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1e3a8a]";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>{children}</label>;
}
function Stat({ k, v, tone }: { k: string; v: string; tone?: "rose" }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">{k}</div><div className={`mt-0.5 text-xl font-semibold ${tone === "rose" ? "text-rose-600" : "text-slate-900"}`}>{v}</div></div>;
}
function Modal({ title, onClose, children, max = "max-w-md" }: { title: string; onClose: () => void; children: ReactNode; max?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl ${max}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold text-slate-900">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button></div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}
