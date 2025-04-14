import Assert from "node:assert/strict";
import { z } from "zod"; // using zod directly, instead of version exported by astro, so file is importable / executable in node (astro: protocol not supported)

import type {
  Game,
  LoaderResponse,
  SeasonId,
  TeamCode,
  TeamScore,
} from "../types";

import { TEAM_CODES } from "../constants";
import * as SeasonUtils from "../seasons";

/*

INTUITION: This loader is not meant to run during live operations i.e. client-facing, but
rather as an archival tool, for storing past seasons' data (whether for the first time or
updating in response to schema changes)

*/

// This schema should NOT enforce specific values; assume data source has unknown values / might change at any time,
// leave identification of relevant values and adapting to said contract changes up to mapping code after fetching
const SeasonDataSchema = z.object({
  resultSets: z
    .array(
      z.object({
        headers: z.string().array().nonempty(),
        rowSet: z.array(z.any().array().nonempty()).nonempty(),
      }),
    )
    .nonempty(),
});

const HeaderIndicesSchema = z.object({
  GAME_DATE: z.number().int().min(0),
  MATCHUP: z.number().int().min(0),
  PTS: z.number().int().min(0),
  TEAM_ABBREVIATION: z.number().int().min(0),
});

// Approximation of team abbreviation; intended to catch loudly weird values,
// but still accommodate abbreviations not registered in the system (teams that
// have never been surprise candidates); it seems to be the case that all team
// abbreviations are 3 letters? Live data calls abbreviations tricodes, even. We'll see
const FauxTeamCodeSchema = z.string().length(3);

const RowSetColsSchema = z.object({
  playedOn: z.string(),
  points: z.number().int().positive(),
  teamCode: FauxTeamCodeSchema,
});

const GamesSchema = z.array(
  z.object({
    id: z.string(),
    playedOn: z.string(),
    // TODO Abstract
    seasonId: z.custom<SeasonId>((val) =>
      SeasonUtils.getAllSeasons()
        .map((season) => season.id)
        .includes(val),
    ),
    teams: z.array(
      z.object({
        score: z.number().int().positive(),
        teamId: FauxTeamCodeSchema,
      }),
    ),
  }),
);

// Appear in NBA API data in '93 and '96 seasons
// except for CHH, which appears through 2001 (end of original run of Charlotte Hornets franchise)
const legacyTeamCodes = {
  CHH: TEAM_CODES.CHA,
  GOS: TEAM_CODES.GSW,
  PHL: TEAM_CODES.PHI,
  SAN: TEAM_CODES.SAS,
  UTH: TEAM_CODES.UTA,
};

