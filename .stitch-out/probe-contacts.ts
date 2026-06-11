import { createClient } from "@supabase/supabase-js";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const probe = async (table: string, cols: string) => {
    const { error } = await supa.from(table).select(cols).limit(1);
    console.log(table, "→", cols, ":", error ? `MISSING (${error.message.slice(0, 60)})` : "OK");
  };
  await probe("tenant_contacts", "id,name,email,phone,tags,score,source,created_at");
  await probe("tenant_contacts", "custom,owner_email,dnd,updated_at");
  await probe("tenant_tags", "id,name,color");
  await probe("tenant_custom_fields", "id,field_key,field_type");
  await probe("tenant_contact_notes", "id");
  await probe("tenant_contact_tasks", "id");
  const { count } = await supa.from("tenant_contacts").select("id", { count: "exact", head: true });
  console.log("total contacts in DB:", count);
})();
