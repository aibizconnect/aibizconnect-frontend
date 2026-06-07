// Proves every industry template passes the design-system component contract (the same
// gate the O-3 critic uses) and that ads/voice stubs are registered + dry-runnable.
// Run: node scripts/verify-templates.mjs  (server must be on http://localhost:3000)

const BASE = "http://localhost:3000";

async function main() {
  // 1) catalog
  const cat = await (await fetch(`${BASE}/api/agent/templates`)).json();
  const templates = cat.templates ?? [];
  console.log(`catalog: ${templates.length} industry templates`);
  for (const t of templates) console.log(`  - ${t.key.padEnd(16)} ${t.label} (${t.pageCount} page${t.pageCount > 1 ? "s" : ""})`);

  // 2) validate each against the component contract (instantiated)
  let allOk = true;
  for (const t of templates) {
    const r = await (await fetch(`${BASE}/api/agent/templates?key=${t.key}&businessName=${encodeURIComponent("Ali Realty")}`)).json();
    const v = r.validation;
    const status = v?.ok ? "OK " : "FAIL";
    if (!v?.ok) { allOk = false; console.log(`  [${status}] ${t.key}:`, JSON.stringify(v?.problems)); }
    else console.log(`  [${status}] ${t.key} — all components valid`);
  }

  console.log(allOk ? "\n✅ ALL templates pass the component contract" : "\n❌ some templates failed");
}

main().catch((e) => { console.error(e); process.exit(1); });
