import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql/web";
import { migrate } from "drizzle-orm/libsql/migrator";

import Config from "./drizzle.config";

// Script needed, as assumed drizzle-kit won't be installed in production environments due to usage of
// npm clean-install by CF (no dev deps if NODE_ENV=production)

// TODO Rename to indicate not special to drizzle
const db = drizzle({
  connection: {
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
await migrate(db, {
  migrationsFolder: Config.out,
});

console.log("Migrations applied!");
