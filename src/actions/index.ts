import { defineAction, ActionError } from "astro:actions";
import { SIM_FULL_SEASON } from "astro:env/server";
import { z } from "astro:schema";
import { getSeasonById, getTeamsInSeason } from "../data";
import type { Game, TeamCodeType } from "../data";
import * as Utils from "../utils";

const TeamResultSchema = z.object({
  score: z.number(),
  teamTricode: z.string(),
});

const GameResultSchema = z.object({
  awayTeam: TeamResultSchema,
  homeTeam: TeamResultSchema,
  gameDateTimeUTC: z.string(), // ISO string e.g. "2025-01-05T23:00:00Z"
});

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

const load2024 = async () => {
  const res = await fetch(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    {
      headers: {
        Accept: "application/json",
      },
      // Timeout maybe too high, potentially revisit. Intuition: don't make user wait too long if response hanging, but enough leeway to account for uncertain latency
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!res.ok) {
    throw new ActionError({
      code: "INTERNAL_SERVER_ERROR",
      message: `NBA CDN request failed: ${res.status}`,
    });
  }

  const result = await res.json();

  const parsed = SeasonDataSchema.parse(result);

  return parsed;
};

// Taking for granted that presence of scores reliably indicates a game has finished and should be counted
const hasScore = (game: z.infer<typeof GameResultSchema>) =>
  game.homeTeam.score && game.awayTeam.score;

const includesCandidateTeam = (
  game: z.infer<typeof GameResultSchema>,
  tricodes: TeamCodeType[],
) =>
  tricodes.includes(game.awayTeam.teamTricode) ||
  tricodes.includes(game.homeTeam.teamTricode);

// gameDate format: "10/04/2024 00:00:00"
const toYYYYMMDD = (gameDate: string) => {
  // TODO Possible to avoid non-null assertion here? Not sure why index type of split result is string | undefined
  const [mm, dd, yyyy] = gameDate.split(" ")[0]!.split("/");
  return `${yyyy}-${mm}-${dd}`;
};

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number(),
    }),
    handler: async (input): Promise<{ games: Game[]; expiresOn?: number }> => {
      try {
        const season = getSeasonById(input.seasonId);

        if (!season) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }

        if (season.id === 2024) {
          // TODO if current date is outside of the season, don't bother fetching fresh data, no
          // more real-time updates; rely on local / my data source (once past games converted to constants)

          const result = await load2024();

          const relevantGames: Game[] = [];
          let expiresOn;

          // codes of teams participating in this season
          const TRICODES = getTeamsInSeason(season.id).map((team) => team.id);

          // TODO Need to evaluate on workers deployment; what is the time zone there?
          // game times are implicitly in EST
          // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
          // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone
          const currentYYYYMMDD = Utils.getCurrentDateEastern().split("T")[0]!; // TODO Possible to not need this assertion? Stricter TS linting?

          // I believe data is already ordered like this, more to be explicit / for peace of mind, prove
          // to myself that data is how I need it to be
          const chronologicalSeason = result.leagueSchedule.gameDates
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
                gameYYYYMMDD >= season.startDate &&
                gameYYYYMMDD <= season.endDate
              );
            });

          // TODO: Doc known limitation of mistakenly including in-season tournament final game; data seems to give ways to ignore, just didn't deal with
          // that, as no 2024 candidates made it to the cup final

          if (import.meta.env.DEV && SIM_FULL_SEASON) {
            for (const slate of chronologicalSeason) {
              const gameYYYYMMDD = toYYYYMMDD(slate.gameDate);
              // Simulates full season results, filling in future games with random scores
              // Useful to see how UI handles a complete season
              for (const game of slate.games) {
                const { awayTeam, homeTeam } = game;
                const gameComplete = hasScore(game);

                if (includesCandidateTeam(game, TRICODES)) {
                  relevantGames.push({
                    date: gameYYYYMMDD,
                    /* 
                    Lying a bit here, casting as TeamCodeType; don't want to worry about correctly tracking and parsing all possible
                    team codes, in case source data has unexpected codes; enough to say that as long as at least one of the tricodes
                    here is expected, we can work with this game data
                  */
                    homeTeam: homeTeam.teamTricode as TeamCodeType,
                    awayTeam: awayTeam.teamTricode as TeamCodeType,
                    homeScore: gameComplete
                      ? homeTeam.score
                      : Math.floor(Math.random() * (140 - 80 + 1) + 80),
                    awayScore: gameComplete
                      ? awayTeam.score
                      : Math.floor(Math.random() * (140 - 80 + 1) + 80),
                  });
                }
              }
            }
          } else {
            const todayInd = chronologicalSeason.findIndex((slate) => {
              const yyyymmdd = toYYYYMMDD(slate.gameDate);
              return yyyymmdd === currentYYYYMMDD;
            });

            // TODO handle if false i.e. querying w/ date outside season or season missing data, unexpectedly ... error here? report (if Sentry ends up working)
            // Do once we have off-season logic in place? When we know if we get here, data's missing (Error), not just off-season (handleable)
            // TODO Factor into SIM_SEASON
            if (todayInd) {
              const nextRelevantDate = chronologicalSeason
                .slice(todayInd)
                .find((slate) => {
                  // Find next game day with an incomplete game featuring at least one surprise team i.e. next point
                  // at which new, relevant data might be available
                  return slate.games.some(
                    (game) =>
                      !hasScore(game) && includesCandidateTeam(game, TRICODES),
                  );
                });

              if (nextRelevantDate) {
                // When's the earliest incomplete game on the found relevant game date? We'll use this time to guess when new, relevant
                // data might be available
                const earliestUpcomingGameStartMs = Math.min(
                  ...nextRelevantDate.games
                    .filter(
                      (game) =>
                        !hasScore(game) &&
                        includesCandidateTeam(game, TRICODES),
                    )
                    .map((game) => new Date(game.gameDateTimeUTC).getTime()),
                );

                const now = Date.now();
                const minToMs = (min: number) => min * 60 * 1000;
                /*
                  Games are roughly 2.25 hours i.e. how long until a result might be in. Add 10 minutes to account for
                  a.) uncertainty around how quickly data source is updated; anecdotally, seems near-real-time, so small fudge factor
                  b.) uncertainty around game length; no guarantee games how long games will last

                  In short, no guarantees around when new data will be available; so best effort to continuously cache, lessen
                  reliance on external data source, while still trying my best to fetch updates as soon as they're available as possible
                */
                const averageGameLengthMin = 2.25 * 60 + 10;
                const endOfGame =
                  earliestUpcomingGameStartMs + minToMs(averageGameLengthMin);

                /*
                  When might our copy of game data be outdated i.e. missing latest results (relative to timestamp calculated above)?

                  If the game's not over yet, still good, wait till the end
                  If the game's finished and still no result, though, bump 5 minutes before checking again. 5 minutes is entirely arbitrary
                  Not actually a big deal to fetch data continuously, I don't think, likely being overly paranoid about lack of contract with
                  data source, wanting to lessen reliance / use "own" copy of data as much as possibile for reliability's sake
                */
                expiresOn = endOfGame > now ? endOfGame : now + minToMs(5);
              } else {
                // TODO season is complete
              }
            }

            for (const slate of chronologicalSeason) {
              const gameYYYYMMDD = toYYYYMMDD(slate.gameDate);
              if (gameYYYYMMDD <= currentYYYYMMDD) {
                for (const game of slate.games) {
                  const { awayTeam, homeTeam } = game;

                  if (hasScore(game) && includesCandidateTeam(game, TRICODES)) {
                    relevantGames.push({
                      date: gameYYYYMMDD,
                      /* 
                      Lying a bit here, casting as TeamCodeType; don't want to worry about correctly tracking and parsing all possible
                      team codes, in case source data has unexpected codes; enough to say that as long as at least one of the tricodes
                      here is expected, we can work with this game data
                    */
                      homeTeam: homeTeam.teamTricode as TeamCodeType,
                      awayTeam: awayTeam.teamTricode as TeamCodeType,
                      homeScore: homeTeam.score,
                      awayScore: awayTeam.score,
                    });
                  }
                }
              }
            }
          }

          return {
            games: relevantGames,
            ...(expiresOn && {
              expiresOn,
            }),
          };
        }

        return { games: [] };
      } catch (err) {
        if (import.meta.env.DEV) {
          console.log(err);
        }

        throw err;
      }
    },
  }),
};
