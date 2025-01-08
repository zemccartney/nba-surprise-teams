import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { TURSO_URL, TURSO_AUTH_TOKEN } from "astro:env/server";
// TODO Investigate; astro clipped these from drizzle-orm's export, no idea why
import { lte, gte, eq, and } from "drizzle-orm/expressions";
import Db from "../data/db";
import { SeasonCaches, Games } from "../data/db/schema";
import { getSeasonById } from "../data";
import type { Game, Loader } from "../data";
import * as Utils from "../utils";

const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const server = {
  getSeasonData: defineAction({
    input: z.object({
      seasonId: z.number(),
    }),
    handler: async (
      input,
      ctx,
    ): Promise<{ games: Game[]; expiresAt?: number }> => {
      try {
        const dbClient = Db({
          url: TURSO_URL,
          authToken: TURSO_AUTH_TOKEN,
        });

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

        if (currentYYYYMMDD < season.startDate) {
          return {
            games: [],
          };
        }

        // All past seasons must have data saved on file
        // Once season is over, data is constant, ink is dry, no sense
        // in pulling data from external sources
        if (currentYYYYMMDD > season.endDate) {
          // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
          const staticGames = (await import(`../data/${season.id}/games.ts`))
            .default as Game[];

          return {
            expiresAt: now + WEEK_IN_MS, // mark as cacheable for a while, arbitrarily a week; TODO revisit, do something actually smart; data is constant now
            games: staticGames,
          };
        }

        const seasonCache = (
          await dbClient
            .select()
            .from(SeasonCaches)
            .where(eq(SeasonCaches.id, season.id))
        )[0];

        const prevExpiresAt = seasonCache?.expiresAt;

        // Our backup of remote data is still fresh; serve
        if (prevExpiresAt && prevExpiresAt > now) {
          return {
            expiresAt: prevExpiresAt,
            games: await dbClient
              .select()
              .from(Games)
              .where(
                and(
                  eq(Games.season, season.id),
                  and(
                    gte(Games.playedOn, season.startDate),
                    lte(Games.playedOn, season.endDate),
                  ),
                ),
              ),
          };
        }

        // No set cache expiration or our backup of remote data is expired; refresh

        // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
        const loader = (await import(`../data/seasons/${season.id}/loader.ts`))
          .default as Loader;

        try {
          const refreshed = await loader();

          // No next expiresAt means no more upcoming relevant games this season
          const nextExpiresAt = refreshed.expiresAt ?? now + WEEK_IN_MS; // mark as cacheable for a while, arbitrarily a week; TODO revisit, do something actually smart; data is constant now

          await dbClient.batch([
            dbClient
              .insert(SeasonCaches)
              .values([
                {
                  id: season.id,
                  expiresAt: nextExpiresAt,
                  updatedAt: now,
                },
              ])
              .onConflictDoUpdate({
                target: SeasonCaches.id,
                set: { expiresAt: nextExpiresAt, updatedAt: now },
              }),
            // Yes, this is pretty gross, but didn't feel like dealing with an upsert; data's not that precious,
            // opted to keep simple and do a "hard refresh"
            dbClient.delete(Games).where(eq(Games.season, season.id)),
            dbClient.insert(Games).values(refreshed.games),
          ]);

          return {
            expiresAt: nextExpiresAt,
            games: refreshed.games,
          };
        } catch (err) {
          // Serve our copy of data as a fallback, but report error for remediation
          // Better to keep site visibly working, even if data outdated
          if (import.meta.env.PROD) {
            // @ts-ignore
            ctx.locals.Sentry?.captureException?.(err);
          }

          return {
            // don't surface expiresAt, don't support caching here; on the one hand, end users
            // will continue to trigger errors; on the other, end users will receive fresh data
            // ASAP from using the site. Does this work out in practice?
            games: await dbClient
              .select()
              .from(Games)
              .where(
                and(
                  eq(Games.season, season.id),
                  and(
                    // TODO Does YYYY-MM-DD comparison still work w/ libsql?
                    gte(Games.playedOn, season.startDate),
                    lte(Games.playedOn, season.startDate),
                  ),
                ),
              ),
          };
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.log(err);
        }

        if (import.meta.env.PROD) {
          // @ts-ignore
          ctx.locals.Sentry?.captureException?.(err);
        }

        throw err;
      }
    },
  }),
};
