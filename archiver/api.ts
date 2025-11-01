import type { APIRoute } from "astro";
import type { CollectionEntry } from "astro:content";

import { getCollection, getEntry } from "astro:content";
import Assert from "node:assert/strict";
import Fs from "node:fs/promises";
import Path from "node:path";
import Url from "node:url";
import { z } from "zod";

import type { TeamCode } from "../src/content-utils";

import * as ContentUtils from "../src/content-utils";
import * as Utils from "../src/utils";

/*

INTUITION: This loader is not meant to run during live operations i.e. client-facing, but
rather as an archival tool, for storing past seasons' data (whether for the first time or
updating in response to schema changes)

Factored as an endpoint, injected into the astro server via integration, as astro modules
aren't accessible in node (non-standard astro: module protocol), but still need to archive
seasons via script, hence we call this endpoint via standalone dev server via script.ts

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

// Appear in NBA API data in '93 and '96 seasons
// except for CHH, which appears through 2001 (end of original run of Charlotte Hornets franchise)
const legacyTeamCodes = {
  CHH: ContentUtils.TEAM_CODES.CHA,
  GOS: ContentUtils.TEAM_CODES.GSW,
  PHL: ContentUtils.TEAM_CODES.PHI,
  SAN: ContentUtils.TEAM_CODES.SAS,
  UTH: ContentUtils.TEAM_CODES.UTA,
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const seasonParam = params.seasonId;
    if (!seasonParam) {
      return Response.json(
        { error: "Season parameter required" },
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        },
      );
    }

    let seasonsToProcess: string[] = [];

    if (seasonParam === "all") {
      seasonsToProcess = await getAllArchivableSeasons();
    } else if (seasonParam === "latest") {
      const latest = await getLatestArchivableSeason();
      if (latest) {
        seasonsToProcess = [latest];
      }
    } else {
      const season = await getEntry("seasons", seasonParam);
      if (!season) {
        return Response.json(
          { error: `Season ${seasonParam} not found` },
          {
            headers: { "Content-Type": "application/json" },
            status: 404,
          },
        );
      }
      seasonsToProcess = [seasonParam];
    }

    if (seasonsToProcess.length === 0) {
      return Response.json(
        {
          failed: [],
          message: "No seasons process: no archivable seasons matched",
          processed: [],
          totalGames: 0,
        },
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const results = await processSeasons(seasonsToProcess, 3);

    return Response.json(results, {
      headers: {
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("[Archive API] Error:", error);

    return Response.json(
      { error: "Internal server error" },
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
};

interface ProcessResult {
  failed: { error: string; seasonId: CollectionEntry<"seasons">["id"] }[];
  processed: string[];
  totalGames: number;
}

async function getAllArchivableSeasons(): Promise<
  CollectionEntry<"seasons">["id"][]
> {
  const seasons = await getCollection("seasons");
  const today = Utils.getCurrentEasternYYYYMMDD();

  return seasons
    .filter((season) => {
      // Only archive past seasons (ended before today)
      return today > season.data.endDate;
    })
    .map((season) => season.data.id)
    .toSorted((a, b) => a.localeCompare(b)); // Chronological order
}

async function getLatestArchivableSeason(): Promise<
  CollectionEntry<"seasons">["id"] | undefined
> {
  const archivableSeasons = await getAllArchivableSeasons();

  if (archivableSeasons.length === 0) {
    return;
  }

  return archivableSeasons.at(-1);
}

async function loadSeasonFromNBAAPI(
  seasonId: string,
): Promise<ContentUtils.LoaderResponse> {
  const season = await getEntry("seasons", seasonId);
  if (!season) {
    throw new Error(`Season ${seasonId} not found`);
  }

  // https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1568
  // @ts-expect-error: "Types of property 'Counter' are incompatible.  Type 'number' is not assignable to type 'string'"
  const params = new URLSearchParams({
    Counter: 0,
    DateFrom: "",
    DateTo: "",
    Direction: "ASC",
    LeagueID: "00",
    PlayerOrTeam: "T",
    Season: season.data.id,
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

  const seasonTeams = await ContentUtils.getTeamsInSeason(seasonId);
  const seasonTeamCodes = seasonTeams.map((team) => team.data.id);

  const fIdx: Record<string, number> = {};
  for (let i = 0; i < parsed.resultSets[0].headers.length; i++) {
    const header = parsed.resultSets[0].headers[i];
    if (
      header &&
      ["GAME_DATE", "MATCHUP", "PTS", "TEAM_ABBREVIATION"].includes(header)
    ) {
      fIdx[header] = i;
    }
  }

  const fieldIndices = HeaderIndicesSchema.parse(fIdx);

  const games: Record<string, ContentUtils.GameData> = {};
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

      const id = ContentUtils.formatGameId({
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
        seasonId: season.data.id,
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
          { score: number; teamId: TeamCode },
          { score: number; teamId: TeamCode },
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

  const surpriseRules = await ContentUtils.getSeasonSurpriseRules(seasonId);
  const expectedGames = surpriseRules.numGames;

  // Sanity checks

  // Check that we got the right number of games for each team
  Assert.deepStrictEqual(
    Object.fromEntries(seasonTeamCodes.map((tc) => [tc, expectedGames])),
    gameCounts,
    `[${season.data.id}] Expected ${expectedGames} games for each team, got ${JSON.stringify(
      gameCounts,
    )}`,
  );

  // Check that we got the right number of games overall
  Assert.strictEqual(
    totalGames,
    Object.values(games).length,
    `[${season.data.id}] Expected ${totalGames} games, got ${Object.values(games).length}`,
  );

  const GamesSchema = z.array(
    z.object({
      id: z.string(),
      playedOn: z.string(),
      seasonId: z.literal(seasonId),
      teams: z.array(
        z.object({
          score: z.number().int().positive(),
          teamId: FauxTeamCodeSchema,
        }),
      ),
    }),
  );

  return {
    // stabilize order so archiver is deterministic
    // the nba api returns games in chronological order by day, but, apparently, random within days i.e.
    // the same set of games on any given day will be returned in different orders on different runs,
    // leading to unnecessary diffs in the output
    games: GamesSchema.parse(Object.values(games)).toSorted((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    ) as ContentUtils.GameData[],
  };
}

async function processSeasons(
  seasonIds: CollectionEntry<"seasons">["id"][],
  concurrencyLimit: number,
): Promise<ProcessResult> {
  const results: ProcessResult = {
    failed: [],
    processed: [],
    totalGames: 0,
  };

  const fetchedGames: ContentUtils.GameData[] = [];

  for (let i = 0; i < seasonIds.length; i += concurrencyLimit) {
    const batch = seasonIds.slice(i, i + concurrencyLimit);

    const batchResults = await Promise.allSettled(
      batch.map(async (seasonId) => {
        console.log(`[Archive API] Processing season ${seasonId}...`);
        const seasonData = await loadSeasonFromNBAAPI(seasonId);
        return { games: seasonData.games, seasonId };
      }),
    );

    for (const [j, result] of batchResults.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const seasonId = batch[j]!;

      if (result.status === "fulfilled") {
        results.processed.push(seasonId);
        results.totalGames += result.value.games.length;
        fetchedGames.push(...result.value.games);
        console.log(
          `[Archive API] ✓ Processed season ${seasonId}: ${result.value.games.length} games`,
        );
      } else {
        results.failed.push({
          error: result.reason?.message || "Unknown error",
          seasonId,
        });
        console.error(
          `[Archive API] ✗ Failed season ${seasonId}:`,
          result.reason?.message,
        );
      }
    }
  }

  // Write successful results to games file
  if (results.processed.length > 0) {
    await updateGamesFile(fetchedGames, results.processed);
  }

  return results;
}

async function updateGamesFile(
  fetchedGames: ContentUtils.GameData[],
  processedSeasonIds: string[],
): Promise<void> {
  const __filename = Url.fileURLToPath(import.meta.url);
  const projectRoot = Path.dirname(Path.dirname(__filename));
  const gamesFile = Path.join(projectRoot, "src/content/games.json");

  const existingGames = JSON.parse(
    await Fs.readFile(gamesFile, "utf8"),
  ) as ContentUtils.GameData[];

  // Filter out games from processed seasons
  const filteredGames = existingGames.filter(
    (game) => !processedSeasonIds.includes(game.seasonId),
  );

  // Combine existing games (minus processed seasons) with newly fetched games
  const allGames = [...filteredGames, ...fetchedGames].toSorted((a, b) => {
    // Sort by playedOn date first, then by game ID for stability
    const dateCompare = a.playedOn.localeCompare(b.playedOn);
    return dateCompare === 0 ? a.id.localeCompare(b.id) : dateCompare;
  });

  await Fs.writeFile(gamesFile, JSON.stringify(allGames), {
    encoding: "utf8",
  });

  console.log(
    `[Archive API] Updated games file with ${fetchedGames.length} new games from ${processedSeasonIds.length} seasons`,
  );
}
