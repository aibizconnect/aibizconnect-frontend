// Pull the FULL People API error (it contains the exact console enable URL with project id).
import { getIntegrationSecret } from "../lib/server/integrations";
import { googleCalCreds } from "../lib/server/google-calendar";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const sec: any = await getIntegrationSecret(ALI, "google_contacts").catch(() => null);
  if (!sec?.access_token) { console.log("not connected on this tenant"); return; }
  let token = sec.access_token;
  const creds = await googleCalCreds();
  if (creds && sec.refresh_token) {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: creds.id, client_secret: creds.secret, refresh_token: sec.refresh_token, grant_type: "refresh_token" }),
    });
    const tj: any = await r.json().catch(() => ({}));
    if (r.ok && tj?.access_token) token = tj.access_token;
  }
  const res = await fetch("https://people.googleapis.com/v1/contactGroups?pageSize=5", { headers: { Authorization: `Bearer ${token}` } });
  const j: any = await res.json().catch(() => ({}));
  console.log("status:", res.status);
  console.log("message:", j?.error?.message ?? "(none)");
  const url = (j?.error?.message ?? "").match(/https:\/\/console\.[^\s]+/)?.[0];
  console.log("enable URL:", url ?? "(not present)");
})();
