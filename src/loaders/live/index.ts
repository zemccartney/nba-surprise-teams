import type { LiveLoaderResponse, TeamCode } from "./utils";

import * as ContentUtils from "../../content-utils";
import * as Utils from "../../utils";
import {
  CUP_CHAMPIONSHIP_PREFIX,
  hasScore,
  includesCandidateTeam,
  LiveLoaderResponseSchema,
  NBA_SCHEDULE_HEADERS,
  NBA_SCHEDULE_URL,
  SeasonDataSchema,
  toYYYYMMDD,
} from "./utils";

/*
 * Version of the normalized live data's shape AND interpretation, not the NBA
 * API version or a cryptographic signature. The action stores/checks it in KV.
 * Change it when old cached results must no longer be used, including as an
 * outage fallback. Shape validation alone cannot detect changed selection rules
 * (for example, newly excluding the Cup championship). A bump does not purge
 * KV replicas or already-cached HTTP responses; it rejects old data on read.
 *
 * Changelog (newest first; retain previous IDs and reasons):
 * - 07423eeb-1ebb-4cf1-89b7-ab05795b5ac1: require opaque nbaGameId on live
 *   games; exclude Cup championship from results AND refresh scheduling;
 *   validate normalized output and cache reads. Old data is not a fallback.
 * - fe5ae574-bb2d-478e-a2b5-d9b9f1458cc0: legacy normalized games/optional
 *   expiresAt contract. Relocated from the action without changing its value.
 *
 * Runtime schemas enforce shape; versioning still covers incompatible meaning.
 */
export const LIVE_DATA_VERSION = "07423eeb-1ebb-4cf1-89b7-ab05795b5ac1";

const loader = async (
  expectedSeasonId?: string,
): Promise<LiveLoaderResponse> => {
  // Assumption: force this function to return
  // Don't solve for missing data; i.e. don't crash your site just b/c you haven't set data "on time"
  // If you don't update in time, then home page will break b/c nothing to do: no next season set, still thinking
  // in old season
  const season = ContentUtils.getLatestSeason();

  if (!season) {
    throw new Error("Missing season data");
  }

  if (expectedSeasonId !== undefined && season.id !== expectedSeasonId) {
    throw new Error("Live loader season differs from the requested season");
  }

  const res = await fetch(NBA_SCHEDULE_URL, {
    headers: NBA_SCHEDULE_HEADERS,
    // Keep requests bounded without introducing retry traffic.
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`NBA CDN request failed: ${res.status}`);
  }

  const result = await res.json();

  const parsed = SeasonDataSchema.parse(result);
  const expectedSeasonYear = `${season.id}-${String(Number(season.id) + 1).slice(-2)}`;

  // Validate the source before assigning our season ID to normalized games.
  // The existing date window below guarantees every selected game is in range.
  if (parsed.leagueSchedule.seasonYear !== expectedSeasonYear) {
    throw new Error(`NBA schedule season does not match ${expectedSeasonYear}`);
  }

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
        gameYYYYMMDD >= season.startDate && gameYYYYMMDD <= season.endDate // equal to b/c we want to include records on the final day
      );
    })
    // Apply eligibility once, before BOTH result selection and next refresh.
    .map((slate) => ({
      ...slate,
      games: slate.games.filter(
        (game) => !game.gameId.startsWith(CUP_CHAMPIONSHIP_PREFIX),
      ),
    }));

  const relevantGames: LiveLoaderResponse["games"] = [];
  let expiresAt;

  const teams = ContentUtils.getTeamsInSeason(season.id);
  const TRICODES = teams.map((team) => team.id) as TeamCode[];

  // game times are implicitly in EST
  // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
  // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone
  const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();

  const nextRelevantDate = chronologicalSeason.find((slate) => {
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
            nbaGameId: game.gameId,
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

  return LiveLoaderResponseSchema.parse({
    games: relevantGames,
    ...(expiresAt !== undefined && { expiresAt }),
  });
};

export default loader;
