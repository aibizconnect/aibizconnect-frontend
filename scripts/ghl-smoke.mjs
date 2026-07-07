#!/usr/bin/env node
/**
 * ghl-smoke.mjs — prove the GoHighLevel connection and create a test lead.
 *
 * The network to GHL is open from this environment; all this needs is a token.
 *
 * ── Setup (add these as environment variables in your Claude Code env settings) ──
 *   GHL_PIT          A GHL v2 Private Integration Token.
 *                    Get it in the SUB-ACCOUNT: Settings → Private Integrations →
 *                    Create → scope at least: View/Edit Contacts. Copy the token.
 *   GHL_LOCATION_ID  The sub-account (Location) ID. Settings → Business Profile,
 *                    or the API/Private-Integration screen shows it.
 *
 * ── Usage ──
 *   node scripts/ghl-smoke.mjs ping                 # read-only: proves auth, counts contacts
 *   node scripts/ghl-smoke.mjs create-test-contact  # writes ONE clearly-labelled test contact
 *
 * Nothing here stores or prints the token. Read-only `ping` is the safe first step.
 */

const BASE = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28'; // required GHL API version header
const TOKEN = process.env.GHL_PIT || process.env.GHL_API_KEY || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

function die(msg, code = 1) { console.error(`\n✗ ${msg}\n`); process.exit(code); }

if (!TOKEN) {
  die(
    'GHL_PIT is not set.\n' +
    '  → Create a Private Integration Token in your GHL sub-account\n' +
    '    (Settings → Private Integrations), then add it as env var GHL_PIT.\n' +
    '    Also set GHL_LOCATION_ID to the sub-account id.'
  );
}
if (!LOCATION_ID) {
  die('GHL_LOCATION_ID is not set. Add your sub-account (Location) id as env var GHL_LOCATION_ID.');
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Version: VERSION,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const detail = json?.message || json?.error || text || `HTTP ${res.status}`;
    die(`GHL API ${method} ${path} failed (HTTP ${res.status}): ${detail}`);
  }
  return json;
}

async function ping() {
  // Read-only: list one contact to confirm the token + location work.
  const q = new URLSearchParams({ locationId: LOCATION_ID, limit: '1' });
  const data = await req('GET', `/contacts/?${q}`);
  const total = data?.meta?.total ?? data?.total ?? (data?.contacts?.length ?? 0);
  console.log('\n✓ Connected to GoHighLevel.');
  console.log(`  Location: ${LOCATION_ID}`);
  console.log(`  Contacts visible to this token: ${total}`);
  const sample = data?.contacts?.[0];
  if (sample) console.log(`  Sample contact id: ${sample.id}`);
  console.log('\nRead access confirmed. Safe to run create-test-contact next.\n');
}

async function createTestContact() {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const body = {
    locationId: LOCATION_ID,
    firstName: 'LeadLoop',
    lastName: 'Test',
    email: `leadloop.test+${Date.now()}@example.com`,
    source: 'ghl-smoke.mjs',
    tags: ['leadloop-test'],
    customFields: [],
    // A note in the name so it's obvious in the CRM this is a test you can delete.
    companyName: `LeadLoop connection test — ${stamp}`,
  };
  const data = await req('POST', '/contacts/', body);
  const id = data?.contact?.id || data?.id;
  console.log('\n✓ Created a live test contact in GoHighLevel.');
  console.log(`  Contact id: ${id}`);
  console.log(`  Tagged: leadloop-test  (search that tag in GHL to find/delete it)\n`);
}

const cmd = process.argv[2];
if (cmd === 'ping') await ping();
else if (cmd === 'create-test-contact') await createTestContact();
else die('Unknown command. Use:  node scripts/ghl-smoke.mjs ping   |   create-test-contact');
