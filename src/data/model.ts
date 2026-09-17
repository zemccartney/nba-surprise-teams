import { z } from "astro/zod";

import { teamCodeSchema } from "../loaders/live/utils.ts";

const date = z.iso.date();
export const teamSchema = z.object({
  alternativeNames: z
    .array(
      z.object({
        duration: z.tuple([z.number().int(), z.number().int()]),
        logo: z.string().min(1),
        name: z.string().min(1),
      }),
    )
    .optional(),
  emoji: z.string().min(1),
  id: teamCodeSchema,
  name: z.string().min(1),
});
export const seasonSchema = z
  .object({
    endDate: date,
    episodeDate: date.optional(),
    episodeTitle: z.string().min(1).optional(),
    episodeUrl: z.url().optional(),
    id: z.string().regex(/^\d{4}$/),
    shortened: z
      .object({
        numGames: z.number().int().min(1).max(82),
        reason: z.string().min(1),
      })
      .optional(),
    startDate: date,
  })
  .refine(
    (season) =>
      Boolean(season.episodeDate) === Boolean(season.episodeTitle) &&
      Boolean(season.episodeDate) === Boolean(season.episodeUrl),
    "Episode fields must be supplied together",
  );
export const teamSeasonSchema = z
  .object({
    id: z.string(),
    overUnder: z.number().min(0).max(82).multipleOf(0.5),
    seasonId: z.string().regex(/^\d{4}$/),
    teamId: teamCodeSchema,
  })
  .refine(
    (entry) => entry.id === `${entry.seasonId}/${entry.teamId}`,
    "Incorrect team-season identity",
  );
const score = z.object({
  score: z.number().int().min(0),
  teamId: teamCodeSchema,
});
export const gameSchema = z.object({
  id: z.string(),
  nbaGameId: z.string().min(1).optional(),
  playedOn: date,
  seasonId: z.string().regex(/^\d{4}$/),
  teams: z.tuple([score, score]),
});
export type Game = z.infer<typeof gameSchema>;
export interface Metadata {
  seasons: Season[];
  teams: Team[];
  teamSeasons: TeamSeason[];
}
export type Season = z.infer<typeof seasonSchema>;
export type Team = z.infer<typeof teamSchema>;
export type TeamSeason = z.infer<typeof teamSeasonSchema>;
