import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";

console.log(import.meta.env, process?.env, "WHAT THE HELL IS GOING ON HERE");

const turso = createClient({
  url: import.meta.env.TURSO_URL!,
  authToken: import.meta.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(turso);

export default db;
