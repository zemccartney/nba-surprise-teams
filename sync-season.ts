import "dotenv/config";
import Fs from "node:fs/promises";
import Path from "node:path";
import Url from "node:url";
import * as Data from "./src/data";
import * as Utils from "./src/utils";
import type { Loader } from "./src/data";

// npx tsx sync-season <seasonId> (defaults to current season)

const __filename = Url.fileURLToPath(import.meta.url);
const projectRoot = Path.dirname(__filename);

const seasonId = process.argv[2];

let season;
if (seasonId) {
  season = Data.getSeasonById(Number.parseInt(seasonId, 10));
} else {
  const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();
  season = Data.SEASONS.find(
    (season) =>
      season.startDate <= currentYYYYMMDD && season.endDate >= currentYYYYMMDD,
  );
}

if (!season) {
  throw new Error("Could not resolve a season for which to save data");
}

// not suitable for running on retroactively added seasons, which may or may not have a loader
// file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
const { default: loader } = await import(
  Path.join(projectRoot, `src/data/seasons/${season.id}/loader.ts?env=node`)
);

const { games } = await (loader as Loader)();

const dest = Path.join(projectRoot, `src/data/seasons/${season.id}/games.json`);

await Fs.writeFile(dest, JSON.stringify(games), {
  encoding: "utf8",
});
