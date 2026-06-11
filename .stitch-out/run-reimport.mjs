import { config } from "dotenv"; config({ path: ".env.local" });
const { register } = await import("tsx/esm/api");
register();
await import("./reimport-ottawa.ts");
