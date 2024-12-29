import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { TEAM_SEASONS, getSeasonById } from "../data";
import type { TeamCodeType } from "../data";
import * as Utils from "../utils";

interface Game {
  date: string;
  homeTeam: TeamCodeType;
  awayTeam: TeamCodeType;
  homeScore: number;
  awayScore: number;
}

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

      const seasonYear = season.startDate.substring(0, 4);

      // TODO Fix this: intent
      /*
        - all past data, retrieved from db; minimize dependency on remote / uncontrolled data sources, assume will disappear at any moment
        - fetch from db as much as possible
        - report errors loudly if apparent issue in data source, alerted to need to find data elsewhere
        - assume source won't work past 2024 and not usable for past data
        - for 2025, will update this based on finding new source
        - for past data, will import directly to db
      */
      if (seasonYear === "2024") {
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
        const TRICODES = TEAM_SEASONS.filter(
          (ts) => ts.season === season.id,
        ).map((ts) => ts.team);

        // TODO Need to evaluate on workers deployment; what is the time zone there?
        const currentDate = Utils.getCurrentDateEastern().split("T")[0]!; // TODO Possible to not need this assertion? Stricter TS linting?

        // game times are implicitly in EST
        // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
        // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone

        for (const slate of result.leagueSchedule.gameDates) {
          // gameDate format: "10/04/2024 00:00:00"
          const { gameDate } = slate;
          const [mm, dd, yyyy] = gameDate.split(" ")[0].split("/");
          const comp = `${yyyy}-${mm}-${dd}`;

          if (comp >= season.startDate && comp <= currentDate) {
            for (const game of slate.games) {
              const { awayTeam, homeTeam } = game;

              if (
                // Taking for granted that presence of scores reliably indicates a game has finished and should be counted
                homeTeam.score &&
                awayTeam.score &&
                (TRICODES.includes(awayTeam.teamTricode) ||
                  TRICODES.includes(homeTeam.teamTricode))
              ) {
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
