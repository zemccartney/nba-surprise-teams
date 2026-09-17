import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  createDatabase,
  dumpDatabase,
  migrate,
  openDatabase,
  readGames,
  readMetadata,
  restoreDatabase,
  validateDatabase,
  writeGame,
} from "../data/node/database";
import { importLegacyJson } from "../data/node/import-json";
import { metadataCatalog } from "../src/data/catalog";
import { readContentFixture } from "./content-fixture";

const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-database-"));
afterAll(() => rmSync(directory, { force: true, recursive: true }));

describe("application database migration", () => {
  it("preserves all source records and the original metadata ordering", async () => {
    const filename = Path.join(directory, "import.db");
    importLegacyJson(filename);
    const db = openDatabase(filename);
    try {
      const { raw } = await readContentFixture();
      const metadata = readMetadata(db);
      expect(metadata.seasons).toEqual(raw.seasons);
      expect(metadata.teams).toEqual(raw.teams);
      expect(metadata.teamSeasons).toEqual(
        raw.teamSeasons.map((row) => ({
          id: row.id,
          overUnder: row.overUnder,
          seasonId: row.season,
          teamId: row.team,
        })),
      );
      expect(readGames(db)).toEqual(raw.games);
      const dump = dumpDatabase(db);
      const restored = Path.join(directory, "restored.db");
      restoreDatabase(restored, dump);
      const copy = openDatabase(restored);
      try {
        expect(dumpDatabase(copy)).toBe(dump);
      } finally {
        copy.close();
      }
      expect(() => restoreDatabase(restored, dump)).toThrow(
        "Refusing to overwrite",
      );
      const catalog = metadataCatalog(metadata);
      expect(catalog.getLatestSeason().id).toBe("2026");
      expect(catalog.getTeam("constructor")).toBeUndefined();
      expect(() => catalog.requireSeason("9999")).toThrow("Unknown season");
      expect(catalog.getTeamSeasons("2025").length).toBeGreaterThan(0);
      expect(catalog.getTeamSeasons("2026")).toEqual([]);
    } finally {
      db.close();
    }
  });
  it("upgrades schema 1 transactionally, preserves archived NBA identifiers and is idempotent", () => {
    const filename = Path.join(directory, "upgraded.db");
    createDatabase(filename, (db) => {
      db.exec(
        readFileSync(
          new URL("../plan/sqlite-spike/data/dump.sql", import.meta.url),
          "utf8",
        ),
      );
      migrate(db);
    });
    const db = openDatabase(filename, false);
    try {
      expect(
        db
          .prepare("SELECT version FROM schema_migrations ORDER BY version")
          .all()
          .map((row) => row.version),
      ).toEqual([1, 2]);
      const games = readGames(db, "2025");
      const game = games[0];
      if (!game) throw new Error("Missing migration fixture");
      db.prepare("DELETE FROM archived_games WHERE id=?").run(game.id);
      writeGame(db, { ...game, nbaGameId: "0022500001" });
      expect(readGames(db, "2025")[0]?.nbaGameId).toBe("0022500001");
      const before = dumpDatabase(db);
      migrate(db);
      validateDatabase(db);
      expect(dumpDatabase(db)).toBe(before);
    } finally {
      db.close();
    }
  });
});
