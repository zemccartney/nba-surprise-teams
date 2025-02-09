import { sql } from "drizzle-orm";
import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

// https://www.sqlite.org/autoinc.html

export const SeasonCaches = table("SeasonCaches", {
  id: t.int().primaryKey(), // year of season start date
  expiresAt: t.int(), // timestamp of cache expiration
  // timestamp of cache setting; for diagnostic purposes; can use to determine if
  // expiresAt calculations are correct: given updatedAt and NBA schedule, when should expiresAt be?
  updatedAt: t.int().$onUpdate(() => sql`(CURRENT_TIMESTAMP)`), // TODO Does this work?
});

export const Games = table("Games", {
  id: t.int().primaryKey(),
  // Might not be needed? Theoretical integrity, likely never storing multiple seasons in the db at once
  season: t
    .int()
    .references(() => SeasonCaches.id)
    .notNull(),
  homeTeam: t.text().notNull(), // in practice, TeamCode, but not worrying about unknown team codes
  awayTeam: t.text().notNull(), // in practice, TeamCode, but not worrying about unknown team codes
  homeScore: t.int().notNull().default(0),
  awayScore: t.int().notNull().default(0),
  // Yes, playedOn is redundant / less info; including both for ease of use; in practice, we use playedOn
  // far more often (UI), with playedAt relevant only for SeasonCache.expiresAt calculation, and we're not keeping these in sync,
  // so figured convenience at no real cost
  playedOn: t.text().notNull(), // YYYY-MM-DD of game date, implicitly in eastern time
  playedAt: t.int().notNull(), // ISO string of start time
});
