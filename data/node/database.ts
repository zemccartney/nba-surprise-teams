/* eslint unicorn/no-null: "off" -- SQL NULL is represented by JavaScript null. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import Path from "node:path";
import { DatabaseSync, type SQLOutputValue } from "node:sqlite";
import { fileURLToPath } from "node:url";

import {
  type Game,
  gameSchema,
  type Metadata,
  seasonSchema,
  teamSchema,
  teamSeasonSchema,
} from "../../src/data/model.ts";

export const SCHEMA_VERSION = 2;
const migrationRoot = fileURLToPath(new URL("../migrations/", import.meta.url));

export function assertVersion(db: DatabaseSync): void {
  assert.equal(
    db.prepare("SELECT max(version) AS version FROM schema_migrations").get()
      ?.version,
    SCHEMA_VERSION,
    "Unsupported database schema; run data migrate",
  );
}
export function createDatabase(
  filename: string,
  populate: (db: DatabaseSync) => void,
): void {
  if (existsSync(filename))
    throw new Error(`Refusing to overwrite ${filename}`);
  mkdirSync(Path.dirname(filename), { recursive: true });
  const temporary = `${filename}.partial-${randomUUID()}`;
  writeFileSync(temporary, "", { flag: "wx" });
  const db = new DatabaseSync(temporary);
  try {
    db.exec("PRAGMA foreign_keys=ON");
    populate(db);
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
export function migrate(db: DatabaseSync): void {
  const hasHistory = db
    .prepare("SELECT name FROM sqlite_schema WHERE name='schema_migrations'")
    .get();
  const current = hasHistory
    ? Number(
        db
          .prepare("SELECT max(version) AS version FROM schema_migrations")
          .get()?.version ?? 0,
      )
    : 0;
  if (current > SCHEMA_VERSION)
    throw new Error("Database schema is newer than this application");
  db.exec("BEGIN IMMEDIATE");
  try {
    const files = readdirSync(migrationRoot)
      .filter((name) => /^\d{3}-.*\.sql$/.test(name))
      .toSorted((a, b) => a.localeCompare(b));
    for (const name of files) {
      if (Number(name.slice(0, 3)) > current)
        db.exec(readFileSync(Path.join(migrationRoot, name), "utf8"));
    }
    validateDatabase(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function openDatabase(
  filename: string,
  isReadOnly = true,
): DatabaseSync {
  if (!existsSync(filename))
    throw new Error(
      `Missing database ${filename}; run data:restore explicitly`,
    );
  const db = new DatabaseSync(filename, { readOnly: isReadOnly });
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  return db;
}
export function readGames(db: DatabaseSync, seasonId?: string): Game[] {
  return db
    .prepare(
      "SELECT * FROM archived_games WHERE (? IS NULL OR season_id=?) ORDER BY played_on,id",
    )
    .all(seasonId ?? null, seasonId ?? null)
    .map((row) =>
      gameSchema.parse({
        id: row.id,
        playedOn: row.played_on,
        seasonId: row.season_id,
        ...(row.nba_game_id !== null && { nbaGameId: row.nba_game_id }),
        teams: [
          { score: row.score1, teamId: row.team1_id },
          { score: row.score2, teamId: row.team2_id },
        ],
      }),
    );
}
export function readMetadata(db: DatabaseSync): Metadata {
  db.exec("SAVEPOINT metadata_snapshot");
  try {
    return {
      seasons: db
        .prepare("SELECT * FROM seasons ORDER BY id")
        .all()
        .map((row) =>
          seasonSchema.parse({
            endDate: row.end_date,
            id: row.id,
            startDate: row.start_date,
            ...(row.episode_date !== null && {
              episodeDate: row.episode_date,
              episodeTitle: row.episode_title,
              episodeUrl: row.episode_url,
            }),
            ...(row.num_games !== null && {
              shortened: {
                numGames: row.num_games,
                reason: row.shortened_reason,
              },
            }),
          }),
        ),
      teams: db
        .prepare("SELECT * FROM teams ORDER BY id")
        .all()
        .map((row) => {
          const names = db
            .prepare(
              "SELECT * FROM team_names WHERE team_id=? ORDER BY first_year",
            )
            .all(row.id ?? null);
          return teamSchema.parse({
            emoji: row.emoji,
            id: row.id,
            name: row.name,
            ...(names.length > 0 && {
              alternativeNames: names.map((name) => ({
                duration: [name.first_year, name.last_year],
                logo: name.logo,
                name: name.name,
              })),
            }),
          });
        }),
      teamSeasons: db
        .prepare(
          "SELECT * FROM team_seasons ORDER BY display_order, season_id, team_id",
        )
        .all()
        .map((row) =>
          teamSeasonSchema.parse({
            id: `${row.season_id}/${row.team_id}`,
            overUnder: Number(row.over_under_twice) / 2,
            seasonId: row.season_id,
            teamId: row.team_id,
          }),
        ),
    };
  } finally {
    db.exec("RELEASE metadata_snapshot");
  }
}
export function restoreDatabase(filename: string, dump: string): void {
  createDatabase(filename, (db) => {
    db.exec(dump);
    db.exec("PRAGMA foreign_keys=ON");
  });
}
export function validateDatabase(db: DatabaseSync): void {
  assertVersion(db);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    db.prepare("PRAGMA integrity_check").get()?.integrity_check,
    "ok",
  );
}
export function withDatabase<T>(
  filename: string,
  read: (db: DatabaseSync) => T,
): T {
  const db = openDatabase(filename);
  try {
    assertVersion(db);
    return read(db);
  } finally {
    db.close();
  }
}
export function writeGame(db: DatabaseSync, input: Game): void {
  const game = gameSchema.parse(input);
  db.prepare(
    "INSERT INTO archived_games(id,season_id,played_on,team1_id,team2_id,score1,score2,nba_game_id) VALUES(?,?,?,?,?,?,?,?)",
  ).run(
    game.id,
    game.seasonId,
    game.playedOn,
    game.teams[0].teamId,
    game.teams[1].teamId,
    game.teams[0].score,
    game.teams[1].score,
    game.nbaGameId ?? null,
  );
}
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function dumpDatabase(db: DatabaseSync): string {
  db.exec("BEGIN");
  try {
    validateDatabase(db);
    const objects = db
      .prepare(
        "SELECT type,name,sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END,name",
      )
      .all();
    const lines = [
      "-- NBA tracker data; regenerate with mise run data:dump",
      "PRAGMA foreign_keys=OFF;",
      "BEGIN TRANSACTION;",
    ];
    for (const object of objects) {
      lines.push(String(object.sql) + ";");
      if (object.type !== "table") continue;
      const table = identifier(String(object.name));
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      const keys = columns
        .filter((column) => Number(column.pk) > 0)
        .toSorted((a, b) => Number(a.pk) - Number(b.pk));
      assert.ok(keys.length, `No primary key for ${table}`);
      const order = keys
        .map((column) => identifier(String(column.name)))
        .join(",");
      for (const row of db
        .prepare(`SELECT * FROM ${table} ORDER BY ${order}`)
        .all())
        lines.push(
          `INSERT INTO ${table} VALUES(${columns.map((column) => literal(row[String(column.name)])).join(",")});`,
        );
    }
    lines.push("COMMIT;", "PRAGMA foreign_keys=ON;", "");
    return lines.join("\n");
  } finally {
    db.exec("ROLLBACK");
  }
}
function literal(value: SQLOutputValue | undefined): string {
  assert.notEqual(value, undefined, "Missing dump column");
  if (value === null) return "NULL";
  if (typeof value === "string") return "'" + value.replaceAll("'", "''") + "'";
  if (value instanceof Uint8Array)
    return "X'" + Buffer.from(value).toString("hex") + "'";
  return String(value);
}
