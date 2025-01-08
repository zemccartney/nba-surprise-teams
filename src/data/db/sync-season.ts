import Fs from "node:fs/promises";
// TODO Investigate; astro clipped these from drizzle-orm's export, no idea why
import { eq } from "drizzle-orm/expressions";
import { SEASONS } from "..";
import * as Utils from "../../utils";
import Db from ".";
import { Games } from "./schema";

// TODO untested
// TODO Document WHEN to run (as part of cron?)

// TODO Might need to manually recreate db client?
// npx tsx ./src/db/sync-season
// Overwrites our constants with db copy
// Will need to prettify, assume happens elsewhere (manually or as part of script)

export default async () => {
  const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();
  const currentSeason = SEASONS.find(
    (season) =>
      season.startDate <= currentYYYYMMDD && season.endDate >= currentYYYYMMDD,
  );

  if (!currentSeason) {
    throw new Error("Not currently in-season, no game results to refresh");
  }

  const games = await Db.select()
    .from(Games)
    .where(eq(Games.season, currentSeason.id));

  const tpl = `
    import type { Game } from "../..";

    export default ${games.map(({ id, ...g }) => g)};
  `;

  await Fs.writeFile(`../seasons/${currentSeason.id}/games.ts`, tpl, {
    encoding: "utf8",
  });
};
