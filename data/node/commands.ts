import type { DatabaseSync } from "node:sqlite";

import { z } from "astro/zod";
/* eslint unicorn/no-null: "off" -- SQLite nullable parameters. */
import assert from "node:assert/strict";

import {
  gameSchema,
  seasonSchema,
  teamSchema,
  teamSeasonSchema,
} from "../../src/data/model.ts";
import { writeGame } from "./database.ts";
import { validateDataset } from "./validate.ts";

// Backfills/corrections often need metadata and complete games to change together.
// The surrounding transaction validates the final dataset, not intermediate rows.
export function applyChanges(db: DatabaseSync, input: unknown): void {
  const changes = z
    .array(
      z.object({
        command: z.enum([
          "add-season",
          "update-season",
          "add-team",
          "update-team",
          "add-team-season",
          "update-odds",
          "import-archive",
        ]),
        record: z.unknown(),
      }),
    )
    .nonempty()
    .parse(input);
  const apply = ({ command, record }: (typeof changes)[number]) => {
    switch (command) {
      case "add-season":
      case "update-season": {
        saveSeason(db, record, command === "update-season");

        break;
      }
      case "add-team":
      case "update-team": {
        saveTeam(db, record, command === "update-team");

        break;
      }
      case "add-team-season":
      case "update-odds": {
        const row = teamSeasonSchema.parse(record);
        saveOdds(
          db,
          row.seasonId,
          row.teamId,
          String(row.overUnder),
          command === "update-odds",
        );

        break;
      }
      default: {
        const row = z
          .object({ games: gameSchema.array(), seasonId: z.string() })
          .parse(record);
        replaceArchive(db, row.seasonId, row.games);
      }
    }
  };
  for (const change of changes) apply(change);
}

export function replaceArchive(
  db: DatabaseSync,
  season: string,
  input: unknown,
): void {
  const games = gameSchema.array().nonempty().parse(input);
  assert.ok(
    games.every((game) => game.seasonId === season),
    "Mixed seasons in archive input",
  );
  db.prepare("DELETE FROM archived_games WHERE season_id=?").run(season);
  for (const game of games) writeGame(db, game);
  // Caller transaction validates completeness and rolls back the replacement on error.
}
export function saveOdds(
  db: DatabaseSync,
  season: string,
  team: string,
  value: string,
  isUpdate: boolean,
): void {
  assert.match(value, /^\d+(?:\.0|\.5)?$/, "Use whole or half wins");
  const twice = Number(value) * 2;
  assert.ok(
    Number.isSafeInteger(twice) && twice >= 0 && twice <= 164,
    "Odds out of range",
  );
  const result = isUpdate
    ? db
        .prepare(
          "UPDATE team_seasons SET over_under_twice=? WHERE season_id=? AND team_id=?",
        )
        .run(twice, season, team)
    : db
        .prepare(
          "INSERT INTO team_seasons(season_id,team_id,over_under_twice,display_order) SELECT ?,?,?,COALESCE(max(display_order),-1)+1 FROM team_seasons",
        )
        .run(season, team, twice);
  assert.equal(
    result.changes,
    1,
    "No existing team season; use add-team-season explicitly",
  );
}
export function saveSeason(
  db: DatabaseSync,
  input: unknown,
  isUpdate: boolean,
): void {
  const s = seasonSchema.parse(input);
  const values = [
    s.startDate,
    s.endDate,
    s.episodeDate ?? null,
    s.episodeTitle ?? null,
    s.episodeUrl ?? null,
    s.shortened?.numGames ?? null,
    s.shortened?.reason ?? null,
    s.id,
  ];
  const result = isUpdate
    ? db
        .prepare(
          "UPDATE seasons SET start_date=?,end_date=?,episode_date=?,episode_title=?,episode_url=?,num_games=?,shortened_reason=? WHERE id=?",
        )
        .run(...values)
    : db
        .prepare(
          "INSERT INTO seasons(start_date,end_date,episode_date,episode_title,episode_url,num_games,shortened_reason,id) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(...values);
  assert.equal(result.changes, 1, "Unknown season; use add-season explicitly");
}
export function saveTeam(
  db: DatabaseSync,
  input: unknown,
  isUpdate: boolean,
): void {
  const t = teamSchema.parse(input);
  const result = isUpdate
    ? db
        .prepare("UPDATE teams SET name=?,emoji=? WHERE id=?")
        .run(t.name, t.emoji, t.id)
    : db
        .prepare("INSERT INTO teams(name,emoji,id) VALUES(?,?,?)")
        .run(t.name, t.emoji, t.id);
  assert.equal(result.changes, 1, "Unknown team; use add-team explicitly");
  db.prepare("DELETE FROM team_names WHERE team_id=?").run(t.id);
  const names = t.alternativeNames ?? [];
  for (const name of names)
    db.prepare("INSERT INTO team_names VALUES(?,?,?,?,?)").run(
      t.id,
      ...name.duration,
      name.name,
      name.logo,
    );
}
export function transaction(db: DatabaseSync, change: () => void): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    change();
    validateDataset(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
