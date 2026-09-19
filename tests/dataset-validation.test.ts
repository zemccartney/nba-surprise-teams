import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { afterAll, expect, it } from "vitest";

import { openDatabase, restoreDatabase } from "../data/node/database";
import { validateDataset } from "../data/node/validate";

const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-validation-"));
const filename = Path.join(directory, "fixture.db");
restoreDatabase(
  filename,
  readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8"),
);
const db = openDatabase(filename, false);
afterAll(() => {
  db.close();
  rmSync(directory, { force: true, recursive: true });
});

it.each([
  [
    "provider identity",
    "UPDATE archived_games SET nba_game_id='duplicate-fixture' WHERE id IN (SELECT id FROM archived_games LIMIT 2)",
    "Duplicate NBA game identifiers",
  ],
  [
    "season identity",
    "UPDATE seasons SET start_date='2024-10-01' WHERE id='2025'",
    "Season dates must match identity",
  ],
  [
    "overlap",
    "UPDATE seasons SET end_date='2025-12-01' WHERE id='2024'",
    "Overlapping seasons",
  ],
  [
    "candidate cutoff",
    "UPDATE team_seasons SET over_under_twice=100 WHERE season_id='2025' AND team_id='CHA'",
    "Not a surprise candidate",
  ],
  [
    "game window",
    "UPDATE archived_games SET played_on='1900-01-01' WHERE id=(SELECT id FROM archived_games LIMIT 1)",
    "Game outside season",
  ],
  [
    "game identity",
    "UPDATE archived_games SET id='wrong' WHERE id=(SELECT id FROM archived_games LIMIT 1)",
    "Game identity mismatch",
  ],
  [
    "candidate participation",
    "DELETE FROM team_seasons WHERE season_id='2025'",
    "No candidate",
  ],
  [
    "complete archives",
    "DELETE FROM archived_games WHERE id=(SELECT id FROM archived_games WHERE season_id='2025' LIMIT 1)",
    "Incomplete archive",
  ],
])(
  "rejects invalid %s even when SQL constraints accept the edit",
  (_name, sql, message) => {
    db.exec("SAVEPOINT invalid_fixture");
    try {
      db.exec(sql);
      expect(() => validateDataset(db)).toThrow(message);
    } finally {
      db.exec("ROLLBACK TO invalid_fixture; RELEASE invalid_fixture");
    }
  },
);
