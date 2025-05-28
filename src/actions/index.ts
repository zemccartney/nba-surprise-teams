import * as Sentry from "@sentry/cloudflare";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";

import type { LoaderResponse } from "../data/content-utils";

import * as ContentUtils from "../data/content-utils";
import LiveLoader from "../data/loaders/live";
import * as Utils from "../utils";

/*

Used to prevent workers from returning outdated data from KV.

Given:
- KV will cache results afer read at edge locations
- If breaking changes made to shape of data at play (as output by loader / stored in KV),
cached output could result in errors (data not matching consumer contract, unusable)
- There's no way to force-clear all KV-cached results (letting alone this doesn't solve
for continued usage repopulating caches)

So, we need a real-time way to verify that KV matches consumer contract, so we "sign" / version the data in KV;
this version id is a stand-in for the expected data shape i.e. if mismatched with one present on
cached data, if any, then assume cache is invalid and force refresh

TODO Thinking about it, could switch to parsing output of KV, using schema for expected shape
Less performant, but more clearly expresses intent, less fragile / difficult to remember to update

*/
const SCHEMA_ID = "fe5ae574-bb2d-478e-a2b5-d9b9f1458cc0"; // :) https://everyuuid.com/

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number().int(),
    }),
    // eslint-disable-next-line perfectionist/sort-objects
    handler: async (input, astroCtx): Promise<LoaderResponse> => {
      try {
        const season = await ContentUtils.getSeasonById(input.seasonId);

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
        if (currentYYYYMMDD < season.data.startDate) {
          return {
            games: [],
          };
        }

        const gamesCache = await astroCtx.locals.runtime.env.GAMES_KV.get<{
          data: LoaderResponse;
          id: string;
        }>(season.data.id.toString(), "json");

        if (
          // Does it look like KV contains well-formed data?
          gamesCache?.id === SCHEMA_ID &&
          Object.hasOwn(gamesCache.data, "games") &&
          gamesCache.data?.games.length
        ) {
          const { expiresAt, games } = gamesCache.data;

          // No next expiresAt means no more upcoming relevant games this season means no new writes
          if (!expiresAt) {
            // TODO Is there a way to force-clear server island caches? Or does that happen on deployment, due to, I assume, changing the params encryption key?
            // Don't send caching information to the browser ... why? Lazy?
            return { games };
          }

          // Our backup of remote data is still fresh; serve
          if (expiresAt > now) {
            return gamesCache.data;
          }
        }

        // Cache is empty (no games) or stale (expiresAt <= now); refresh
        // TODO Refresh in the background if stale results via waitUntil? Review catbox settings

        try {
          const refreshed = await LiveLoader();

          // expiration without eviction: keep data around as a fallback,
          await astroCtx.locals.runtime.env.GAMES_KV.put(
            season.id.toString(),
            JSON.stringify({
              data: refreshed,
              id: SCHEMA_ID,
            }),
          );

          return refreshed;
        } catch (error) {
          // Serve our copy of data as a fallback, but report error for remediation
          // Better to keep site visibly working, even if data outdated
          if (import.meta.env.PROD) {
            Sentry?.captureException?.(error);
          }

          if (gamesCache?.id !== SCHEMA_ID) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR", // TODO Report bug? says not available? code: 'SERVICE_UNAVAILABLE',
              message: "Unable to resolve working games data",
            });
          }

          return {
            games: gamesCache?.data?.games ?? [],
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
