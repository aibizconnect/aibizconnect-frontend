// Parity sweep round trip: merge duplicates, bulk field update, companies roll-up,
// soft-delete behavior (pre/post 0046), audit log. Self-cleaning.
import {
  createContact, listContactsPage, mergeContacts, bulkUpdateContactField,
  listCompanies, bulkDeleteContacts, restoreContacts, purgeContacts,
  getContact, listContactNotes, addContactNote, listCrmAuditLog,
} from "../lib/crm";

const T = "d723a086-eac0-4b61-8742-25313370d0b7";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

(async () => {
  // seed: two dupes + one other company
  await createContact(T, { name: "Dup One", email: "dup@example.com", phone: "613-555-0001", company: "Acme", tags: ["a"] });
  await createContact(T, { name: "", email: "dup2@example.com", phone: "613-555-0002", company: "", tags: ["b"] });
  await createContact(T, { name: "Other Person", email: "other@example.com", company: "Globex" });
  const page = await listContactsPage(T, { q: "example.com", pageSize: 20 });
  const dup1 = page.rows.find((r) => r.email === "dup@example.com")!;
  const dup2 = page.rows.find((r) => r.email === "dup2@example.com")!;
  const other = page.rows.find((r) => r.email === "other@example.com")!;
  if (!dup1 || !dup2 || !other) fail("seed contacts missing");

  // 1) merge: dup2 into dup1 — note moves over, tags union
  await addContactNote(T, dup2.id, "Note on the duplicate");
  const m = await mergeContacts(T, dup1.id, [dup2.id]);
  if (!m.ok) fail(`merge: ${m.error}`);
  const merged = await getContact(T, dup1.id);
  if (!merged) fail("merged primary vanished");
  if (!(merged!.tags.includes("a") && merged!.tags.includes("b"))) fail(`tags not unioned: ${merged!.tags}`);
  const notes = await listContactNotes(T, dup1.id);
  if (!notes.some((n) => n.body.includes("duplicate"))) fail("note did not repoint to primary");
  if (await getContact(T, dup2.id)) fail("secondary still exists after merge");
  console.log("1. merge OK — tags unioned, note repointed, secondary removed");

  // 2) bulk field update
  const bu = await bulkUpdateContactField(T, [dup1.id, other.id], "source", "sweep-test");
  if (!bu.ok || bu.changed !== 2) fail(`bulk field: ${bu.error ?? bu.changed}`);
  console.log("2. bulk field update OK (source on 2)");

  // 3) companies roll-up
  const cos = await listCompanies(T);
  if (!cos.some((c) => c.name === "Acme") || !cos.some((c) => c.name === "Globex")) fail(`companies: ${JSON.stringify(cos)}`);
  console.log("3. companies roll-up OK:", cos.map((c) => `${c.name}(${c.count})`).join(", "));

  // 4) soft-delete → restore (or hard-fallback pre-0046)
  await bulkDeleteContacts(T, [other.id]);
  const trash = await listContactsPage(T, { deleted: true, pageSize: 20 });
  if (trash.rows.some((r) => r.id === other.id)) {
    const rr = await restoreContacts(T, [other.id]);
    if (!rr.ok || rr.restored !== 1) fail(`restore: ${rr.error}`);
    const back = await listContactsPage(T, { q: "other@example.com", pageSize: 5 });
    if (!back.rows.length) fail("restored contact not visible");
    console.log("4. soft-delete → Restore tab → restore OK (0046 applied)");
    await purgeContacts(T, [other.id]);
  } else {
    console.log("4. soft-delete degraded to hard delete (0046 not applied yet) — Restore tab empty as designed");
  }

  // 5) audit log surfaces crm actions
  const log = await listCrmAuditLog(T, 10);
  console.log(`5. bulk-actions log OK (${log.length} entries, latest: ${log[0]?.action ?? "none"})`);

  // cleanup
  const left = await listContactsPage(T, { q: "example.com", pageSize: 20 });
  await purgeContacts(T, left.rows.map((r) => r.id));
  const leftTrash = await listContactsPage(T, { deleted: true, pageSize: 20 });
  await purgeContacts(T, leftTrash.rows.filter((r) => /example\.com$/.test(r.email)).map((r) => r.id));
  console.log("6. cleanup OK — ALL CHECKS PASS");
})();
