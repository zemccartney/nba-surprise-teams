import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { expect, it } from "vitest";

import {
  applyChanges,
  saveSeason,
  saveTeam,
  transaction,
} from "../data/node/commands";
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

    const seasonRecord = {
      endDate: "1995-04-20",
      id: "1994",
      startDate: "1994-11-01",
    };
    const candidate = {
      id: "1994/CHA",
      overUnder: 20,
      seasonId: "1994",
      teamId: "CHA",
    };
    const games = Array.from({ length: 82 }, (_, index) => {
      const playedOn = new Date(Date.parse("1994-11-01") + index * 86_400_000)
        .toISOString()
        .slice(0, 10);
      return {
        id: `${playedOn}/ATL__CHA`,
        playedOn,
        seasonId: "1994",
        teams: [
          { score: 90, teamId: "ATL" },
          { score: 100, teamId: "CHA" },
        ],
      };
    });
    const changes = [
      { command: "add-season", record: seasonRecord },
      { command: "add-team-season", record: candidate },
      { command: "import-archive", record: { games, seasonId: "1994" } },
    ];
    expect(() =>
      transaction(db, () => applyChanges(db, changes.slice(0, 2))),
    ).toThrow("Incomplete archive");
    expect(dumpDatabase(db)).toBe(before);
    transaction(db, () => applyChanges(db, changes));
    expect(readMetadata(db).seasons.some((row) => row.id === "1994")).toBe(
      true,
    );
  } finally {
    db.close();
    rmSync(dir, { force: true, recursive: true });
  }
});
