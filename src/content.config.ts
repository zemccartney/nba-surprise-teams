import { file } from "astro/loaders";
import { defineCollection, reference, z } from "astro:content";

const teamCodeSchema = z.enum([
  "ATL",
  "BKN",
  "BOS",
  "CHA",
  "CHI",
  "CLE",
  "DAL",
  "DEN",
  "DET",
  "GSW",
  "HOU",
  "IND",
  "LAC",
  "LAL",
  "MEM",
  "MIA",
  "MIL",
  "MIN",
  "NJN",
  "NOH",
  "NOK",
  "NOP",
  "NYK",
  "OKC",
  "ORL",
  "PHI",
  "PHX",
  "POR",
  "SAC",
  "SAS",
  "SEA",
  "TOR",
  "UTA",
  "VAN",
  "WAS",
]);

export const TEAM_CODES = teamCodeSchema.enum;
export type TeamCode = z.infer<typeof teamCodeSchema>;

const teams = defineCollection({
  loader: file("src/content/teams.json"),
  schema: z.object({
    alternativeNames: z
      .array(
        z.object({
          // Should be season ids, but those are strings due to limitations in astro's typing
          duration: z.tuple([z.number().int(), z.number().int()]),
          logo: z.string(),
          name: z.string(),
        }),
      )
      .optional(),
    emoji: z.string(),
    id: teamCodeSchema,
    name: z.string(),
  }),
});

const seasons = defineCollection({
  loader: file("src/content/seasons.json"),
  schema: z.object({
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    episodeUrl: z.string().url().optional(),
    id: z.string(),
    shortened: z
      .object({
        numGames: z.number().int(),
        reason: z.string(),
      })
      .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const teamSeasons = defineCollection({
  loader: file("src/content/teamSeasons.json"),
  schema: z.object({
    cone: teamCodeSchema.optional(),
    overUnder: z.number(),
    season: reference("seasons"),
    team: reference("teams"),
  }),
});

// DO NOT USE REFERENCES; data must be compatible with lives game data
// stored as "static" json in KV
const games = defineCollection({
  loader: file("src/content/games.json"),
  schema: z.object({
    id: z.string(),
    playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    seasonId: z.string(),
    teams: z.tuple([
      z.object({
        score: z.number().int(),
        teamId: teamCodeSchema,
      }),
      z.object({
        score: z.number().int(),
        teamId: teamCodeSchema,
      }),
    ]),
  }),
});

export const collections = {
  games,
  seasons,
  teams,
  teamSeasons,
};
