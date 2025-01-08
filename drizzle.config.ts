import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/data/db/schema.ts",
  out: "./src/data/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_URL!,
    ...(process.env.TURSO_AUTH_TOKEN && {
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  },
} satisfies Config;
