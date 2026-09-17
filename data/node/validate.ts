import type { DatabaseSync } from "node:sqlite";

import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { getEasternYYYYMMDD } from "../../src/data/calendar.ts";
import { rulesForSeason } from "../../src/data/rules.ts";
import { readGames, readMetadata, validateDatabase } from "./database.ts";

/**
Relational constraints cannot express season completeness, assets or chronology.
*/
export function validateDataset(
  db: DatabaseSync,
  { lifecycle = true, now = new Date() } = {},
): void {
  db.exec("SAVEPOINT dataset_validation");
  try {
    validateDatabase(db);
    const metadata = readMetadata(db);
    const games = readGames(db);
    const providerIds = games.flatMap((game) =>
      game.nbaGameId ? [game.nbaGameId] : [],
    );
    assert.equal(
      new Set(providerIds).size,
      providerIds.length,
      "Duplicate NBA game identifiers",
    );
    assert.ok(
      metadata.seasons.length > 0 && metadata.teams.length > 0,
      "Empty metadata",
    );
    const sorted = metadata.seasons.toSorted((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const today = getEasternYYYYMMDD(now);
    let unfinished = 0;
    for (const [index, season] of sorted.entries()) {
      assert.ok(
        season.startDate.startsWith(season.id) &&
          season.endDate.startsWith(String(Number(season.id) + 1)),
        "Season dates must match identity",
      );
      const previous = sorted[index - 1];
      if (previous)
        assert.ok(previous.endDate < season.startDate, "Overlapping seasons");
      const candidates = metadata.teamSeasons.filter(
        (row) => row.seasonId === season.id,
      );
      const ids = new Set(candidates.map((row) => row.teamId));
      const archived = games.filter((game) => game.seasonId === season.id);
      const rules = rulesForSeason(season);
      for (const candidate of candidates)
        assert.ok(
          candidate.overUnder < rules.overUnderCutoff,
          `Not a surprise candidate: ${candidate.id}`,
        );
      for (const game of archived) {
        assert.ok(
          game.playedOn >= season.startDate && game.playedOn <= season.endDate,
          `Game outside season: ${game.id}`,
        );
        assert.equal(
          game.id,
          `${game.playedOn}/${game.teams
            .map((team) => team.teamId)
            .toSorted((a, b) => a.localeCompare(b))
            .join("__")}`,
          "Game identity mismatch",
        );
        assert.ok(
          game.teams.some((team) => ids.has(team.teamId)),
          `No candidate in ${game.id}`,
        );
      }
      if (season.endDate >= today) {
        unfinished++;
        assert.equal(
          archived.length,
          0,
          `Unfinished season ${season.id} cannot be archived`,
        );
        if (lifecycle)
          assert.ok(
            (Date.parse(season.startDate) - now.getTime()) / 86_400_000 <= 90,
            "Next season added more than 90 days ahead",
          );
      }
      const isOverdue =
        now.getTime() - Date.parse(season.endDate) > 15 * 86_400_000;
      if (archived.length > 0 || (lifecycle && isOverdue)) {
        assert.ok(
          candidates.length,
          `No candidates in completed season ${season.id}`,
        );
        for (const team of candidates)
          assert.equal(
            archived.filter((game) =>
              game.teams.some((score) => score.teamId === team.teamId),
            ).length,
            rules.numGames,
            `Incomplete archive for ${team.id}`,
          );
      }
    }
    assert.ok(unfinished <= 1, "Only one unfinished season is allowed");
    for (const team of metadata.teams) {
      for (const name of [
        team.emoji,
        ...(team.alternativeNames ?? []).map((entry) => entry.logo),
      ]) {
        assert.match(name, /^[a-z0-9-]+$/);
        assert.ok(
          existsSync(
            new URL(
              `../../src/assets/images/emoji/${name}.svg`,
              import.meta.url,
            ),
          ),
          `Missing logo ${name}`,
        );
      }
      const names = (team.alternativeNames ?? []).toSorted(
        (a, b) => a.duration[0] - b.duration[0],
      );
      for (const [index, name] of names.entries()) {
        assert.ok(
          name.duration[0] <= name.duration[1],
          "Invalid historical name interval",
        );
        const previous = names[index - 1];
        if (previous)
          assert.ok(
            previous.duration[1] < name.duration[0],
            "Overlapping historical names",
          );
      }
    }
  } finally {
    db.exec("RELEASE dataset_validation");
  }
}
