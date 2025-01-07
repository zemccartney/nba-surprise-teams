import { asDrizzleTable } from "@astrojs/db/utils";
import { db, eq } from "astro:db";
import { Games } from "./config";
import Fs from "node:fs/promises";
import { SEASONS } from "../src/data";
import * as Utils from "../src/utils";

// TODO untested
// TODO Document WHEN to run (as part of cron?)

// astro db execute db/sync-season --remote
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

  const GT = asDrizzleTable("Games", Games);
  const games = await db
    .select()
    .from(GT)
    .where(eq(GT.season, currentSeason.id));

  const tpl = `
    import type { Game } from "../..";

    export default ${games.map(({ id, ...g }) => g)};
  `;

  await Fs.writeFile(`../seasons/${currentSeason.id}/games.ts`, tpl, {
    encoding: "utf8",
  });
};
