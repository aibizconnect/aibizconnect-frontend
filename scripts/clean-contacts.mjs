#!/usr/bin/env node
/**
 * clean-contacts.mjs — turn a messy CRM export into a GHL-import-ready reactivation list.
 *
 * Does: fuzzy-maps columns (handles BoldTrail / kvCORE / MyRealPage / HubSpot /
 * Google Contacts headers), splits full names, normalizes phones to E.164 (+1…,
 * NANP-validated), de-dupes by phone then email, drops records older than N years
 * (CASL implied-consent window), and tags the batch. Writes a clean CSV plus a
 * rejects CSV that says *why* each row was dropped.
 *
 * Usage:
 *   node scripts/clean-contacts.mjs --in export.csv
 *   node scripts/clean-contacts.mjs --in export.csv --out clean.csv --rejects rejects.csv \
 *        --max-age-years 2 --tag reactivation-2026-07 --source boldtrail --drop-no-date
 *
 * No dependencies (hand-rolled CSV parse/stringify) so it runs on the repo as-is.
 * Note: true landline vs mobile can't be told from the number alone (NANP number
 * portability) — this validates format only; use a carrier lookup if you need certainty.
 */

import { readFileSync, writeFileSync } from 'node:fs';

// ---------- args ----------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) { args[key] = next; i++; } else { args[key] = true; }
  }
}
const IN = args.in;
if (!IN) { console.error('\n✗ Missing --in <file.csv>\n'); process.exit(1); }
const OUT = args.out || 'contacts-clean.csv';
const REJ = args.rejects || 'contacts-rejects.csv';
const MAX_AGE_YEARS = args['max-age-years'] != null ? Number(args['max-age-years']) : 2;
const TAG = args.tag || 'reactivation';
const SOURCE = args.source || '';
const DROP_NO_DATE = !!args['drop-no-date'];

// ---------- tiny CSV parser (RFC-4180-ish: quotes, escaped quotes, embedded newlines) ----------
function parseCSV(text) {
  const rows = []; let row = [], field = '', i = 0, inQ = false;
  text = text.replace(/^﻿/, ''); // strip BOM
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && !(r.length === 1 && r[0] === ''));
}
function toCSV(headers, records) {
  const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [headers.join(',')].concat(records.map(r => headers.map(h => esc(r[h])).join(','))).join('\n') + '\n';
}

// ---------- fuzzy header mapping ----------
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const MAP = {
  first: ['firstname', 'first', 'fname', 'givenname', 'given'],
  last:  ['lastname', 'last', 'lname', 'surname', 'familyname'],
  full:  ['fullname', 'name', 'contactname', 'displayname'],
  mobile:['mobile', 'mobilephone', 'cell', 'cellphone', 'cellularphone', 'phonemobile'],
  phone: ['phone', 'phonenumber', 'primaryphone', 'telephone', 'tel', 'homephone', 'workphone', 'phone1'],
  email: ['email', 'emailaddress', 'email1', 'primaryemail', 'e mail'],
  date:  ['lastactivity', 'lastactivitydate', 'lastcontact', 'lastcontacted', 'lasttouch', 'datemodified', 'modified', 'createddate', 'created', 'dateadded', 'adddate'],
  notes: ['notes', 'note', 'description', 'comments', 'comment'],
};
function buildIndex(headerRow) {
  const idx = {}; const normed = headerRow.map(norm);
  for (const [key, aliases] of Object.entries(MAP)) {
    for (const alias of aliases) {
      const pos = normed.indexOf(norm(alias));
      if (pos !== -1 && idx[key] == null) idx[key] = pos;
    }
  }
  return idx;
}

// ---------- phone normalization (NANP → E.164) ----------
function normPhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length !== 10) return null;                 // not a NANP 10-digit number
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return null; // invalid area/exchange code
  return '+1' + d;
}

