import Fs from "node:fs/promises";
import Path from "node:path";
import Url from "node:url";

import type { SeasonId } from "./src/data/types.ts";

import ArchiveLoader from "./src/data/loaders/archive.ts";
import * as SeasonUtils from "./src/data/seasons";
import * as Utils from "./src/utils.ts";

const __filename = Url.fileURLToPath(import.meta.url);
const projectRoot = Path.dirname(__filename);

const seasonsDir = await Fs.readdir(Path.join(projectRoot, "src/data/seasons"));

const today = Utils.getCurrentEasternYYYYMMDD();
const seasons = seasonsDir
  .filter((entry) => entry !== "index.ts")
  .map((season) => Number.parseInt(season, 10) as SeasonId)
  .filter((seasonId) => {
    const season = SeasonUtils.getSeasonById(seasonId);

    return !(
      // Exclude any current season; do not archive, handled
      // by live loader on demand via server action
      (
        (today >= season.startDate && today <= season.endDate) ||
        // Exclude any future season; no data yet
        today < season.startDate
      )
    );
  });

const wr = async (seasonId: SeasonId) => {
  const res = await ArchiveLoader(seasonId);

  const dest = Path.join(
    projectRoot,
    `src/data/seasons/${seasonId}/games.json`,
  );

  await Fs.writeFile(dest, JSON.stringify(res.games), {
    encoding: "utf8",
  });

  console.log("WROTE FOR", seasonId);
};

await Promise.all(seasons.map((seasonId) => wr(seasonId)));

console.log("Archive filled");
