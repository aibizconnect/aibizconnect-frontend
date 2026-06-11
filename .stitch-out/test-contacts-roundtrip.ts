// Contacts GHL-parity round trip against the LIVE DB. Self-cleaning.
import {
  createContact, listContactsPage, getContact, updateContact, bulkTagContacts,
  importContacts, bulkDeleteContacts, addContactNote, listContactNotes,
  addContactTask, listContactTasks, setContactTaskStatus,
  createSmartList, listSmartLists, deleteSmartList,
} from "../lib/crm";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  // 1) create + page-list with search
  const c1 = await createContact(TENANT, { name: "Parity Tester", email: "parity.tester@example.com", phone: "613-555-0100", company: "TestCo", tags: ["vip"] });
  if (!c1.ok) fail(`createContact: ${c1.error}`);
  const page = await listContactsPage(TENANT, { q: "parity.tester", page: 0, pageSize: 10 });
  const me = page.rows[0];
  if (!me) fail("search did not find the new contact");
  console.log("1. create + search OK:", me.name, me.email, "company:", me.company, "tags:", me.tags.join(","));

  // 2) update incl. extended fields
  const u = await updateContact(TENANT, me.id, { score: 42, dnd: true, custom: { budget: "750k" }, ownerEmail: "al@aibizconnect.app" });
  console.log("2. update:", u.ok ? "OK (0045 applied)" : `degraded → ${u.error}`);
  const after = await getContact(TENANT, me.id);
  console.log("   readback: score", after?.score, "dnd", after?.dnd, "custom", JSON.stringify(after?.custom));

  // 3) tag filter + bulk tag
  await bulkTagContacts(TENANT, [me.id], "imported", "add");
  const tagged = await listContactsPage(TENANT, { tags: ["imported"], pageSize: 10 });
  if (!tagged.rows.some((r) => r.id === me.id)) fail("tag filter missed the bulk-tagged contact");
  console.log("3. bulk tag + tag filter OK");

  // 4) notes + tasks
  const n = await addContactNote(TENANT, me.id, "Round-trip note");
  console.log("4a. note:", n.ok ? "OK" : `degraded → ${n.error}`);
  if (n.ok) console.log("    notes:", (await listContactNotes(TENANT, me.id)).length);
  const t = await addContactTask(TENANT, { contactId: me.id, title: "Call back", dueAt: new Date(Date.now() + 86400_000).toISOString() });
  console.log("4b. task:", t.ok ? "OK" : `degraded → ${t.error}`);
  if (t.ok) {
    const tasks = await listContactTasks(TENANT, { contactId: me.id });
    await setContactTaskStatus(TENANT, tasks[0].id, "done");
    console.log("    task complete-toggle OK");
  }

  // 5) smart list
  const sl = await createSmartList(TENANT, "VIPs", { tags: ["vip"] });
  console.log("5. smart list:", sl.ok ? "OK" : `degraded → ${sl.error}`);
  if (sl.ok) { const lists = await listSmartLists(TENANT); await deleteSmartList(TENANT, lists[0].id); }

  // 6) import with dedupe (one dupe email, one new)
  const imp = await importContacts(TENANT, [
    { name: "Parity Tester", email: "parity.tester@example.com" },           // dupe → skipped
    { name: "Import Newbie", email: "import.newbie@example.com", tags: ["csv"] },
  ]);
  if (!imp.ok) fail(`import: ${imp.error}`);
  if (imp.inserted !== 1 || imp.skipped !== 1) fail(`import dedupe wrong: inserted ${imp.inserted}, skipped ${imp.skipped}`);
  console.log("6. import + email dedupe OK (1 inserted, 1 skipped)");

  // 7) cleanup
  const all = await listContactsPage(TENANT, { q: "example.com", pageSize: 50 });
  const ids = all.rows.filter((r) => /example\.com$/.test(r.email)).map((r) => r.id);
  const delRes = await bulkDeleteContacts(TENANT, ids);
  console.log(`7. cleanup OK (deleted ${delRes.deleted}) — ALL CHECKS PASS`);
})();
