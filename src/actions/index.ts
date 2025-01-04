import { defineAction, ActionError } from "astro:actions";
import { SIM_FULL_SEASON } from "astro:env/server";
import { z } from "astro:schema";
import * as Sentry from "@sentry/astro";
import { getSeasonById, getTeamsInSeason } from "../data";
import type { Game, TeamCodeType } from "../data";
import * as Utils from "../utils";

const TeamResultSchema = z.object({
  score: z.number(),
  teamTricode: z.string(),
});

const SeasonDataSchema = z.object({
  leagueSchedule: z.object({
    gameDates: z.array(
      z.object({
        gameDate: z.string(), // gameDate format: "10/04/2024 00:00:00"
        games: z.array(
          z.object({
            awayTeam: TeamResultSchema,
            homeTeam: TeamResultSchema,
            BIGSTINK: z.boolean(),
          }),
        ),
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

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number(),
    }),
    handler: async (input): Promise<Game[]> => {
      try {
        const season = getSeasonById(input.seasonId);

        if (!season) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }

        // TODO Document data management process / admin practices
        // TODO Fix this: intent
        /*
        - all past data, retrieved from db; minimize dependency on remote / uncontrolled data sources, assume will disappear at any moment
        - fetch from db as much as possible
        - report errors loudly if apparent issue in data source, alerted to need to find data elsewhere
        - assume source won't work past 2024 and not usable for past data
        - for 2025, will update this based on finding new source
        - for past data, will import directly to db
      */
        if (season.id === 2024) {
          const result = await load2024();

          const relevantGames: Game[] = [];

          // codes of teams participating in this season
          const TRICODES = getTeamsInSeason(season.id).map((team) => team.id);

          // TODO Need to evaluate on workers deployment; what is the time zone there?
          // game times are implicitly in EST
          // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
          // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone
          const currentDate = Utils.getCurrentDateEastern().split("T")[0]!; // TODO Possible to not need this assertion? Stricter TS linting?

          for (const slate of result.leagueSchedule.gameDates) {
            // gameDate format: "10/04/2024 00:00:00"
            const { gameDate } = slate;
            // TODO Possible to avoid non-null assertion here? Not sure why index type of split result is string | undefined
            const [mm, dd, yyyy] = gameDate.split(" ")[0]!.split("/");
            const comp = `${yyyy}-${mm}-${dd}`;

            // TODO: Doc known limitation of mistakenly including in-season tournament final game; data seems to give ways to ignore, just didn't deal with
            // that, as no 2024 candidates made it to the cup final

            if (import.meta.env.DEV && SIM_FULL_SEASON) {
              // Simulates full season results, filling in future games with random scores
              // Useful to see how UI handles a complete season
              if (comp >= season.startDate && comp <= season.endDate) {
                for (const game of slate.games) {
                  const { awayTeam, homeTeam } = game;
                  // Taking for granted that presence of scores reliably indicates a game has finished and should be counted
                  const hasScore = homeTeam.score && awayTeam.score;
                  const includesCandidateTeam =
                    TRICODES.includes(awayTeam.teamTricode) ||
                    TRICODES.includes(homeTeam.teamTricode);

                  if (includesCandidateTeam) {
                    relevantGames.push({
                      date: comp,
                      // TODO Might need to stash game time here for caching i.e. calculate next game
                      /* 
                      Lying a bit here, casting as TeamCodeType; don't want to worry about correctly tracking and parsing all possible
                      team codes, in case source data has unexpected codes; enough to say that as long as at least one of the tricodes
                      here is expected, we can work with this game data
                    */
                      homeTeam: homeTeam.teamTricode as TeamCodeType,
                      awayTeam: awayTeam.teamTricode as TeamCodeType,
                      homeScore: hasScore
                        ? homeTeam.score
                        : Math.floor(Math.random() * (140 - 80 + 1) + 80),
                      awayScore: hasScore
                        ? awayTeam.score
                        : Math.floor(Math.random() * (140 - 80 + 1) + 80),
                    });
                  }
                }
              }
            } else {
              if (comp >= season.startDate && comp <= currentDate) {
                for (const game of slate.games) {
                  const { awayTeam, homeTeam } = game;
                  // Taking for granted that presence of scores reliably indicates a game has finished and should be counted
                  const hasScore = homeTeam.score && awayTeam.score;
                  const includesCandidateTeam =
                    TRICODES.includes(awayTeam.teamTricode) ||
                    TRICODES.includes(homeTeam.teamTricode);

                  if (hasScore && includesCandidateTeam) {
                    relevantGames.push({
                      date: comp,
                      // TODO Might need to stash game time here for caching i.e. calculate next game
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

          // TODO
          // query db, since we have the full schedule, to determine the next game; serve data in db until
          // we're past the staleAt time (review catbox's options)
          // sqlite merge query? https://www.sqlite.org/lang_upsert.html

          return relevantGames;
        }

        return [];
      } catch (err) {
        console.log("BLOWING UP HERE, DO THESE SHOW UP IN CF?");
        console.log(err);

        if (import.meta.env.DEV) {
          console.log(err);
        }
        Sentry.captureException(err);
        throw err;
      }
    },
  }),
};
