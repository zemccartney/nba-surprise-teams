import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import * as Sentry from "@sentry/cloudflare";
import { getSeasonById } from "../data";
import type { Loader, LoaderResponse } from "../data";
import * as Utils from "../utils";

// TODO Setup analytics to trach KV performance, pathways hit...how often cache is hit vs. fetches up-to-date values post-write
// Or could track pattern of TTLs, ensure counting down to next game time correctly?

const TWO_WEEKS_IN_MINUTES = 2 * 7 * 24 * 60 * 60;

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
            {
              type: "json",
              // cache for an arbitrarily long time; stable cacheTtl reference, idea is that
              // happy-path tries to always hit the cache, avoid cold reads as much as possible;
              // on write, we also call get with the minimum cacheTtl,
              // potential perf improvement: if w/in minute of write, background fetching, serve stale
              // data to avoid write loop and perf sink?
              // if you're worried about this, drop it to a few hours?
              cacheTtl: TWO_WEEKS_IN_MINUTES,
            },
          );

        console.log("FROM CACHE", {
          prevGames: gamesCache?.games?.length,
          prevExpiresAt: gamesCache?.expiresAt,
        });

        if (gamesCache?.games) {
          const { expiresAt, games } = gamesCache;

          // Our backup of remote data is still fresh; serve
          if (expiresAt && expiresAt > now) {
            return gamesCache;
          }

          // No next expiresAt means no more upcoming relevant games this season means no new writes
          if (!expiresAt) {
            // TODO Is there a way to force-clear server island caches? Or does that happen on deployment, due to, I assume, changing the params encryption key?
            // Don't send caching information to the browser
            return { games };
          }
        }

        // Cache is empty (no games) or stale (expiresAt <= now); refresh

        const { default: loader } = await import(
          // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
          `../data/seasons/${season.id}/loader.ts`
        );

        try {
          const refreshed = await (loader as Loader)();

          await astroCtx.locals.runtime.env.GAMES_KV.put(
            season.id.toString(),
            JSON.stringify(refreshed),
          );

          // TODO fetch in foreground if no data; fetch in background if stale data
          // TODO Instrument waitUntil with error reporting? or are those caught automatically?

          /*
            Intuition: hose the cache, try to ensure that writes come through as soon as possible

            1. Access the site
            2. KV data is expired, 2 week cacheTtl
            3. fetch
            4. serve fetch results
            5. revisit --> loops, refetching, until we're past 60 seconds from initial set / cache, at which point
            Ttl reduction triggers refresh since 60s will be less than time passed since initial cache entry

          Should we only ever fetch in the background? No,
          fetch and return if no data; if some data, fetch in
          the background


            ... some time later

            5. user-Y accesses the site
            6. KV data is expired
            7. fetch success, KV write
            
            ... some time later

            8. user-X accesses the site
            9. KV  _should_ show fresh data, given cache effectively busted in
            step 4 due to 60s ttl

          */
          astroCtx.locals.runtime.ctx.waitUntil(
            astroCtx.locals.runtime.env.GAMES_KV.get(
              season.id.toString(),
              "json",
              // refresh cache of request's network location
              // use default cacheTtl (60 seconds, lowest possible)
              // see latest results post-write as soon as possible
            ),
          );

          return refreshed;
        } catch (error) {
          // Serve our copy of data as a fallback, but report error for remediation
          // Better to keep site visibly working, even if data outdated
          if (import.meta.env.PROD) {
            Sentry?.captureException?.(error);
          }

          const fallback =
            await astroCtx.locals.runtime.env.GAMES_KV.get<LoaderResponse>(
              season.id.toString(),
              "json",
              // use default cacheTtl (60 seconds, lowest possible)
              // see latest results post-error-recovery as soon as possible
            );

          return {
            games: fallback?.games ?? [],
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
