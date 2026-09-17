/* eslint unicorn/no-null: "off" -- SQL nullable columns require null bindings. */
// One-time migration utility. Never used by builds or deployed application code.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  gameSchema,
  seasonSchema,
  teamSchema,
  teamSeasonSchema,
} from "../../src/data/model.ts";
import { createDatabase, migrate, writeGame } from "./database.ts";

export function importLegacyJson(
  filename: string,
  directory = new URL("../../src/content/", import.meta.url),
): void {
  const read = (name: string): unknown[] => {
    const value: unknown = JSON.parse(
      readFileSync(new URL(`${name}.json`, directory), "utf8"),
    );
    if (!Array.isArray(value))
      throw new Error(
        `Expected an array in ${fileURLToPath(directory)}${name}.json`,
      );
    return value;
  };
  createDatabase(filename, (db) => {
    migrate(db);
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const input of read("teams")) {
        const team = teamSchema.parse(input);
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
      for (const input of read("seasons")) {
        const season = seasonSchema.parse(input);
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
      }
      for (const [order, input] of read("teamSeasons").entries()) {
        if (!input || typeof input !== "object")
          throw new Error("Invalid legacy team season");
        const raw = input as Record<string, unknown>;
        const entry = teamSeasonSchema.parse({
          ...raw,
          seasonId: raw.season,
          teamId: raw.team,
        });
        db.prepare("INSERT INTO team_seasons VALUES(?,?,?,?)").run(
          entry.seasonId,
          entry.teamId,
          entry.overUnder * 2,
          order,
        );
      }
      for (const input of read("games")) writeGame(db, gameSchema.parse(input));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}