// ---------- run ----------
const rows = parseCSV(readFileSync(IN, 'utf8'));
if (rows.length < 2) { console.error('\n✗ CSV has no data rows.\n'); process.exit(1); }
const header = rows[0];
const idx = buildIndex(header);
const get = (r, key) => (idx[key] != null ? (r[idx[key]] || '').trim() : '');

const now = new Date();
const cutoff = new Date(now.getFullYear() - MAX_AGE_YEARS, now.getMonth(), now.getDate());

const clean = [], rejects = [];
const seenPhone = new Map(), seenEmail = new Map();
const stats = { total: 0, kept: 0, no_contact: 0, bad_phone_no_email: 0, dup: 0, stale: 0, no_date_dropped: 0 };

for (let r = 1; r < rows.length; r++) {
  const row = rows[r]; stats.total++;
  const reject = (reason) => rejects.push({
    reason,
    raw_name: get(row, 'full') || `${get(row,'first')} ${get(row,'last')}`.trim(),
    raw_phone: get(row, 'mobile') || get(row, 'phone'),
    raw_email: get(row, 'email'),
    raw_date: get(row, 'date'),
  });

  // name
  let first = get(row, 'first'), last = get(row, 'last');
  if (!first && !last) {
    const full = get(row, 'full');
    if (full) { const parts = full.split(/\s+/); first = parts.shift() || ''; last = parts.join(' '); }
  }

  // phone: prefer mobile column, fall back to generic phone
  const phone = normPhone(get(row, 'mobile')) || normPhone(get(row, 'phone'));
  const email = get(row, 'email');

  if (!phone && !email) { stats.no_contact++; reject('no valid phone or email'); continue; }
  if (!phone && email) { stats.bad_phone_no_email++; reject('no valid mobile (email only — use for email touches)'); continue; }

  // age / consent window
  const dateStr = get(row, 'date');
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d) && d < cutoff) { stats.stale++; reject(`older than ${MAX_AGE_YEARS}yr (last activity ${dateStr})`); continue; }
  } else if (DROP_NO_DATE) {
    stats.no_date_dropped++; reject('no last-activity date (dropped per --drop-no-date)'); continue;
  }

  // de-dupe (phone first, then email)
  const dkey = phone || email.toLowerCase();
  const seen = phone ? seenPhone : seenEmail;
  if (seen.has(dkey)) { stats.dup++; reject('duplicate of row ' + seen.get(dkey)); continue; }
  seen.set(dkey, r);

  clean.push({
    first_name: first, last_name: last, phone: phone || '', email,
    source: SOURCE, tags: TAG,
    notes: (get(row, 'notes') + (dateStr ? '' : ' [no last-activity date — verify consent]')).trim(),
  });
  stats.kept++;
}

writeFileSync(OUT, toCSV(['first_name','last_name','phone','email','source','tags','notes'], clean));
writeFileSync(REJ, toCSV(['reason','raw_name','raw_phone','raw_email','raw_date'], rejects));

console.log(`\n✓ Cleaned ${stats.total} rows from ${IN}`);
console.log(`  Detected columns: ${Object.keys(idx).map(k => `${k}→"${header[idx[k]]}"`).join(', ') || '(none matched — check headers)'}`);
console.log(`  ── kept:            ${stats.kept}  →  ${OUT}`);
console.log(`  ── email-only:      ${stats.bad_phone_no_email}  (no textable mobile)`);
console.log(`  ── no contact info: ${stats.no_contact}`);
console.log(`  ── duplicates:      ${stats.dup}`);
console.log(`  ── stale (>${MAX_AGE_YEARS}yr):    ${stats.stale}`);
if (DROP_NO_DATE) console.log(`  ── no-date dropped: ${stats.no_date_dropped}`);
console.log(`  Rejects (with reasons) → ${REJ}`);
console.log(`\n  Import ${OUT} into GHL → Contacts → Import, tag "${TAG}", then run Workflow E.\n`);
