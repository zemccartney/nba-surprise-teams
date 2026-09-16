import * as Sentry from "@sentry/cloudflare";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { getEntry } from "astro:content";
import { env } from "cloudflare:workers";

import type { LiveLoaderResponse } from "../loaders/live/utils";

import { getLatestSeason } from "../content-utils";
import LiveLoader, { LIVE_DATA_VERSION } from "../loaders/live";
import { decodeLiveCache } from "../loaders/live/utils";
import * as Utils from "../utils";

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.string(),
    }),
    // eslint-disable-next-line perfectionist/sort-objects
    handler: async (input): Promise<LiveLoaderResponse> => {
      try {
        const season = await getEntry("seasons", input.seasonId);

        if (!season) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }

        // The upstream loader is latest-season-only. Archive pages use static
        // data; never read/write an older season's KV key with this loader.
        const latestSeason = await getLatestSeason();
        if (season.id !== latestSeason?.id) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Live data is available only for the latest season",
          });
        }

        // Compare Eastern calendar dates, independent of the server's timezone.
        const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();

        // Odds can be published before opening night. Do not fetch or set a
        // calculated expiry until the season begins (see MAINTENANCE.md).
        // Archived pages use static data, not a historical live-loader fallback.
        if (currentYYYYMMDD < season.data.startDate) {
          return {
            games: [],
          };
        }

        const now = Date.now();

        const cached = decodeLiveCache(
          await env.GAMES_KV.get(season.id, "text"),
          season.id,
          LIVE_DATA_VERSION,
        );

        if (cached.status === "invalid") {
          Sentry.captureException(cached.error, {
            tags: { source: "live-cache-validation" },
          });
        }

        const gamesCache = cached.status === "valid" ? cached.data : undefined;

        if (gamesCache) {
          const { expiresAt, games } = gamesCache;

          // A timestamp can legitimately accompany zero completed games.
          if (expiresAt !== undefined && expiresAt > now) {
            return gamesCache;
          }

          // No next expiry means a complete nonempty result set. Keep retrying
          // empty, undated responses rather than declaring a season finished.
          if (expiresAt === undefined && games.length > 0) {
            return { games };
          }
        }

        // Missing, incompatible, malformed or stale data must be refreshed.

        try {
          // The loader validates normalized output once, at its return boundary.
          const refreshed = await LiveLoader(season.id);

          // No KV TTL: retain validated data as an outage fallback.
          await env.GAMES_KV.put(
            season.id.toString(),
            JSON.stringify({
              data: refreshed,
              id: LIVE_DATA_VERSION,
            }),
          );

          return refreshed;
        } catch (error) {
          // Report refresh failures even when a valid backup keeps the page
          // working. Expected old cache versions are not refresh failures.
          Sentry.captureException(error);

          if (!gamesCache) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR", // TODO Report bug? says not available? code: 'SERVICE_UNAVAILABLE',
              message: "Unable to resolve working games data",
            });
          }

          return {
            games: gamesCache.games,
          };
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.log(error);
        }

        // Refresh failures were reported above. Expected request rejections
        // and their ActionError wrappers should not create duplicate alerts.
        if (!(error instanceof ActionError)) {
          Sentry.captureException(error);
        }

        throw error;
      }
    },
  }),
};
