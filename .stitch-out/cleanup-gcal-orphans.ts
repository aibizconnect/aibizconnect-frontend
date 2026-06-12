// Remove orphaned TEST events from the connected Google calendar — with token refresh.
import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "../lib/server/encryption";
import { googleCalCreds } from "../lib/server/google-calendar";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";

(async () => {
  const creds = await googleCalCreds();
  const { data: conns } = await sb.from("tenant_calendar_connections").select("id, encrypted_tokens, account_email").eq("tenant_id", T).eq("provider", "google");
  for (const c of (conns ?? []) as any[]) {
    let tokens: any; try { tokens = JSON.parse(decryptSecret(c.encrypted_tokens)); } catch { continue; }
    let token = tokens.access_token;
    if (creds && tokens.refresh_token) {
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }),
      });
      const tj: any = await r.json().catch(() => ({}));
      if (r.ok && tj?.access_token) token = tj.access_token;
    }
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent("Test")}&timeMin=${encodeURIComponent(new Date(Date.now() - 86400000).toISOString())}&maxResults=30&singleEvents=true`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j: any = await res.json().catch(() => ({}));
    if (!res.ok) { console.log(`${c.account_email}: list failed ${res.status}`); continue; }
    const items = (j?.items ?? []).filter((e: any) => /Reminder Test|Window Test/i.test(e.summary ?? ""));
    console.log(`${c.account_email}: ${items.length} orphaned test event(s)`);
    for (const e of items) {
      const dr = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(e.id)}?sendUpdates=none`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      console.log(`  deleted "${e.summary}" @ ${e.start?.dateTime ?? e.start?.date} -> ${dr.status}`);
    }
  }
})();
