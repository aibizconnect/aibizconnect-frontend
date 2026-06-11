import { createClient } from "@supabase/supabase-js";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  await supa.from("tenant_contacts").insert({ tenant_id: T, name: "TagProbe", email: "tagprobe@example.com", tags: ["alpha"] });
  const ov = await supa.from("tenant_contacts").select("id").eq("tenant_id", T).overlaps("tags", ["alpha"]);
  console.log("overlaps:", ov.error ? `ERR ${ov.error.message}` : `${ov.data?.length} rows`);
  const cs = await supa.from("tenant_contacts").select("id").eq("tenant_id", T).contains("tags", ["alpha"]);
  console.log("contains:", cs.error ? `ERR ${cs.error.message}` : `${cs.data?.length} rows`);
  const csJson = await supa.from("tenant_contacts").select("id").eq("tenant_id", T).contains("tags", JSON.stringify(["alpha"]));
  console.log("contains(json-str):", csJson.error ? `ERR ${csJson.error.message}` : `${csJson.data?.length} rows`);
  await supa.from("tenant_contacts").delete().eq("tenant_id", T).eq("email", "tagprobe@example.com");
})();
