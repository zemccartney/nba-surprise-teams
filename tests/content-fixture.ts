import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";

import {
  readGames,
  readMetadata,
  restoreDatabase,
  withDatabase,
} from "../data/node/database";
import { validateDataset } from "../data/node/validate";
import { metadataCatalog } from "../src/data/catalog";

// Every call restores fresh canonical bytes. No Astro store, no working DB, no
// module-level data cache, and no collection-API mock to mask duplicate IDs.
export const readContentFixture = (
  dump = new URL("../data/dump.sql", import.meta.url),
) => {
  const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-fixture-"));
  try {
    const filename = Path.join(directory, "fixture.db");
    restoreDatabase(filename, readFileSync(dump, "utf8"));
    return withDatabase(filename, (db) => {
      validateDataset(db);
      const metadata = readMetadata(db);
      return {
        ...metadata,
        catalog: metadataCatalog(metadata),
        games: readGames(db),
      };
    });
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};
