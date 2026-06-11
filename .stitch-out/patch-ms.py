# -*- coding: utf-8 -*-
# Refactor microsoft-calendar.ts for multi-account (D-251) + all-calendars busy (D-252).
p = "lib/server/microsoft-calendar.ts"
s = open(p, encoding="utf-8").read()
orig = s

OLD_UPSERT = """    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_calendar_connections").upsert(
      { tenant_id: tenantId, calendar_id: calendarId, provider: "microsoft", account_email: email || null, external_calendar_id: "primary", encrypted_tokens: encryptSecret(JSON.stringify(tokens)), status: "connected", updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,calendar_id,provider" }
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true, email };"""
NEW_UPSERT = """    // Manual upsert keyed by ACCOUNT (D-251): several Outlook accounts can back one calendar.
    const supabase = createSupabaseServiceClient();
    const row = { tenant_id: tenantId, calendar_id: calendarId, provider: "microsoft", account_email: email || null, external_calendar_id: "primary", encrypted_tokens: encryptSecret(JSON.stringify(tokens)), status: "connected", updated_at: new Date().toISOString() };
    let exq = supabase.from("tenant_calendar_connections").select("id").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");
    exq = email ? exq.eq("account_email", email) : exq.is("account_email", null);
    const { data: existing } = await exq.maybeSingle();
    const { error } = existing
      ? await supabase.from("tenant_calendar_connections").update(row).eq("id", (existing as any).id)
      : await supabase.from("tenant_calendar_connections").insert(row);
    if (error) {
      return { ok: false, message: /duplicate key|unique/i.test(error.message)
        ? "A second account needs a DB upgrade - apply supabase/migrations/0048_multi_account_connections.sql first."
        : error.message };
    }
    return { ok: true, email };"""
assert OLD_UPSERT in s, "upsert block not found"
s = s.replace(OLD_UPSERT, NEW_UPSERT)

OLD_TOKEN = """async function validMsToken(tenantId: string, calendarId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_calendar_connections").select("encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft").maybeSingle();
  if (!data?.encrypted_tokens) return null;
  let tokens: MsTokens; try { tokens = JSON.parse(decryptSecret(data.encrypted_tokens as string)); } catch { return null; }"""
NEW_TOKEN = """async function validMsToken(tenantId: string, calendarId: string, connectionId?: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  let q = supabase.from("tenant_calendar_connections").select("id, encrypted_tokens").eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");
  if (connectionId) q = q.eq("id", connectionId);
  const { data: rows } = await q.limit(1);
  const data = rows?.[0];
  if (!data?.encrypted_tokens) return null;
  const rowId = (data as any).id as string;
  let tokens: MsTokens; try { tokens = JSON.parse(decryptSecret(data.encrypted_tokens as string)); } catch { return null; }"""
assert OLD_TOKEN in s, "token block not found"
s = s.replace(OLD_TOKEN, NEW_TOKEN)

OLD_REFRESH = """      await supabase.from("tenant_calendar_connections").update({ encrypted_tokens: encryptSecret(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("calendar_id", calendarId).eq("provider", "microsoft");"""
NEW_REFRESH = """      await supabase.from("tenant_calendar_connections").update({ encrypted_tokens: encryptSecret(JSON.stringify(next)), updated_at: new Date().toISOString() }).eq("id", rowId);"""
assert OLD_REFRESH in s, "refresh block not found"
s = s.replace(OLD_REFRESH, NEW_REFRESH)

OLD_BUSY = """export async function getMsBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string): Promise<BusyInterval[]> {
  const token = await validMsToken(tenantId, calendarId);
  if (!token) return [];
  try {
    const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(minIso)}&endDateTime=${encodeURIComponent(maxIso)}&$select=start,end,showAs&$top=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
    const j: any = await res.json().catch(() => ({}));
    const items: any[] = j?.value ?? [];
    return items
      .filter((e) => ["busy", "tentative", "oof", "workingElsewhere"].includes(String(e?.showAs)))
      .map((e) => ({ start: new Date(e.start?.dateTime + "Z").getTime(), end: new Date(e.end?.dateTime + "Z").getTime() }))
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
  } catch { return []; }
}"""
NEW_BUSY = """/** Busy across ALL the account's calendars (D-252), not just the default one. */
export async function getMsBusy(tenantId: string, calendarId: string, minIso: string, maxIso: string, connectionId?: string): Promise<BusyInterval[]> {
  const token = await validMsToken(tenantId, calendarId, connectionId);
  if (!token) return [];
  const view = async (path: string): Promise<BusyInterval[]> => {
    const url = `https://graph.microsoft.com/v1.0${path}/calendarView?startDateTime=${encodeURIComponent(minIso)}&endDateTime=${encodeURIComponent(maxIso)}&$select=start,end,showAs&$top=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
    const j: any = await res.json().catch(() => ({}));
    return ((j?.value ?? []) as any[])
      .filter((e) => ["busy", "tentative", "oof", "workingElsewhere"].includes(String(e?.showAs)))
      .map((e) => ({ start: new Date(e.start?.dateTime + "Z").getTime(), end: new Date(e.end?.dateTime + "Z").getTime() }))
      .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));
  };
  try {
    let calIds: string[] = [];
    try {
      const lr = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$select=id&$top=20", { headers: { Authorization: `Bearer ${token}` } });
      const lj: any = await lr.json().catch(() => ({}));
      calIds = ((lj?.value ?? []) as any[]).map((c) => c.id).filter(Boolean);
    } catch { /* default-only fallback */ }
    if (!calIds.length) return await view("/me");
    const all = await Promise.all(calIds.map((id) => view(`/me/calendars/${encodeURIComponent(id)}`).catch(() => [] as BusyInterval[])));
    return all.flat();
  } catch { return []; }
}"""
assert OLD_BUSY in s, "busy block not found"
s = s.replace(OLD_BUSY, NEW_BUSY)

PAIRS = [
    ("""export async function createMsEvent(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }): Promise<string | null> {
  const token = await validMsToken(tenantId, calendarId);""",
     """export async function createMsEvent(tenantId: string, calendarId: string, ev: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmail?: string }, connectionId?: string): Promise<string | null> {
  const token = await validMsToken(tenantId, calendarId, connectionId);"""),
    ("""export async function updateMsEvent(tenantId: string, calendarId: string, eventId: string, ev: { summary?: string; startIso?: string; endIso?: string }): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId);""",
     """export async function updateMsEvent(tenantId: string, calendarId: string, eventId: string, ev: { summary?: string; startIso?: string; endIso?: string }, connectionId?: string): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId, connectionId);"""),
    ("""export async function deleteMsEvent(tenantId: string, calendarId: string, eventId: string): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId);""",
     """export async function deleteMsEvent(tenantId: string, calendarId: string, eventId: string, connectionId?: string): Promise<boolean> {
  const token = await validMsToken(tenantId, calendarId, connectionId);"""),
]
for old, new in PAIRS:
    assert old in s, "event fn block not found: " + old[:60]
    s = s.replace(old, new)

assert s != orig
open(p, "w", encoding="utf-8", newline="\n").write(s)
print("microsoft refactor done")
