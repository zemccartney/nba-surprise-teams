import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

import { saveSeason, saveTeam, transaction } from "../data/node/commands";
import {
  dumpDatabase,
  openDatabase,
  readMetadata,
  restoreDatabase,
} from "../data/node/database";

it("edits complete metadata records transactionally and refuses implicit creation or invalid assets", () => {
  const dir = mkdtempSync(Path.join(tmpdir(), "nbastt-edit-"));
  const filename = Path.join(dir, "db");
  restoreDatabase(
    filename,
    readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8"),
  );
  const db = openDatabase(filename, false);
  try {
    const metadata = readMetadata(db),
      season = metadata.seasons.at(-1),
      team = metadata.teams[0];
    if (!season || !team) throw new Error("Missing fixtures");
    transaction(db, () =>
      saveSeason(
        db,
        {
          ...season,
          episodeDate: "2026-09-14",
          episodeTitle: "Fixture",
          episodeUrl: "https://example.com/episode",
        },
        true,
      ),
    );
    expect(readMetadata(db).seasons.at(-1)?.episodeTitle).toBe("Fixture");
    transaction(db, () =>
      saveTeam(db, { ...team, name: "Fixture Name" }, true),
    );
    expect(readMetadata(db).teams[0]?.name).toBe("Fixture Name");
    const before = dumpDatabase(db);
    expect(() =>
      transaction(db, () =>
        saveTeam(db, { ...team, emoji: "missing-fixture-logo" }, true),
      ),
    ).toThrow("Missing logo");
    expect(dumpDatabase(db)).toBe(before);
    expect(() =>
      transaction(db, () => saveSeason(db, { ...season, id: "9999" }, true)),
    ).toThrow("Unknown season");
    expect(() =>
      transaction(db, () => saveSeason(db, season, false)),
    ).toThrow();
    expect(() => transaction(db, () => saveTeam(db, team, false))).toThrow();
    expect(dumpDatabase(db)).toBe(before);
  } finally {
    db.close();
    rmSync(dir, { force: true, recursive: true });
  }
});
