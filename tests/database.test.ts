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
import { metadataCatalog } from "../src/data/catalog";
const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-db-test-"));
afterAll(() => rmSync(directory, { force: true, recursive: true }));
const dump = readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8");
describe("application database", () => {
  it("restores and dumps deterministically without overwriting existing files", () => {
    const filename = Path.join(directory, "canonical.db");
    restoreDatabase(filename, dump);
    const db = openDatabase(filename);
    try {
      expect(dumpDatabase(db)).toBe(dump);
      expect(() => restoreDatabase(filename, dump)).toThrow(
        "Refusing to overwrite",
      );
      const metadata = readMetadata(db);
      const catalog = metadataCatalog(metadata);
      expect(catalog.getTeam("constructor")).toBeUndefined();
      expect(() => catalog.requireSeason("9999")).toThrow("Unknown season");
      expect(catalog.getLatestSeason().id).toBe(metadata.seasons.at(-1)?.id);
      expect(catalog.getTeamSeasons("2025").length).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });
  it("upgrades schema 1 transactionally and idempotently", () => {
    const filename = Path.join(directory, "upgrade.db");
    createDatabase(filename, (db) => {
      db.exec(
        readFileSync(
          new URL("../data/migrations/001-initial.sql", import.meta.url),
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
      const before = dumpDatabase(db);
      migrate(db);
      validateDatabase(db);
      expect(dumpDatabase(db)).toBe(before);
    } finally {
      db.close();
    }
  });
  it("preserves optional NBA identifiers through dump/restore", () => {
    const filename = Path.join(directory, "nba.db");
    restoreDatabase(filename, dump);
    const db = openDatabase(filename, false);
    try {
      const game = readGames(db, "2025")[0];
      if (!game) throw new Error("Missing fixture");
      db.prepare("DELETE FROM archived_games WHERE id=?").run(game.id);
      writeGame(db, { ...game, nbaGameId: "0022500001" });
      const copy = Path.join(directory, "nba-copy.db");
      restoreDatabase(copy, dumpDatabase(db));
      const restored = openDatabase(copy);
      try {
        expect(readGames(restored, "2025")[0]?.nbaGameId).toBe("0022500001");
      } finally {
        restored.close();
      }
    } finally {
      db.close();
    }
  });
  it("rolls back a failed migration without publishing partial schema changes", () => {
    const filename = Path.join(directory, "broken.db");
    expect(() =>
      createDatabase(filename, (db) => {
        db.exec(
          readFileSync(
            new URL("../data/migrations/001-initial.sql", import.meta.url),
            "utf8",
          ),
        );
        db.exec("ALTER TABLE archived_games ADD COLUMN nba_game_id TEXT");
        expect(() => migrate(db)).toThrow();
        expect(
          db.prepare("SELECT version FROM schema_migrations").all(),
        ).toHaveLength(1);
        throw new Error("abort fixture");
      }),
    ).toThrow("abort fixture");
    expect(() => openDatabase(filename)).toThrow("Missing database");
  });
});
