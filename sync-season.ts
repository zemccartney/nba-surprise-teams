import "dotenv/config";
import Fs from "node:fs/promises";
import { drizzle } from "drizzle-orm/libsql/web";
import { eq } from "drizzle-orm";
import { SEASONS } from "./src/data";
import * as Utils from "./src/utils";
import { Games } from "./src/data/db/schema";

// TODO untested
// TODO Document WHEN to run (as part of cron?)

// npx tsx sync-season
// Overwrites our constants with db copy
// Will need to prettify, assume happens elsewhere (manually or as part of script)

const dbClient = drizzle({
  connection: {
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});

const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();
const currentSeason = SEASONS.find(
  (season) =>
    season.startDate <= currentYYYYMMDD && season.endDate >= currentYYYYMMDD,
);

if (!currentSeason) {
  throw new Error("Not currently in-season, no game results to refresh");
}

const games = await dbClient
  .select()
  .from(Games)
  .where(eq(Games.season, currentSeason.id));

const tpl = `
    import type { Game } from "../..";

    export default ${games.map(({ id, ...g }) => g)};
  `;

// TODO correct path resolution
await Fs.writeFile(`./src/data/seasons/${currentSeason.id}/games.ts`, tpl, {
  encoding: "utf8",
});
