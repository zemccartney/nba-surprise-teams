import { defineDb, defineTable, column } from "astro:db";

// https://www.sqlite.org/autoinc.html

export const SeasonCaches = defineTable({
  columns: {
    id: column.number({ primaryKey: true }), // year of season start date
    // TODO Update terminology eslewhere (at for moments, on for dates)
    expiresAt: column.number({ optional: true }), // timestamp of cache expiration
    // timestamp of cache setting; for diagnostic purposes; can use to determine if
    // expiresAt calculations are correct: given updatedAt and NBA schedule, when should expiresAt be?
    updatedAt: column.number({ optional: true }),
  },
});

export const Games = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    // Might not be needed? Theoretical integrity, likely never storing multiple seasons in the db at once
    season: column.number({ references: () => SeasonCaches.columns.id }),
    homeTeam: column.text(),
    awayTeam: column.text(),
    homeScore: column.number(),
    awayScore: column.number(),
    // Yes, these are redundant; including both for ease of use; in practice, we use playedOn
    // far more often (UI), with playedAt relevant only for SeasonCache.expiresAt calculation, and we're not keeping these in sync,
    // so figured convenience at no real cost
    playedOn: column.text(), // YYYY-MM-DD of game date, implicitly in eastern time
    playedAt: column.number(), // ISO string of start time
  },
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    SeasonCaches,
    Games,
  },
});

// season
// season updated at,

// games reference season cache, need to create that record first
// auto inc
// unique index on date, hometeam, away team?