const loader = async (seasonId: SeasonId): Promise<LoaderResponse> => {
  const season = SeasonUtils.getSeasonById(seasonId);

  // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1568
  // @ts-expect-error: "Types of property 'Counter' are incompatible.  Type 'number' is not assignable to type 'string'"
  const params = new URLSearchParams({
    Counter: 0,
    DateFrom: "",
    DateTo: "",
    Direction: "ASC",
    LeagueID: "00",
    PlayerOrTeam: "T",
    Season: season.id,
    SeasonType: "Regular Season",
    Sorter: "DATE",
  });

  const res = await fetch(
    // https://github.com/swar/nba_api/blob/19b6665b624d65614f98831d2dfa39c9035456b2/docs/nba_api/stats/endpoints/leaguegamelog.md
    "https://stats.nba.com/stats/leaguegamelog?" + params.toString(),
    {
      // On experimenting, key to working is Referer; stops working on removal
      // I assume due to https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#strict-origin-when-cross-origin_2
      headers: {
        Referer: "https://stats.nba.com/",
      },
      // Timeout maybe too high, potentially revisit. Intuition: don't make user wait too long if response hanging, but enough leeway to account for uncertain latency
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(`NBA API request failed: ${res.status}`);
  }

  const result = await res.json();

  const parsed = SeasonDataSchema.parse(result);

  // codes of teams participating in this season
  const seasonTeamCodes = SeasonUtils.getTeamsInSeason(season.id).map(
    (team) => team.id,
  );

  const fIdx: Record<string, number> = {};

  for (let i = 0; i < parsed.resultSets[0].headers.length; i++) {
    const header = parsed.resultSets[0].headers[i];
    if (
      header && // making ts happy
      ["GAME_DATE", "MATCHUP", "PTS", "TEAM_ABBREVIATION"].includes(header)
    ) {
      fIdx[header] = i;
    }
  }

  const fieldIndices = HeaderIndicesSchema.parse(fIdx);

  const games: Record<string, Game> = {};

  let totalGames = 0;
  let gameCounts: Partial<Record<TeamCode, number>> = {};
  for (const t of seasonTeamCodes) {
    gameCounts[t] = 0;
  }

  gameCounts = gameCounts as Record<TeamCode, number>;

  for (const game of parsed.resultSets[0].rowSet) {
    // must parse given that each game record identifies only one team's participation

    // PHX @ GSW (phoenix away)   or   GSW vs. PHX (warriors home)
    // For neutral site games, both team records for the matchup will use the away variant
    const [t1, , t2] = game[fieldIndices.MATCHUP]
      .split(" ")
      // Lying a bit here, casting as TeamCode; we really mean that at least one of the two is a relevant team
      // Good enough for matching the Game type; unclear there's a way to resolve this inexactitude with the type system
      .map((tc: string) => tc.trim()) as [TeamCode, "@" | "vs.", TeamCode];

    const seasonLegacyTeamCodes = Object.fromEntries(
      Object.entries(legacyTeamCodes).filter(([, tc]) =>
        seasonTeamCodes.includes(tc),
      ),
    );

    if (
      // Consider games only including at least one surprise team candidate
      seasonTeamCodes.includes(t1) ||
      seasonTeamCodes.includes(t2) ||
      t1 in seasonLegacyTeamCodes ||
      t2 in seasonLegacyTeamCodes
    ) {
      const teamOne = (
        Object.hasOwn(legacyTeamCodes, t1)
          ? legacyTeamCodes[t1 as keyof typeof legacyTeamCodes]
          : t1
      ) as TeamCode;
      const teamTwo = (
        Object.hasOwn(legacyTeamCodes, t2)
          ? legacyTeamCodes[t2 as keyof typeof legacyTeamCodes]
          : t2
      ) as TeamCode;

      const parsedGame = RowSetColsSchema.parse({
        playedOn: game[fieldIndices.GAME_DATE],
        points: game[fieldIndices.PTS],
        teamCode: Object.hasOwn(
          legacyTeamCodes,
          game[fieldIndices.TEAM_ABBREVIATION],
        )
          ? legacyTeamCodes[
              game[
                fieldIndices.TEAM_ABBREVIATION
              ] as keyof typeof legacyTeamCodes
            ]
          : game[fieldIndices.TEAM_ABBREVIATION],
      });

      const id = SeasonUtils.formatGameId({
        playedOn: parsedGame.playedOn,
        teams: [teamOne, teamTwo],
      });

      // We want to count each game only once
      // Editing an existing game means a matchup between surprise teams i.e. should not be double-counted
      if (!games[id]) {
        totalGames += 1;
      }

      games[id] ??= {
        id,
        playedOn: parsedGame.playedOn,
        seasonId: season.id,
        teams: [
          {
            score: 0,
            teamId: teamOne,
          },
          {
            score: 0,
            teamId: teamTwo,
          },
        ]
          // stabilize order so archiver is deterministic
          .toSorted((a, b) => a.teamId.localeCompare(b.teamId)) as [
          TeamScore,
          TeamScore,
        ],
      };

      // Guaranteeing existence of both teams directly above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      games[id].teams.find(
        (teamScore) => teamScore.teamId === parsedGame.teamCode,
      )!.score = parsedGame.points;

      if (seasonTeamCodes.includes(parsedGame.teamCode)) {
        // includes not inferring properly
        // @ts-expect-error: "Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Partial<Record<TeamCode, number>>'."
        gameCounts[parsedGame.teamCode] += 1;
      }
    }
  }

  const expectedGames = SeasonUtils.getSeasonSurpriseRules(seasonId).numGames;

  // Sanity checks

  // Check that we got the right number of games for each team
  Assert.deepStrictEqual(
    Object.fromEntries(seasonTeamCodes.map((tc) => [tc, expectedGames])),
    gameCounts,
    `[${season.id}] Expected ${expectedGames} games for each team, got ${JSON.stringify(
      gameCounts,
    )}`,
  );

  // Check that we got the right number of games overall
  Assert.strictEqual(
    totalGames,
    Object.values(games).length,
    `[${season.id}] Expected ${totalGames} games, got ${Object.values(games).length}`,
  );

  return {
    // stabilize order so archiver is deterministic
    // the nba api returns games in chronological order by day, but, apparently, random within days i.e.
    // the same set of games on any given day will be returned in different orders on different runs,
    // leading to unnecessary diffs in the output
    games: GamesSchema.parse(Object.values(games)).toSorted((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ) as Game[],
  };
};

export default loader;
