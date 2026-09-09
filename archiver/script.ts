import * as Astro from "astro";
import Fs from "node:fs/promises";
import Path from "node:path";
import Url from "node:url";

import type { GameData } from "../src/content-utils";

const __filename = Url.fileURLToPath(import.meta.url);
const projectRoot = Path.dirname(Path.dirname(__filename));

const isLatestOnly = process.argv[2] === "--latest";
const seasonId =
  process.argv[2] && process.argv[2].length === 4 ? process.argv[2] : undefined;

interface ArchiveResponse {
  failed: { error: string; seasonId: string }[];
  games: GameData[];
  message?: string;
  processed: string[];
  totalGames: number;
}

// The endpoint runs in workerd, which cannot write to the repo, so the merge
// into src/content/games.json happens here.
async function updateGamesFile(
  fetchedGames: GameData[],
  processedSeasonIds: string[],
): Promise<void> {
  const gamesFile = Path.join(projectRoot, "src/content/games.json");

  const existingGames = JSON.parse(
    await Fs.readFile(gamesFile, "utf8"),
  ) as GameData[];

  const allGames = [
    ...existingGames.filter(
      (game) => !processedSeasonIds.includes(game.seasonId),
    ),
    ...fetchedGames,
  ].toSorted((a, b) => {
    // Sort by playedOn date first, then by game ID for stability
    const dateCompare = a.playedOn.localeCompare(b.playedOn);
    return dateCompare === 0 ? a.id.localeCompare(b.id) : dateCompare;
  });

  await Fs.writeFile(gamesFile, JSON.stringify(allGames), {
    encoding: "utf8",
  });

  console.log(
    `Updated games file with ${fetchedGames.length} games from ${processedSeasonIds.length} seasons`,
  );
}

const astroServer = await Astro.dev({
  logLevel: "warn",
  mode: "development",
  root: projectRoot,
  // Use a different port to avoid conflicts with regular dev server
  server: { port: 4322 },
});

const baseURL = `http://localhost:4322`;

try {
  let endpoint: string;
  if (isLatestOnly) {
    endpoint = `${baseURL}/api/archive/latest/`;
    console.log("Processing latest season...");
  } else if (seasonId) {
    endpoint = `${baseURL}/api/archive/${seasonId}/`;
    console.log(`Processing season ${seasonId}...`);
  } else {
    endpoint = `${baseURL}/api/archive/all/`;
    console.log("Processing all archivable seasons...");
  }

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(
      `Archive request failed: ${response.status} ${response.statusText}`,
    );
  }

  const results = (await response.json()) as ArchiveResponse;

  if (results.processed.length > 0) {
    await updateGamesFile(results.games, results.processed);
  }

  console.log("\n=== Archive Results ===");
  console.log(`✓ Successfully processed: ${results.processed.length} seasons`);
  console.log(`✗ Failed: ${results.failed.length} seasons`);
  console.log(`📊 Total games archived: ${results.totalGames}`);

  if (results.processed.length > 0) {
    console.log(`\nProcessed seasons: ${results.processed.join(", ")}`);
  }

  if (results.failed.length > 0) {
    console.log("\nFailed seasons:");
    for (const { error, seasonId } of results.failed) {
      console.log(`  ${seasonId}: ${error}`);
    }
  }

  if (results.message) {
    console.log(`\n${results.message}`);
  }

  console.log("\nArchive completed!");
} finally {
  await astroServer.stop();
}
