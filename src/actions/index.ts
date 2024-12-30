import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { getSeasonById, getTeamsInSeason } from "../data";
import type { Game } from "../data";
import * as Utils from "../utils";

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number(),
    }),
    handler: async (input): Promise<Game[]> => {
      const season = getSeasonById(input.seasonId);

      // TODO What happens if a generic Error is thrown e.g. a TypeError?

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
        const res = await fetch(
          "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        // TODO Document data shape
        const result = await res.json();

        const relevantGames: Game[] = [];

        // assert expected shape at each step?
        // need to filter games by season dates
        // gameLabel = preseason?
        // or just use range of dates of the season
        //

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
          const [mm, dd, yyyy] = gameDate.split(" ")[0].split("/");
          const comp = `${yyyy}-${mm}-${dd}`;

          // TODO: Doc known limitation of mistakenly including in-season tournament final game; data seems to give ways to ignore, just didn't deal with
          // that, as no 2024 candidates made it to the cup final

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
                  homeTeam: homeTeam.teamTricode,
                  awayTeam: awayTeam.teamTricode,
                  homeScore: homeTeam.score,
                  awayScore: awayTeam.score,
                });
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
    },
  }),
};
