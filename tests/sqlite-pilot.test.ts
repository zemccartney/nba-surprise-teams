import type { DatabaseSync } from "node:sqlite";

import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { embeddedCatalog, paceView } from "../plan/sqlite-spike/catalog";
import {
  dumpDatabase,
  importJson,
  openDatabase,
  readGames,
  readMetadata,
  restoreDatabase,
  sqliteCatalog,
} from "../plan/sqlite-spike/database";
import * as Content from "../src/content-utils";
import { readContentFixture } from "./content-fixture";

vi.mock(import("astro:content"), async () => {
  const { readContentFixture } = await import("./content-fixture");
  const fixture = await readContentFixture();
  return fixture.api;
});
const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-sqlite-test-"));
const filename = Path.join(directory, "restored.db");
const dump = readFileSync(
  new URL("../plan/sqlite-spike/data/dump.sql", import.meta.url),
  "utf8",
);
let db: DatabaseSync;
beforeAll(() => {
  restoreDatabase(filename, dump);
  // eslint-disable-next-line unicorn/no-top-level-assignment-in-function -- Vitest fixture lifecycle owns this real SQLite connection.
  db = openDatabase(filename, false);
});
afterAll(() => {
  db?.close();
  rmSync(directory, { force: true, recursive: true });
});

describe("SQLite pilot CLI", () => {
  it("checks the actual staged dump, rejects accidental odds replacement, and leaves bad writes unapplied", () => {
    const repo = Path.join(directory, "staged-repo");
    const source = Path.join(repo, "plan/sqlite-spike");
    mkdirSync(Path.join(source, "data"), { recursive: true });
    for (const name of [
      "data.ts",
      "database.ts",
      "schema.sql",
      "data/dump.sql",
    ]) {
      copyFileSync(
        new URL(`../plan/sqlite-spike/${name}`, import.meta.url),
        Path.join(source, name),
      );
    }
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, stdio: "pipe" });
    const cli = (...args: string[]) =>
      spawnSync(process.execPath, [Path.join(source, "data.ts"), ...args], {
        cwd: repo,
        encoding: "utf8",
      });
    git("init", "-q");
    git("add", "plan/sqlite-spike/data/dump.sql");
    expect(cli("restore").status).toBe(0);
    expect(cli("check-staged").status).toBe(0);
    const odds = ["--season", "2026", "--team", "CHA", "--over-under", "25.5"];
    expect(cli("add-team-season", ...odds).status).toBe(0);
    const listing = cli("list-team-seasons", "--season", "2026");
    expect(listing.status).toBe(0);
    expect(listing.stdout).toContain("25.5");
    expect(listing.stdout).toContain("CHA");
    expect(cli("list-team-seasons", "--season", "9999").status).not.toBe(0);
    expect(cli("add-team-season", ...odds).status).not.toBe(0);
    expect(
      cli(
        "update-odds",
        "--season",
        "2026",
        "--team",
        "CHA",
        "--over-under",
        "25.25",
      ).status,
    ).not.toBe(0);
    expect(cli("dump").status).toBe(0);
    expect(cli("check").status).toBe(0);
    const stale = cli("check-staged");
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain("dump drift (check-staged)");
    git("add", "plan/sqlite-spike/data/dump.sql");
    expect(cli("check-staged").status).toBe(0);
    const edited = openDatabase(Path.join(source, "data/tracker.db"));
    try {
      expect(
        sqliteCatalog(edited).getTeamSeason("2026", "CHA")?.overUnder,
      ).toBe(25.5);
    } finally {
      edited.close();
    }
  });
});

