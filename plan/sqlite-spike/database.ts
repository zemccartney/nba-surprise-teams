/* eslint unicorn/no-null: "off" -- SQLite binds and returns SQL NULL as JavaScript null. */
// Node-only boundary. Never import this module from a Worker or browser.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import Path from "node:path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";

import type {
  Catalog,
  Game,
  Metadata,
  Season,
  Team,
  TeamSeason,
} from "./catalog.ts";

export const NODE_ONLY_MARKER = "SQLITE_PILOT_NODE_ONLY";
type Row = Record<string, SQLOutputValue>;
const text = (row: Row, key: string): string => {
  assert.equal(typeof row[key], "string", key);
  return row[key] as string;
};
const number = (row: Row, key: string): number => {
  assert.equal(typeof row[key], "number", key);
  return row[key] as number;
};
// Publish only a successfully validated, closed DB. link refuses an existing target.
export function createDatabase(
  filename: string,
  populate: (db: DatabaseSync) => void,
) {
  if (existsSync(filename))
    throw new Error(`Refusing to overwrite ${filename}`);
  mkdirSync(Path.dirname(filename), { recursive: true });
  const temporary = `${filename}.partial-${randomUUID()}`;
  writeFileSync(temporary, "", { flag: "wx" });
  const db = new DatabaseSync(temporary);
  try {
    db.exec("PRAGMA foreign_keys=ON;");
    populate(db);
    db.exec("PRAGMA foreign_keys=ON;");
    validateDatabase(db);
  } catch (error) {
    db.close();
    unlinkSync(temporary);
    throw error;
  }
  db.close();
  try {
    linkSync(temporary, filename);
  } finally {
    unlinkSync(temporary);
  }
}
export function fileCatalog(filename: string): Catalog {
  const read = <T>(query: (catalog: Catalog) => T): T =>
    withDatabase(filename, (db) => query(sqliteCatalog(db)));
  return {
    getLatestSeason: () => read((catalog) => catalog.getLatestSeason()),
    getSeason: (id) => read((catalog) => catalog.getSeason(id)),
    getTeam: (id) => read((catalog) => catalog.getTeam(id)),
    getTeamSeason: (seasonId, teamId) =>
      read((catalog) => catalog.getTeamSeason(seasonId, teamId)),
  };
}
export function openDatabase(filename: string, isReadOnly = true) {
  if (!existsSync(filename))
    throw new Error(
      `Missing SQLite database: ${filename}; run restore explicitly`,
    );
  const db = new DatabaseSync(filename, { readOnly: isReadOnly });
  try {
    db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    const version = db
      .prepare("SELECT max(version) AS version FROM schema_migrations")
      .get();
    assert.equal(version?.version, 1, "Unsupported SQLite schema version");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
export function readGames(
  db: DatabaseSync,
  seasonId: string,
  teamId?: string,
): Game[] {
  return db
    .prepare(
      "SELECT * FROM archived_games WHERE season_id=? AND (? IS NULL OR team1_id=? OR team2_id=?) ORDER BY played_on, id",
    )
    .all(seasonId, teamId ?? null, teamId ?? null, teamId ?? null)
    .map((row) => ({
      id: text(row, "id"),
      playedOn: text(row, "played_on"),
      seasonId: text(row, "season_id"),
      teams: [
        { score: number(row, "score1"), teamId: text(row, "team1_id") },
        { score: number(row, "score2"), teamId: text(row, "team2_id") },
      ],
    }));
}
export function readMetadata(db: DatabaseSync): Metadata {
  db.exec("SAVEPOINT metadata_snapshot");
  try {
    return {
      seasons: db
        .prepare("SELECT * FROM seasons ORDER BY id")
        .all()
        .map((row) => seasonRow(row)),
      teams: db
        .prepare("SELECT * FROM teams ORDER BY id")
        .all()
        .map((row) => teamRow(db, row)),
      teamSeasons: db
        .prepare("SELECT * FROM team_seasons ORDER BY season_id, team_id")
        .all()
        .map((row) => teamSeasonRow(row)),
    };
  } finally {
    db.exec("RELEASE metadata_snapshot");
  }
}
export function restoreDatabase(filename: string, dump: string) {
  createDatabase(filename, (db) => db.exec(dump));
}
export function sqliteCatalog(db: DatabaseSync): Catalog {
  return {
    getLatestSeason() {
      const row = db
        .prepare("SELECT * FROM seasons ORDER BY start_date DESC LIMIT 1")
        .get();
      assert.ok(row);
      return seasonRow(row);
    },
    getSeason(id) {
      const row = db.prepare("SELECT * FROM seasons WHERE id=?").get(id);
      return row && seasonRow(row);
    },
    getTeam(id) {
      const row = db.prepare("SELECT * FROM teams WHERE id=?").get(id);
      return row && teamRow(db, row);
    },
    getTeamSeason(seasonId, teamId) {
      const row = db
        .prepare("SELECT * FROM team_seasons WHERE season_id=? AND team_id=?")
        .get(seasonId, teamId);
      return row && teamSeasonRow(row);
    },
  };
}
export function validateDatabase(db: DatabaseSync) {
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  const result = db.prepare("PRAGMA integrity_check").all();
  assert.equal(result.length, 1);
  assert.equal(result[0]?.integrity_check, "ok");
  assert.equal(
    db.prepare("SELECT max(version) AS version FROM schema_migrations").get()
      ?.version,
    1,
  );
}
// Short-lived read-only handles keep HMR and DB replacement from retaining
// stale connections. The pilot has a handful of indexed reads per page.
export function withDatabase<T>(
  filename: string,
  read: (db: DatabaseSync) => T,
): T {
  const db = openDatabase(filename);
  try {
    return read(db);
  } finally {
    db.close();
  }
}
function seasonRow(row: Row): Season {
  return {
    endDate: text(row, "end_date"),
    id: text(row, "id"),
    startDate: text(row, "start_date"),
    ...(row.episode_date !== null && {
      episodeDate: text(row, "episode_date"),
      episodeTitle: text(row, "episode_title"),
      episodeUrl: text(row, "episode_url"),
    }),
    ...(row.num_games !== null && {
      shortened: {
        numGames: number(row, "num_games"),
        reason: text(row, "shortened_reason"),
      },
    }),
  };
}
function teamRow(db: DatabaseSync, row: Row): Team {
  const names = db
    .prepare("SELECT * FROM team_names WHERE team_id=? ORDER BY first_year")
    .all(text(row, "id"));
  return {
    emoji: text(row, "emoji"),
    id: text(row, "id"),
    name: text(row, "name"),
    ...(names.length > 0 && {
      alternativeNames: names.map((entry) => ({
        duration: [number(entry, "first_year"), number(entry, "last_year")] as [
          number,
          number,
        ],
        logo: text(entry, "logo"),
        name: text(entry, "name"),
      })),
    }),
  };
}
function teamSeasonRow(row: Row): TeamSeason {
  return {
    overUnder: number(row, "over_under_twice") / 2,
    seasonId: text(row, "season_id"),
    teamId: text(row, "team_id"),
  };
}
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function dumpDatabase(db: DatabaseSync): string {
  db.exec("BEGIN");
  try {
    validateDatabase(db);
    const objects = db
      .prepare(
        "SELECT type, name, sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name",
      )
      .all();
    const lines = [
      "-- SQLite pilot schema 1; regenerate with mise run data:dump",
      "PRAGMA foreign_keys=OFF;",
      "BEGIN TRANSACTION;",
    ];
    for (const object of objects) {
      lines.push(text(object, "sql") + ";");
      if (object.type !== "table") continue;
      const table = identifier(text(object, "name"));
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      const keys = columns
        .filter((column) => number(column, "pk") > 0)
        .toSorted((a, b) => number(a, "pk") - number(b, "pk"));
      assert.ok(keys.length, `No stable primary key for ${table}`);
      const order = keys
        .map((column) => identifier(text(column, "name")))
        .join(",");
      const fields = columns.map((column) => text(column, "name"));
      for (const row of db
        .prepare(`SELECT * FROM ${table} ORDER BY ${order}`)
        .all()) {
        lines.push(
          `INSERT INTO ${table} VALUES(${fields.map((field) => literal(row[field])).join(",")});`,
        );
      }
    }
    lines.push("COMMIT;", "PRAGMA foreign_keys=ON;", "");
    return lines.join("\n");
  } finally {
    db.exec("ROLLBACK");
  }
}
export function importJson(filename: string, contentRoot: string) {
  const load = <T>(name: string): T =>
    JSON.parse(readFileSync(`${contentRoot}/${name}.json`, "utf8")) as T;
  createDatabase(filename, (db) => {
    db.exec(readFileSync(new URL("schema.sql", import.meta.url), "utf8"));
    db.exec("BEGIN");
    try {
      for (const team of load<Team[]>("teams")) {
        db.prepare("INSERT INTO teams VALUES(?,?,?)").run(
          team.id,
          team.name,
          team.emoji,
        );
        const names = team.alternativeNames ?? [];
        for (const name of names)
          db.prepare("INSERT INTO team_names VALUES(?,?,?,?,?)").run(
            team.id,
            ...name.duration,
            name.name,
            name.logo,
          );
      }
      for (const season of load<Season[]>("seasons"))
        db.prepare("INSERT INTO seasons VALUES(?,?,?,?,?,?,?,?)").run(
          season.id,
          season.startDate,
          season.endDate,
          season.episodeDate ?? null,
          season.episodeTitle ?? null,
          season.episodeUrl ?? null,
          season.shortened?.numGames ?? null,
          season.shortened?.reason ?? null,
        );
      for (const ts of load<
        { overUnder: number; season: string; team: string }[]
      >("teamSeasons"))
        db.prepare("INSERT INTO team_seasons VALUES(?,?,?)").run(
          ts.season,
          ts.team,
          ts.overUnder * 2,
        );
      for (const game of load<Game[]>("games"))
        db.prepare("INSERT INTO archived_games VALUES(?,?,?,?,?,?,?)").run(
          game.id,
          game.seasonId,
          game.playedOn,
          game.teams[0].teamId,
          game.teams[1].teamId,
          game.teams[0].score,
          game.teams[1].score,
        );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}
function literal(value: SQLOutputValue | undefined): string {
  assert.notEqual(value, undefined, "Missing dump column");
  if (value === null) return "NULL";
  if (typeof value === "string") return "'" + value.replaceAll("'", "''") + "'";
  if (value instanceof Uint8Array)
    return "X'" + Buffer.from(value).toString("hex") + "'";
  return String(value);
}
