import * as Sentry from "@sentry/cloudflare";
import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";
import { catalog } from "virtual:tracker/catalog";

import type { LiveLoaderResponse } from "../loaders/live/utils";

import { getLatestSeason } from "../content-utils";
import LiveLoader, { LIVE_DATA_VERSION } from "../loaders/live";
import { decodeLiveCache } from "../loaders/live/utils";
import * as Utils from "../utils";

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      includeSchedule: z.boolean().optional(),
      seasonId: z.string(),
    }),
    // eslint-disable-next-line perfectionist/sort-objects
    handler: async (input): Promise<LiveLoaderResponse> => {
      try {
        const season = catalog.getSeason(input.seasonId);

        if (!season) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Season not found",
          });
        }

        // The upstream loader is latest-season-only. Archive pages use static
        // data; never read/write an older season's KV key with this loader.
        const latestSeason = getLatestSeason();
        if (season.id !== latestSeason?.id) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Live data is available only for the latest season",
          });
        }

        // Compare Eastern calendar dates, independent of the server's timezone.
        const currentYYYYMMDD = Utils.getCurrentEasternYYYYMMDD();

        // Results remain empty before opening night. Showdown explicitly opts
        // into schedule fetching as soon as candidates are published.
        // Archived pages use static data, not a historical live-loader fallback.
        if (currentYYYYMMDD < season.startDate && !input.includeSchedule) {
          return {
            games: [],
          };
        }

        const now = Date.now();
        // Keep schedule-capable entries separate from the existing results key.
        // Missing schedule data can never satisfy a Showdown request.
        const cacheKey = input.includeSchedule
          ? `${season.id}:schedule`
          : season.id;
        const cached = decodeLiveCache(
          await env.GAMES_KV.get(cacheKey, "text"),
          season.id,
          LIVE_DATA_VERSION,
          input.includeSchedule,
        );

        if (cached.status === "invalid") {
          Sentry.captureException(cached.error, {
            tags: { source: "live-cache-validation" },
          });
        }

        const gamesCache = cached.status === "valid" ? cached.data : undefined;

        if (gamesCache) {
          const { expiresAt, games, schedule } = gamesCache;

          // A timestamp can legitimately accompany zero completed games.
          if (expiresAt !== undefined && expiresAt > now) {
            return gamesCache;
          }

          // No next expiry means a complete nonempty result set. Keep retrying
          // empty, undated responses rather than declaring a season finished.
          if (
            expiresAt === undefined &&
            games.length > 0 &&
            (!schedule || schedule.every((game) => game.status === "final"))
          ) {
            return { games, ...(schedule && { schedule }) };
          }
        }

        // Missing, incompatible, malformed or stale data must be refreshed.

        try {
          // The loader validates normalized output once, at its return boundary.
          const refreshed = input.includeSchedule
            ? await LiveLoader(season.id, { includeSchedule: true })
            : await LiveLoader(season.id);

          // No KV TTL: retain validated data as an outage fallback.
          await env.GAMES_KV.put(
            cacheKey,
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
          if (import.meta.env.DEV && error instanceof Error) {
            console.error("Live refresh failed:", error.message);
          }

          if (!gamesCache) {
            throw new ActionError({
              code: "INTERNAL_SERVER_ERROR", // TODO Report bug? says not available? code: 'SERVICE_UNAVAILABLE',
              message: "Unable to resolve working games data",
            });
          }

          return {
            games: gamesCache.games,
            ...(gamesCache.schedule && { schedule: gamesCache.schedule }),
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
