import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import * as Sentry from "@sentry/cloudflare";
import { getSeasonById } from "../data";
import type { Loader, LoaderResponse } from "../data";
import * as Utils from "../utils";

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number(),
    }),
    handler: async (input, astroCtx): Promise<LoaderResponse> => {
      try {
        const season = getSeasonById(input.seasonId);

        if (!season) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }

        // game times are implicitly in EST
        // on fetching data, we want only the games scheduled through the current date i.e. possibly finished
        // so, we need the yyyy-mm-dd representation of the current data in EST, regardless of the server's time zone
        const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();
        const now = Date.now();

        // TODO Document; needed to handle when season-in-waiting i.e. season and over/unders for upcoming set, but season not started (see home page)
        // Build assumption: allowable / expected that season will be ready data-wise prior to season start date, given
        // expected data release schedule; past season end not factored here i.e. previous route, pull from static if past season
        // end, as we don't solve for missing data programmatically; solve for material problems with material
        if (currentYYYYMMDD < season.startDate) {
          return {
            games: [],
          };
        }

        const gamesCache =
          await astroCtx.locals.runtime.env.GAMES_KV.get<LoaderResponse>(
            season.id.toString(),
            "json",
          );

        if (gamesCache?.games) {
          const { expiresAt, games } = gamesCache;

          // No next expiresAt means no more upcoming relevant games this season means no new writes
          if (!expiresAt) {
            // TODO Is there a way to force-clear server island caches? Or does that happen on deployment, due to, I assume, changing the params encryption key?
            // Don't send caching information to the browser
            return { games };
          }

          // Our backup of remote data is still fresh; serve
          if (expiresAt > now) {
            return gamesCache;
          }
        }

        // Cache is empty (no games) or stale (expiresAt <= now); refresh

        const { default: loader } = await import(
          // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
          `../data/seasons/${season.id}/loader.ts`
        );

        try {
          const refreshed = await (loader as Loader)();

          // expiration without eviction: keep data around as a fallback,
          await astroCtx.locals.runtime.env.GAMES_KV.put(
            season.id.toString(),
            JSON.stringify(refreshed),
          );

          return refreshed;
        } catch (error) {
          // Serve our copy of data as a fallback, but report error for remediation
          // Better to keep site visibly working, even if data outdated
          if (import.meta.env.PROD) {
            Sentry?.captureException?.(error);
          }

          return {
            games: gamesCache?.games ?? [],
          };
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.log(error);
        }

        Sentry.captureException?.(error);

        throw error;
      }
    },
  }),
};
