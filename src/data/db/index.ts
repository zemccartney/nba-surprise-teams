import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client/web";

const turso = createClient({
  url: import.meta.env.TURSO_URL!,
  authToken: import.meta.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(turso);

export default db;
