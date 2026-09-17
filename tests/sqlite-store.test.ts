import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import Path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

import { replaceArchive, saveOdds, transaction } from "../data/node/commands";
import {
  dumpDatabase,
  openDatabase,
  readMetadata,
  restoreDatabase,
} from "../data/node/database";
import * as Content from "../src/content-utils";
import { metadataCatalog } from "../src/data/catalog";
import { metadataSchema } from "../src/data/model";
import { readContentFixture } from "./content-fixture";
import baseline from "./fixtures/collection-baseline.json";

const directory = mkdtempSync(Path.join(tmpdir(), "nbastt-store-test-"));
afterAll(() => rmSync(directory, { force: true, recursive: true }));
const dump = readFileSync(new URL("../data/dump.sql", import.meta.url), "utf8");
const filename = Path.join(directory, "db");
restoreDatabase(filename, dump);
const db = openDatabase(filename, false);
afterAll(() => db.close());

describe("SQLite operational contracts", () => {
  it("checks actual staged bytes, rejects duplicate/invalid odds and publishes only successful edits", () => {
    const repo = Path.join(directory, "repo");
    mkdirSync(Path.join(repo, "data"), { recursive: true });
    const database = Path.join(repo, "data/tracker.db"),
      sql = Path.join(repo, "data/dump.sql");
    writeFileSync(sql, dump);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, stdio: "pipe" });
    const cli = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          fileURLToPath(new URL("../data/cli.ts", import.meta.url)),
          ...args,
          "--db",
          database,
          "--dump",
          sql,
        ],
        { cwd: repo, encoding: "utf8" },
      );
    git("init", "-q");
    git("add", "data/dump.sql");
    expect(cli("check-staged").status).toBe(0);
    expect(cli("restore").status).toBe(0);
    expect(cli("check-staged").status).toBe(0);
    const odds = ["--season", "2026", "--team", "CHA", "--over-under", "25.5"];
    expect(cli("add-team-season", ...odds).status).toBe(0);
    const revision = readFileSync(database + ".revision", "utf8");
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
    expect(readFileSync(database + ".revision", "utf8")).toBe(revision);
    expect(cli("list-team-seasons", "--season", "2026").stdout).toContain(
      "25.5",
    );
    expect(cli("list-team-seasons", "--season", "9999").status).not.toBe(0);
    expect(cli("dump").status).toBe(0);
    expect(cli("check").status).toBe(0);
    const stale = cli("check-staged");
    expect(stale.status).not.toBe(0);
    expect(stale.stderr).toContain("dump drift (check-staged)");
    git("add", "data/dump.sql");
    expect(cli("check-staged").status).toBe(0);
  });
  it.each([
    [
      "unknown season",
      "INSERT INTO team_seasons(season_id,team_id,over_under_twice) VALUES('9999','CHA',51)",
    ],
    [
      "unknown team",
      "INSERT INTO team_seasons(season_id,team_id,over_under_twice) VALUES('2026','XYZ',51)",
    ],
    [
      "duplicate team season",
      "INSERT INTO team_seasons SELECT * FROM team_seasons LIMIT 1",
    ],
    [
      "quarter-win odds",
      "INSERT INTO team_seasons(season_id,team_id,over_under_twice) VALUES('2026','CHA',50.5)",
    ],
    [
      "negative odds",
      "INSERT INTO team_seasons(season_id,team_id,over_under_twice) VALUES('2026','CHA',-1)",
    ],
    [
      "invalid date",
      "INSERT INTO seasons(id,start_date,end_date) VALUES('2027','2027-02-30','2028-04-01')",
    ],
    [
      "same-team game",
      "INSERT INTO archived_games(id,season_id,played_on,team1_id,team2_id,score1,score2) VALUES('fixture','2025','2025-11-01','CHA','CHA',90,100)",
    ],
    [
      "unfinished game",
      "INSERT INTO archived_games(id,season_id,played_on,team1_id,team2_id,score1,score2) VALUES('fixture','2025','2025-11-01','CHA','ATL',0,0)",
    ],
  ])("rejects %s in SQLite", (_name, sql) => {
    db.exec("SAVEPOINT rejected");
    try {
      expect(() => db.exec(sql)).toThrow();
    } finally {
      db.exec("ROLLBACK TO rejected; RELEASE rejected");
    }
  });
  it("rolls back incomplete archives and invalid domain edits without changing historical data", () => {
    const before = dumpDatabase(db);
    const fixture = readContentFixture();
    expect(() =>
      transaction(db, () =>
        replaceArchive(
          db,
          "2025",
          fixture.games.filter((g) => g.seasonId === "2025").slice(1),
        ),
      ),
    ).toThrow("Incomplete archive");
    expect(dumpDatabase(db)).toBe(before);
    expect(() =>
      transaction(db, () => saveOdds(db, "2026", "CHA", "40", false)),
    ).toThrow("Not a surprise candidate");
    expect(dumpDatabase(db)).toBe(before);
  });
  it("supports odds additions and updates without replacing older rows", () => {
    db.exec("SAVEPOINT odds");
    try {
      const old = metadataCatalog(readMetadata(db)).getTeamSeason(
        "2025",
        "CHA",
      );
      saveOdds(db, "2026", "CHA", "25.5", false);
      saveOdds(db, "2026", "CHA", "26.5", true);
      const catalog = metadataCatalog(readMetadata(db));
      expect(catalog.getTeamSeason("2026", "CHA")?.overUnder).toBe(26.5);
      expect(catalog.getTeamSeason("2025", "CHA")).toEqual(old);
    } finally {
      db.exec("ROLLBACK TO odds; RELEASE odds");
    }
  });
});
describe("plain metadata and approved collection parity", () => {
  it("round-trips small metadata without games or collection references", () => {
    const metadata = readMetadata(db);
    expect(
      Object.keys(metadata).toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(["seasons", "teams", "teamSeasons"]);
    const serialized = JSON.stringify(metadata);
    const catalog = metadataCatalog(
      metadataSchema.parse(JSON.parse(serialized)),
    );
    for (const team of metadata.teams)
      expect(catalog.getTeam(team.id)).toEqual(team);
    for (const season of metadata.seasons)
      expect(catalog.getSeason(season.id)).toEqual(season);
    for (const team of metadata.teamSeasons)
      expect(catalog.getTeamSeason(team.seasonId, team.teamId)).toEqual(team);
    expect(catalog.getTeam("SAS")?.emoji).toBe("bat");
    expect(catalog.getTeam("UTA")?.emoji).toBe("saxophone");
    const renderedOrder = metadata.teamSeasons
      .filter((row) => Number(row.seasonId) <= 2025)
      .map((row) => row.id);
    expect(renderedOrder).toEqual(
      renderedOrder.toSorted((a, b) => a.localeCompare(b)),
    );
    expect(catalog.getTeam("constructor")).toBeUndefined();
    expect(catalog.getSeason("9999")).toBeUndefined();
    expect(catalog.getTeamSeason("9999", "CHA")).toBeUndefined();
  });
  it("preserves every approved historical chart point, record, rule and name", () => {
    const fixture = readContentFixture();
    // Intentional historical corrections require reviewing/updating this golden;
    // newly archived seasons after 2025 do not invalidate it.
    const approvedGames = fixture.games.filter(
      (game) => Number(game.seasonId) <= 2025,
    );
    expect(
      createHash("sha256").update(JSON.stringify(approvedGames)).digest("hex"),
    ).toBe(baseline.games);
    for (const expected of baseline.charts) {
      const teamSeason = fixture.teamSeasons.find((t) => t.id === expected.id);
      if (!teamSeason) throw new Error(`Missing ${expected.id}`);
      const games = fixture.games.filter(
        (g) =>
          g.seasonId === teamSeason.seasonId &&
          g.teams.some((t) => t.teamId === teamSeason.teamId),
      );
      const data = games.map((game, index) => {
        const record = Content.calculateTeamRecord(
          teamSeason.teamId,
          games.slice(0, index + 1),
        );
        return {
          date: game.playedOn,
          pace: Content.pace(teamSeason, record),
          projectedWins: Content.projectedWins(teamSeason.seasonId, record),
          recordFmt: Content.formatRecord(record),
        };
      });
      const chart = {
        data,
        surpriseRules: Content.getSeasonSurpriseRules(teamSeason.seasonId),
        winsToSurprise: Content.winsToSurprise(teamSeason),
      };
      expect(
        createHash("sha256").update(JSON.stringify(chart)).digest("hex"),
      ).toBe(expected.hash);
      expect(Content.calculateTeamRecord(teamSeason.teamId, games)).toEqual(
        expected.record,
      );
      expect(
        Content.resolveTeamName(
          fixture.catalog.requireTeam(teamSeason.teamId),
          teamSeason.seasonId,
        ),
      ).toBe(expected.name);
    }
  });
});
