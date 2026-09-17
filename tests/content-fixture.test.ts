import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  dumpDatabase,
  openDatabase,
  restoreDatabase,
} from "../data/node/database";
import { readContentFixture } from "./content-fixture";

const withCopy = (check: (filename: string, dump: string) => void) => {
  const dir = mkdtempSync(Path.join(tmpdir(), "nbastt-fixture-test-"));
  try {
    const dump = Path.join(dir, "dump.sql"),
      filename = Path.join(dir, "db");
    const text = readFileSync(
      new URL("../data/dump.sql", import.meta.url),
      "utf8",
    );
    writeFileSync(dump, text);
    restoreDatabase(filename, text);
    check(filename, dump);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
};
describe("fresh SQL fixtures", () => {
  it("returns plain records and distinguishes optional from required lookups", () => {
    const { catalog } = readContentFixture();
    expect(catalog.getSeason("missing")).toBeUndefined();
    expect(() => catalog.requireSeason("missing")).toThrow();
    expect(catalog.getTeamSeasons("missing")).toEqual([]);
    expect(catalog.getTeam("CHA")).not.toHaveProperty("data");
  });
  it("reads changed canonical bytes on the next call without a dev server", () =>
    withCopy((filename, dump) => {
      const first = readContentFixture(pathToFileURL(dump));
      const game = first.games[0];
      if (!game) throw new Error("Empty fixture");
      const db = openDatabase(filename, false);
      try {
        db.prepare(
          "UPDATE archived_games SET score1=score1+100 WHERE id=?",
        ).run(game.id);
        writeFileSync(dump, dumpDatabase(db));
      } finally {
        db.close();
      }
      expect(
        readContentFixture(pathToFileURL(dump)).games[0]?.teams[0].score,
      ).toBe(game.teams[0].score + 100);
    }));
  it.each(["archived_games", "team_seasons", "seasons", "teams"])(
    "rejects an empty %s rather than passing vacuously",
    (table) =>
      withCopy((_filename, dump) => {
        writeFileSync(
          dump,
          readFileSync(dump, "utf8") +
            `\nPRAGMA foreign_keys=OFF; DELETE FROM ${table};\n`,
        );
        expect(() => readContentFixture(pathToFileURL(dump))).toThrow();
      }),
  );
  it("rejects duplicate identities at restore, before a Map can hide them", () =>
    withCopy((_filename, dump) => {
      writeFileSync(
        dump,
        readFileSync(dump, "utf8") +
          "\nINSERT INTO teams SELECT * FROM teams LIMIT 1;\n",
      );
      expect(() => readContentFixture(pathToFileURL(dump))).toThrow();
    }));
});
