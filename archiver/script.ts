import * as Astro from "astro";
import Path from "node:path";
import Url from "node:url";

const __filename = Url.fileURLToPath(import.meta.url);
const projectRoot = Path.dirname(Path.dirname(__filename));

const latestOnly = process.argv[2] === "--latest";
const seasonId =
  process.argv[2] && process.argv[2].length === 4 ? process.argv[2] : undefined;

interface ArchiveResponse {
  failed: { error: string; seasonId: string }[];
  message?: string;
  processed: string[];
  totalGames: number;
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
  if (latestOnly) {
    endpoint = `${baseURL}/api/archive/latest`;
    console.log("Processing latest season...");
  } else if (seasonId) {
    endpoint = `${baseURL}/api/archive/${seasonId}`;
    console.log(`Processing season ${seasonId}...`);
  } else {
    endpoint = `${baseURL}/api/archive/all`;
    console.log("Processing all archivable seasons...");
  }

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(
      `Archive request failed: ${response.status} ${response.statusText}`,
    );
  }

  const results = (await response.json()) as ArchiveResponse;

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

  // Appears to be an astro bug, devServer hangs after stop, appears that it doesn't shut down cloudflare's runtime,
  // still listed as running
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(0);
} finally {
  console.log("STOPPING");
  await astroServer.stop();
  console.log("stopped");
}
