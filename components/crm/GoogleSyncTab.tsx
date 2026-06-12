"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getGoogleContactsStateAction, getGoogleContactsConnectUrlAction, listGoogleContactGroupsAction,
  saveGoogleContactGroupsAction, runGoogleContactSyncAction, disconnectGoogleContactsAction,
  searchGooglePeopleAction, saveGooglePeopleAction,
} from "@/app/tenants/[tenantId]/contacts/crm-actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

type Group = { resourceName: string; name: string; memberCount: number };
type Person = { resourceName: string; name: string | null; email: string | null; groupNames?: string[] };
type SyncState = Awaited<ReturnType<typeof getGoogleContactsStateAction>>;

/** Google Contacts sync (D-258): connect an account, pick which groups to sync — members
 *  come in as contacts and EVERY group label they carry becomes a tag. Read-only import. */
export default function GoogleSyncTab({ tenantId }: { tenantId: string }) {
  const [state, setState] = useState<SyncState | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [people, setPeople] = useState<Person[]>([]);          // selected individuals (D-265)
  const [pq, setPq] = useState("");
  const [pResults, setPResults] = useState<Person[] | null>(null);
  const [pBusy, setPBusy] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getGoogleContactsStateAction(tenantId);
    setState(s);
    setSel(new Set(s.selectedGroups.map((g) => g.resourceName)));
    setPeople(s.selectedPeople ?? []);
    if (s.connected) {
      const g = await listGoogleContactGroupsAction(tenantId);
      if (g.ok) setGroups(g.groups ?? []); else { setGroups([]); setMsg(g.error ?? null); }
    }
  }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  // OAuth completes in a new tab — refresh on return.
  useEffect(() => {
    const on = () => { load().catch(() => {}); };
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, [load]);

  const connect = async () => {
    setBusy("connect");
    const r = await getGoogleContactsConnectUrlAction(tenantId);
    setBusy(null);
    if (r.ok && r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    else notifyError(r.error || "Could not start the connection.");
  };
  const saveGroups = async () => {
    setBusy("save"); setMsg(null);
    const chosen = (groups ?? []).filter((g) => sel.has(g.resourceName)).map((g) => ({ resourceName: g.resourceName, name: g.name }));
    const r = await saveGoogleContactGroupsAction(tenantId, chosen);
    setBusy(null);
    if (!r.ok) notifyError(r.error || "Could not save."); else { setMsg("Groups saved — they'll sync hourly (or Sync now)."); load(); }
  };
  const syncNow = async () => {
    setBusy("sync"); setMsg(null);
    const r = await runGoogleContactSyncAction(tenantId);
    setBusy(null);
    if (!r.ok) notifyError(r.error || "Sync failed.");
    else { const rep = r.report!; setMsg(`Synced: ${rep.created} new, ${rep.updated} updated, ${rep.tagsApplied} tag(s) applied${rep.skippedNoEmail ? `, ${rep.skippedNoEmail} skipped (no email)` : ""}.`); load(); }
  };
  const disconnect = async () => {
    if (!(await confirmDialog("Disconnect Google Contacts? Synced contacts and their tags stay.", { danger: true, confirmText: "Disconnect" }))) return;
    setBusy("disc");
    const r = await disconnectGoogleContactsAction(tenantId);
    setBusy(null);
    if (!r.ok) notifyError(r.error || "Could not disconnect."); else { setGroups(null); load(); }
  };

  const searchPeople = async () => {
    setPBusy(true);
    const r = await searchGooglePeopleAction(tenantId, pq);
    setPBusy(false);
    if (r.ok) setPResults(r.people ?? []); else { setPResults([]); notifyError(r.error || "Search failed."); }
  };
  const savePeople = async (next: Person[]) => {
    setPeople(next);
    const r = await saveGooglePeopleAction(tenantId, next.map((p) => ({ resourceName: p.resourceName, name: p.name ?? null, email: p.email ?? null })));
    if (!r.ok) notifyError(r.error || "Could not save selection."); else load();
  };

  if (!state) return <div className="py-10 text-center text-sm text-slate-400">Loading…</div>;

  if (!state.connected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-base font-medium text-slate-900">Sync contacts from Google</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Connect a Google account, choose which contact groups to sync, and their members come in
          as contacts — with every group label (Lawyers, Buyers, Sellers, Clients…) applied as a tag.
        </p>
        <button onClick={connect} disabled={busy === "connect"}
          className="mt-4 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">
          Connect Google Contacts
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-sm text-slate-700">
          📇 Connected{state.accountEmail ? <span className="text-slate-500"> — {state.accountEmail}</span> : null}
          {state.lastSyncAt && <span className="ml-2 text-xs text-slate-400">last sync {new Date(state.lastSyncAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={syncNow} disabled={busy === "sync" || (!state.selectedGroups.length && !(state.selectedPeople ?? []).length)}
            className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 font-medium text-white hover:bg-[#1e40af] disabled:opacity-40">
            {busy === "sync" ? "Syncing…" : "⟳ Sync now"}
          </button>
          <button onClick={disconnect} disabled={busy === "disc"} className="text-red-500 hover:underline disabled:opacity-40">Disconnect</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-1 text-sm font-medium text-slate-900">Groups to sync</div>
        <p className="mb-3 text-xs text-slate-500">Members of the checked groups sync hourly. All of a contact&apos;s group labels become tags.</p>
        {groups === null ? <div className="text-sm text-slate-400">Loading groups…</div>
          : groups.length === 0 ? <div className="text-sm text-slate-400">{msg ?? "No contact groups found on this account."}</div>
          : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {groups.map((g) => (
                <label key={g.resourceName} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={sel.has(g.resourceName)}
                    onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(g.resourceName) : n.delete(g.resourceName); return n; })} />
                  <span className="flex-1 truncate text-slate-800">{g.name}</span>
                  <span className="text-xs text-slate-400">{g.memberCount}</span>
                </label>
              ))}
            </div>
          )}
        {groups !== null && groups.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <button onClick={saveGroups} disabled={busy === "save"}
              className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">Save groups</button>
            {msg && <span className="text-xs text-emerald-700">{msg}</span>}
          </div>
        )}
      </div>

      {/* Specific contacts (D-265): cherry-pick individuals — their labels become tags too. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-1 text-sm font-medium text-slate-900">Specific contacts</div>
        <p className="mb-3 text-xs text-slate-500">Pick individual contacts to sync (with or without groups). Their Google labels become tags as well.</p>
        {people.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {people.map((p) => (
              <span key={p.resourceName} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {p.name || p.email || "contact"}
                <button onClick={() => savePeople(people.filter((x) => x.resourceName !== p.resourceName))} className="text-slate-400 hover:text-red-500">✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input value={pq} onChange={(e) => setPq(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchPeople()}
            placeholder="Search your Google contacts by name or email…" className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <button onClick={searchPeople} disabled={pBusy} className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">
            {pBusy ? "Searching…" : "Search"}
          </button>
        </div>
        {pResults !== null && (
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {pResults.length === 0 && <div className="px-1 py-2 text-xs text-slate-400">No matches.</div>}
            {pResults.map((p) => {
              const added = people.some((x) => x.resourceName === p.resourceName);
              return (
                <div key={p.resourceName} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-slate-800">{p.name || "—"}</span>
                    {p.email && <span className="ml-2 text-xs text-slate-400">{p.email}</span>}
                    {!!p.groupNames?.length && <span className="ml-2 text-[10px] text-slate-400">[{p.groupNames.join(", ")}]</span>}
                  </span>
                  <button disabled={added} onClick={() => savePeople([...people, p])}
                    className="shrink-0 rounded border border-[#1e3a8a] px-2 py-0.5 text-xs font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-30">
                    {added ? "Added" : "＋ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {state.lastReport && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          Last sync: {state.lastReport.created} new · {state.lastReport.updated} updated · {state.lastReport.tagsApplied} tags applied{state.lastReport.tagsCreated ? ` · ${state.lastReport.tagsCreated} new tag(s) registered` : ""}
          {state.lastReport.skippedNoEmail ? ` · ${state.lastReport.skippedNoEmail} skipped (no email)` : ""}
        </div>
      )}
    </div>
  );
}
