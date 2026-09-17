import { z } from "astro/zod";
import assert from "node:assert/strict";

import { type Game, gameSchema, type Metadata } from "../../src/data/model.ts";
import { teamCodeSchema } from "../../src/loaders/live/utils.ts";
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
    const score = z.number().int().positive().parse(row[pointsIndex]);
    const game = paired.get(id) ?? {
      date,
      ids,
      nbaGameId,
      scores: new Map<string, number>(),
    };
    assert.equal(game.nbaGameId, nbaGameId, "Conflicting NBA identities");
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
  return decodeArchive(await response.json(), seasonId, metadata);
}
