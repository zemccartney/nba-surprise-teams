import { z } from "zod"; // using zod directly, instead of version exported by astro, so file is importable / executable in node (astro: protocol not supported)

import type { GameData, LoaderResponse, TeamCode } from "../content/utils";

import * as ContentUtils from "../content/utils";
import * as Utils from "../utils";

const TeamResultSchema = z.object({
  score: z.number(),
  teamTricode: z.string(),
});

const GameResultSchema = z.object({
  awayTeam: TeamResultSchema,
  gameDateTimeUTC: z.string(), // ISO string e.g. "2025-01-05T23:00:00Z"
  homeTeam: TeamResultSchema,
});

// This schema should NOT enforce specific values; assume data source has unknown values / might change at any time,
// leave identification of relevant values and adapting to said contract changes up to mapping code after fetching
const SeasonDataSchema = z.object({
  leagueSchedule: z.object({
    gameDates: z.array(
      z.object({
        gameDate: z.string(), // gameDate format: "10/04/2024 00:00:00"
        games: z.array(GameResultSchema),
      }),
    ),
  }),
});

// Taking for granted that presence of scores reliably indicates a game has finished and should be counted
const hasScore = (game: z.infer<typeof GameResultSchema>) =>
  game.homeTeam.score && game.awayTeam.score;

const includesCandidateTeam = (
  game: z.infer<typeof GameResultSchema>,
  tricodes: TeamCode[],
) =>
  tricodes.includes(game.awayTeam.teamTricode) ||
  tricodes.includes(game.homeTeam.teamTricode);

// gameDate format: "10/04/2024 00:00:00"
const toYYYYMMDD = (gameDate: string) => {
  // @ts-expect-error : "Object possibly undefined" Not sure why index type of split result is string | undefined
  const [mm, dd, yyyy] = gameDate.split(" ")[0].split("/");
  return `${yyyy}-${mm}-${dd}`;
};

const loader = async (): Promise<LoaderResponse> => {
  // Assumption: force this function to return
  // Don't solve for missing data; i.e. don't crash your site just b/c you haven't set data "on time"
  // If you don't update in time, then home page will break b/c nothing to do: no next season set, still thinking
  // in old season
  const season = await ContentUtils.getLatestSeason();

  if (!season) {
    throw new Error("Missing season data");
  }

  const res = await fetch(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    {
      headers: {
        Accept: "application/json",
      },
      // Timeout maybe too high, potentially revisit. Intuition: don't make user wait too long if response hanging, but enough leeway to account for uncertain latency
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(`NBA CDN request failed: ${res.status}`);
  }

  const result = await res.json();

  const parsed = SeasonDataSchema.parse(result);

  // I believe data is already ordered like this, more to be explicit / for peace of mind, prove
  // to myself that data is how I need it to be
  const chronologicalSeason = parsed.leagueSchedule.gameDates
    .toSorted((a, b) => {
      const aYYYYMMDD = toYYYYMMDD(a.gameDate);
      const bYYYYMMDD = toYYYYMMDD(b.gameDate);

      if (aYYYYMMDD < bYYYYMMDD) {
        return -1;
      }

      if (aYYYYMMDD > bYYYYMMDD) {
        return 1;
      }

      return 0;
    })
    .filter((slate) => {
      const gameYYYYMMDD = toYYYYMMDD(slate.gameDate);
      return (
        // Taking for granted that game and season dates are all in eastern timezone, hence comparable here
        // without time comparison
        gameYYYYMMDD >= season.data.startDate &&
        gameYYYYMMDD <= season.data.endDate // equal to b/c we want to include records on the final day
      );
    });

  const relevantGames: GameData[] = [];
  let expiresAt;

  const teams = await ContentUtils.getTeamsInSeason(season.id);
  const TRICODES = teams.map((team) => team.id) as TeamCode[];

  // game times are implicitly in EST
  // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
  // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone
  const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();

  // TODO: Doc known limitation of mistakenly including in-season tournament final game; data seems to give ways to ignore,
  // just didn't deal with it in first run (2024)

  const todayInd = chronologicalSeason.findIndex((slate) => {
    const yyyymmdd = toYYYYMMDD(slate.gameDate);
    return yyyymmdd === currentYYYYMMDD;
  });

  if (todayInd) {
    const nextRelevantDate = chronologicalSeason
      .slice(todayInd)
      .find((slate) => {
        // Find next game day with an incomplete game featuring at least one surprise team i.e. next point
        // at which new, relevant data might be available
        return slate.games.some(
          (game) => !hasScore(game) && includesCandidateTeam(game, TRICODES),
        );
      });

    if (nextRelevantDate) {
      // When's the earliest incomplete game on the found relevant game date? We'll use this time to guess when new, relevant
      // data might be available
      const earliestUpcomingGameStartMs = Math.min(
        ...nextRelevantDate.games
          .filter(
            (game) => !hasScore(game) && includesCandidateTeam(game, TRICODES),
          )
          .map((game) => new Date(game.gameDateTimeUTC).getTime()),
      );

      const now = Date.now();

      /*
        Games are roughly 2.25 hours i.e. how long until a result might be in. Add 10 minutes to account for
        a.) uncertainty around how quickly data source is updated; anecdotally, seems near-real-time, so small fudge factor
        b.) uncertainty around game length; no guarantee games how long games will last

        In short, no guarantees around when new data will be available; so best effort to continuously cache, lessen
        reliance on external data source, while still trying my best to fetch updates as soon as they're available as possible
      */
      const averageGameLengthMin = 2.25 * 60 + 10;
      const endOfGame =
        earliestUpcomingGameStartMs + Utils.minToMs(averageGameLengthMin);

      /*
        When might our copy of game data be outdated i.e. missing latest results (relative to timestamp calculated above)?

        If the game's not over yet, still good, wait till the end
        If the game's finished and still no result, though, bump 5 minutes before checking again. 5 minutes is entirely arbitrary
        Not actually a big deal to fetch data continuously, I don't think, likely being overly paranoid about lack of contract with
        data source, wanting to lessen reliance / use "own" copy of data as much as possibile for reliability's sake
      */
      expiresAt = endOfGame > now ? endOfGame : now + Utils.minToMs(5);
    }
  }

  for (const slate of chronologicalSeason) {
    const gameYYYYMMDD = toYYYYMMDD(slate.gameDate);
    if (gameYYYYMMDD <= currentYYYYMMDD) {
      for (const game of slate.games) {
        const { awayTeam, homeTeam } = game;

        if (hasScore(game) && includesCandidateTeam(game, TRICODES)) {
          relevantGames.push({
            id: ContentUtils.formatGameId({
              playedOn: gameYYYYMMDD,
              teams: [
                awayTeam.teamTricode as TeamCode,
                homeTeam.teamTricode as TeamCode,
              ],
            }),
            playedOn: gameYYYYMMDD,
            seasonId: season.id,
            teams: [
              {
                score: awayTeam.score,
                teamId: awayTeam.teamTricode as TeamCode,
              },
              {
                score: homeTeam.score,
                teamId: homeTeam.teamTricode as TeamCode,
              },
            ],
          });
        }
      }
    }
  }

  return {
    games: relevantGames,
    ...(expiresAt && {
      expiresAt,
    }),
  };
};

export default loader;
