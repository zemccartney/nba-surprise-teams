import { z } from "astro/zod";
import assert from "node:assert/strict";

import { type Game, gameSchema, type Metadata } from "../../src/data/model.ts";
import {
  NBA_SCHEDULE_HEADERS,
  teamCodeSchema,
} from "../../src/loaders/live/utils.ts";

class VenueConflictError extends Error {
  readonly nbaGameId: string;
  readonly scores: Map<string, number>;
  constructor(nbaGameId: string, scores: Map<string, number>) {
    super(`Conflicting NBA home/away assignments: ${nbaGameId}`);
    this.nbaGameId = nbaGameId;
    this.scores = scores;
  }
}
const boxTeam = z.object({
  score: z.number().int().positive(),
  teamTricode: teamCodeSchema,
});
const boxSchema = z.object({
  game: z.object({ awayTeam: boxTeam, gameId: z.string(), homeTeam: boxTeam }),
});
const responseSchema = z.object({
  resultSets: z
    .array(
      z.object({
        headers: z.array(z.string()),
        rowSet: z.array(z.array(z.unknown())),
      }),
    )
    .nonempty(),
});
const legacy: Record<string, string> = {
  CHH: "CHA",
  GOS: "GSW",
  PHL: "PHI",
  SAN: "SAS",
  UTH: "UTA",
};
const normalize = (value: string) => legacy[value] ?? value;

/**
Pair the two team rows. Never infer a missing opponent's score as zero.
*/
export function decodeArchive(
  input: unknown,
  seasonId: string,
  metadata: Metadata,
  verifiedVenues: ReadonlyMap<string, NonNullable<Game["venue"]>> = new Map(),
): Game[] {
  const result = responseSchema.parse(input).resultSets[0];
  assert.ok(result);
  const at = (name: string) => {
    const index = result.headers.indexOf(name);
    assert.ok(index !== -1, `Missing NBA column ${name}`);
    return index;
  };
  const dateIndex = at("GAME_DATE"),
    matchupIndex = at("MATCHUP"),
    nbaIndex = result.headers.indexOf("GAME_ID"),
    pointsIndex = at("PTS"),
    teamIndex = at("TEAM_ABBREVIATION");
  const candidates = new Set(
    metadata.teamSeasons
      .filter((row) => row.seasonId === seasonId)
      .map((row) => String(row.teamId)),
  );
  assert.ok(candidates.size, "No surprise candidates for requested archive");
  const paired = new Map<
    string,
    {
      date: string;
      ids: string[];
      nbaGameId: string | undefined;
      scores: Map<string, number>;
      venue: NonNullable<Game["venue"]>;
    }
  >();
  for (const row of result.rowSet) {
    const matchup = z.string().parse(row[matchupIndex]).split(/\s+/);
    assert.equal(matchup.length, 3, "Invalid matchup");
    const ids = [
      normalize(matchup[0] ?? ""),
      normalize(matchup[2] ?? ""),
    ].toSorted((a, b) => a.localeCompare(b));
    if (ids.every((id) => !candidates.has(id))) continue;
    const date = z.iso
      .date()
      .parse(z.string().parse(row[dateIndex]).slice(0, 10));
    const nbaGameId =
      nbaIndex === -1 ? undefined : z.string().min(1).parse(row[nbaIndex]);
    if (nbaGameId?.startsWith("006")) continue;
    const id = `${date}/${ids.join("__")}`;
    const team = normalize(z.string().parse(row[teamIndex]));
    assert.ok(ids.includes(team), "Team row does not match matchup");
    assert.equal(
      team,
      normalize(matchup[0] ?? ""),
      "Team row must lead matchup",
    );
    assert.ok(
      matchup[1] === "@" || matchup[1] === "vs.",
      "Unknown matchup separator",
    );
    const first = teamCodeSchema.parse(normalize(matchup[0] ?? ""));
    const second = teamCodeSchema.parse(normalize(matchup[2] ?? ""));
    const venue =
      (nbaGameId && verifiedVenues.get(nbaGameId)) ||
      (matchup[1] === "@"
        ? { awayTeamId: first, homeTeamId: second }
        : { awayTeamId: second, homeTeamId: first });
    const score = z.number().int().positive().parse(row[pointsIndex]);
    const game = paired.get(id) ?? {
      date,
      ids,
      nbaGameId,
      scores: new Map<string, number>(),
      venue,
    };
    assert.equal(game.nbaGameId, nbaGameId, "Conflicting NBA identities");
    if (game.venue.homeTeamId !== venue.homeTeamId) {
      assert.ok(nbaGameId, `Conflicting venue with no NBA identity: ${id}`);
      throw new VenueConflictError(
        nbaGameId,
        new Map([...game.scores, [team, score]]),
      );
    }
    assert.ok(!game.scores.has(team), `Duplicate NBA team row ${id}/${team}`);
    game.scores.set(team, score);
    paired.set(id, game);
  }
  return [...paired]
    .map(([id, game]) => {
      assert.equal(game.scores.size, 2, `Incomplete NBA matchup ${id}`);
      return gameSchema.parse({
        id,
        nbaGameId: game.nbaGameId,
        playedOn: game.date,
        seasonId,
        teams: game.ids.map((teamId) => ({
          score: game.scores.get(teamId),
          teamId: teamCodeSchema.parse(teamId),
        })),
        venue: game.venue,
      });
    })
    .toSorted((a, b) => a.id.localeCompare(b.id));
}
export async function fetchArchive(
  seasonId: string,
  metadata: Metadata,
): Promise<Game[]> {
  const params = new URLSearchParams({
    Counter: "0",
    DateFrom: "",
    DateTo: "",
    Direction: "ASC",
    LeagueID: "00",
    PlayerOrTeam: "T",
    Season: seasonId,
    SeasonType: "Regular Season",
    Sorter: "DATE",
  });
  const response = await fetch(
    "https://stats.nba.com/stats/leaguegamelog?" + params,
    {
      headers: { Referer: "https://stats.nba.com/" },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error(`NBA archive request failed: ${response.status}`);
  const source: unknown = await response.json();
  const verifiedVenues = new Map<string, NonNullable<Game["venue"]>>();
  // Neutral-site game logs can mark both teams away (e.g. Mexico City 2024).
  // Only an independently validated NBA box score may resolve a conflict.
  for (;;) {
    try {
      return decodeArchive(source, seasonId, metadata, verifiedVenues);
    } catch (error) {
      if (
        !(error instanceof VenueConflictError) ||
        verifiedVenues.has(error.nbaGameId)
      )
        throw error;
      assert.match(error.nbaGameId, /^\d+$/);
      const boxResponse = await fetch(
        `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${error.nbaGameId}.json`,
        {
          headers: NBA_SCHEDULE_HEADERS,
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!boxResponse.ok)
        throw new Error(
          `NBA venue box score request failed: ${boxResponse.status}`,
          { cause: error },
        );
      const { game } = boxSchema.parse(await boxResponse.json());
      assert.equal(
        game.gameId,
        error.nbaGameId,
        "Venue box score identity mismatch",
      );
      assert.equal(
        error.scores.size,
        2,
        "Venue conflict must have two team scores",
      );
      for (const team of [game.awayTeam, game.homeTeam]) {
        assert.equal(
          error.scores.get(team.teamTricode),
          team.score,
          "Venue box score team/score mismatch",
        );
      }
      verifiedVenues.set(game.gameId, {
        awayTeamId: game.awayTeam.teamTricode,
        homeTeamId: game.homeTeam.teamTricode,
      });
    }
  }
}
