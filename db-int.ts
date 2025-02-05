import { $ as Execa } from "execa";
import Fkill from "fkill";
import { drizzle } from "drizzle-orm/libsql/web";
import { sql } from "drizzle-orm";
import type { AstroIntegration } from "astro";
import type { Config } from "@libsql/client";

interface IntOptions {
  migrateOnStart?: boolean;
  dbConfig: { connection: string | Config };
}

const dbIsReady = async (dbConfig: IntOptions["dbConfig"]) => {
  let { promise, resolve, reject } = Promise.withResolvers();

  // TODO Unclear why Parameters<typeof drizzle> didn't work
  // @ts-ignore
  const dbClient = drizzle(dbConfig);

  const ping = async () => {
    try {
      await dbClient.run(sql.raw("SELECT 1;"));
      resolve(true);
    } catch (err) {
      console.log("BLEW UP!", err);

      // TODO Figure out typing
      // TODO does libsql export error codes?
      // @ts-ignore
      if (err.cause.code !== "ECONNREFUSED") {
        reject(err);
      }

      // TODO Crash if ... certain type of error? Not a connection one?

      i++;
      if (i < 10) {
        setTimeout(ping, 1000);
      } else {
        reject(new Error("Unable to connect to db, timed out"));
      }
    }
  };

  let i = 0;
  setTimeout(ping, 1000);

  // try for 10 seconds, throwing if unsuccessful

  await promise;
};

export default function TursoPatchInt({
  migrateOnStart,
  dbConfig,
}: IntOptions): AstroIntegration {
  let procId: number;

  return {
    name: "@grepco/turso-patch",
    hooks: {
      "astro:server:setup": async () => {
        console.log("STARTING DATABASE INTEGRATION");
        // TODO Error detection? I assume can't await b/c that would cause process to hang, since
        // db is long-running?
        const proc = Execa({
          stdout: "inherit",
          stderr: "inherit",
        })`turso dev`;
        // TODO Do better?
        procId = proc.pid!;

        try {
          await dbIsReady(dbConfig);

          // TODO Astro built-in logger?
          console.log("db started");

          if (migrateOnStart) {
            await Execa({
              stdout: "inherit",
              stderr: "inherit",
            })`npm run db:migrate:local`;
            console.log("db migrations run");
          }
        } catch (err) {
          console.error("db start failed");
          await Fkill(procId);
          throw err; // TODO Correct integration contract? crash on start?
        }

        // ping server, confirm connectable, migrate only once set
      },
      "astro:server:done": async () => {
        // TODO This is never hit, unclear why

        console.log("STOPPING NOW!");
        // TODO What if closing fails?
        try {
          await Fkill(procId, { silent: true });
          console.log("SO WE GET HERE???");
        } catch (err) {
          console.log(err, "WHAATT THE FUCK");
          await Fkill(procId, { force: true });
        }
      },
    },
  };
}