describe("SQLite pilot persistence", () => {
  it("restores a canonical dump byte-for-byte and refuses overwrite", () => {
    expect(dumpDatabase(db)).toBe(dump);
    expect(() => restoreDatabase(filename, dump)).toThrow(
      "Refusing to overwrite",
    );
  });
  it("imports current JSON without losing metadata or archived game fields", async () => {
    const imported = Path.join(directory, "imported.db");
    importJson(
      imported,
      fileURLToPath(new URL("../src/content", import.meta.url)),
    );
    const source = openDatabase(imported);
    try {
      expect(dumpDatabase(source)).toBe(dump);
    } finally {
      source.close();
    }
    const { raw } = await readContentFixture();
    const metadata = readMetadata(db);
    expect(metadata.teams).toEqual(raw.teams);
    expect(metadata.seasons).toEqual(raw.seasons);
    expect(metadata.teamSeasons).toEqual(
      raw.teamSeasons
        .toSorted((a, b) => a.id.localeCompare(b.id))
        .map((entry) => ({
          overUnder: entry.overUnder,
          seasonId: entry.season,
          teamId: entry.team,
        })),
    );
    expect(
      raw.teamSeasons.every(
        (entry) => entry.id === `${entry.season}/${entry.team}`,
      ),
    ).toBe(true);
    const games = metadata.seasons.flatMap((season) =>
      readGames(db, season.id),
    );
    expect(games.toSorted((a, b) => a.id.localeCompare(b.id))).toEqual(
      raw.games.toSorted((a, b) => a.id.localeCompare(b.id)),
    );
  });
  it.each([
    ["unknown season", "INSERT INTO team_seasons VALUES('9999','CHA',51)"],
    ["unknown team", "INSERT INTO team_seasons VALUES('2026','XYZ',51)"],
    [
      "duplicate team season",
      "INSERT INTO team_seasons SELECT * FROM team_seasons LIMIT 1",
    ],
    ["quarter-win odds", "INSERT INTO team_seasons VALUES('2026','CHA',50.5)"],
    ["negative odds", "INSERT INTO team_seasons VALUES('2026','CHA',-1)"],
    [
      "invalid date",
      "INSERT INTO seasons(id,start_date,end_date) VALUES('2027','2027-02-30','2028-04-01')",
    ],
    [
      "same-team game",
      "INSERT INTO archived_games VALUES('fixture','2025','2025-11-01','CHA','CHA',90,100)",
    ],
    [
      "unfinished game",
      "INSERT INTO archived_games VALUES('fixture','2025','2025-11-01','CHA','ATL',0,0)",
    ],
  ])("rejects %s in SQLite", (_name, sql) => {
    db.exec("SAVEPOINT rejection");
    try {
      expect(() => db.exec(sql)).toThrow();
    } finally {
      db.exec("ROLLBACK TO rejection; RELEASE rejection");
    }
  });
  it("supports newly available odds and explicit updates without changing older rows", () => {
    db.exec("SAVEPOINT odds");
    try {
      const old = sqliteCatalog(db).getTeamSeason("2025", "CHA");
      db.prepare("INSERT INTO team_seasons VALUES(?,?,?)").run(
        "2026",
        "CHA",
        51,
      );
      expect(sqliteCatalog(db).getTeamSeason("2026", "CHA")?.overUnder).toBe(
        25.5,
      );
      db.prepare(
        "UPDATE team_seasons SET over_under_twice=? WHERE season_id=? AND team_id=?",
      ).run(53, "2026", "CHA");
      expect(sqliteCatalog(db).getTeamSeason("2026", "CHA")?.overUnder).toBe(
        26.5,
      );
      expect(sqliteCatalog(db).getTeamSeason("2025", "CHA")).toEqual(old);
    } finally {
      db.exec("ROLLBACK TO odds; RELEASE odds");
    }
  });
});

describe("SQLite and embedded catalog parity", () => {
  it("handles historical/current metadata, opponents, unknown IDs and latest season identically", () => {
    const metadata = readMetadata(db);
    expect(
      Object.keys(metadata).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["seasons", "teams", "teamSeasons"]);
    const sql = sqliteCatalog(db);
    const embedded = embeddedCatalog(metadata);
    expect(embedded.getLatestSeason()).toEqual(sql.getLatestSeason());
    for (const team of metadata.teams)
      expect(embedded.getTeam(team.id)).toEqual(sql.getTeam(team.id));
    for (const season of metadata.seasons)
      expect(embedded.getSeason(season.id)).toEqual(sql.getSeason(season.id));
    for (const ts of metadata.teamSeasons)
      expect(embedded.getTeamSeason(ts.seasonId, ts.teamId)).toEqual(
        sql.getTeamSeason(ts.seasonId, ts.teamId),
      );
    for (const catalog of [sql, embedded]) {
      expect(catalog.getTeam("constructor")).toBeUndefined();
      expect(catalog.getSeason("9999")).toBeUndefined();
      expect(catalog.getTeamSeason("2026", "CHA")).toBeUndefined();
    }
  });
  it("preserves every existing chart point, season rule, record and historical name", async () => {
    const { entries, raw } = await readContentFixture();
    const sql = sqliteCatalog(db);
    const embedded = embeddedCatalog(readMetadata(db));
    for (const entry of entries.teamSeasons) {
      const seasonId = entry.data.season.id;
      const teamId = entry.data.team.id;
      const games = raw.games.filter(
        (game) =>
          game.seasonId === seasonId &&
          game.teams.some((team) => team.teamId === teamId),
      );
      const view = paceView(
        sql,
        seasonId,
        teamId,
        readGames(db, seasonId, teamId),
      );
      expect(view).toEqual(
        paceView(embedded, seasonId, teamId, readGames(db, seasonId, teamId)),
      );
      expect(view.chart.surpriseRules).toEqual(
        await Content.getSeasonSurpriseRules(seasonId),
      );
      expect(view.chart.winsToSurprise).toBe(
        await Content.winsToSurprise(entry),
      );
      expect(view.record).toEqual(Content.calculateTeamRecord(teamId, games));
      const team = entries.teams.find((item) => item.id === teamId);
      if (!team) throw new Error(`Missing source team ${teamId}`);
      expect(view.name).toBe(Content.resolveTeamName(team, seasonId));
      for (let i = 0; i < games.length; i++) {
        const record = Content.calculateTeamRecord(
          teamId,
          games.slice(0, i + 1),
        );
        expect(view.chart.data[i]).toEqual({
          date: games[i]?.playedOn,
          pace: await Content.pace(entry, record),
          projectedWins: await Content.projectedWins(seasonId, record),
          recordFmt: Content.formatRecord(record),
        });
      }
    }
  });
});
