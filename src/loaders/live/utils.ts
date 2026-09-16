import { z } from "astro/zod";

// Keep shared helpers usable in plain Node: no astro:content or Worker imports.
// content-utils re-exports these existing team identifiers for its consumers.
export const teamCodeSchema = z.enum([
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

// Request configuration shared by the loader and the standalone diagnostic.
export const NBA_SCHEDULE_URL =
  "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json";

export const NBA_SCHEDULE_HEADERS = {
  Accept: "application/json",
  Referer: "https://www.nba.com/",
};

// Working theory: 001 preseason, 002 regular season, 006 Cup championship.
// Observed IDs resemble type(3) + season-start year(2) + opaque suffix(5).
// Production filtering uses only 006. Do not assume ordering or game counts.
// Recheck against labels each preseason with scripts/check-nba-feed.ts.
export const CUP_CHAMPIONSHIP_PREFIX = "006";

// Validate upstream structure without asserting undocumented status meanings.
const TeamResultSchema = z.object({
  score: z.number(),
  teamTricode: z.string(),
});

const GameResultSchema = z.object({
  awayTeam: TeamResultSchema,
  gameDateTimeUTC: z.string(),
  gameId: z.string().min(1),
  homeTeam: TeamResultSchema,
});

export const SeasonDataSchema = z.object({
  leagueSchedule: z.object({
    gameDates: z.array(
      z.object({
        gameDate: z.string(),
        games: z.array(GameResultSchema),
      }),
    ),
    seasonYear: z.string(),
  }),
});

// Deliberately unchanged pending the preseason observations in MAINTENANCE.md.
export const hasScore = (game: z.infer<typeof GameResultSchema>) =>
  game.homeTeam.score && game.awayTeam.score;

export const includesCandidateTeam = (
  game: z.infer<typeof GameResultSchema>,
  tricodes: TeamCode[],
) =>
  tricodes.some(
    (code) =>
      code === game.awayTeam.teamTricode || code === game.homeTeam.teamTricode,
  );

const CalendarDateSchema = z.iso.date();

// Feed slates use Eastern calendar dates, e.g. "10/04/2024 00:00:00".
export const toYYYYMMDD = (gameDate: string) => {
  const date = gameDate.split(" ", 1)[0];
  const parts = date?.split("/");

  if (!parts || parts.length !== 3) {
    throw new Error("NBA schedule contains an unrecognized slate date");
  }

  const [month, day, year] = parts;

  return CalendarDateSchema.parse(`${year}-${month}-${day}`);
};

const TeamScoreSchema = z.object({
  score: z.number().int().nonnegative(),
  teamId: teamCodeSchema,
});

// Our normalized data contract, distinct from the upstream schedule schema.
export const LiveLoaderResponseSchema = z.object({
  expiresAt: z.number().int().nonnegative().optional(),
  games: z.array(
    z.object({
      id: z.string().min(1),
      // Deliberate expansion beyond games in content.config.ts: ideally the
      // schemas would agree, but preserving this provider ID enables the useful
      // championship refinement below without rewriting historical archives.
      nbaGameId: z
        .string()
        .min(1)
        .refine((id) => !id.startsWith(CUP_CHAMPIONSHIP_PREFIX), {
          message: "Cup championship is not a regular-season result",
        }),
      playedOn: CalendarDateSchema,
      seasonId: z.string().min(1),
      teams: z.tuple([TeamScoreSchema, TeamScoreSchema]),
    }),
  ),
});

export type LiveLoaderResponse = z.infer<typeof LiveLoaderResponseSchema>;

type CacheReadResult =
  | { data: LiveLoaderResponse; status: "valid" }
  | { error: Error; status: "invalid" }
  | { status: "incompatible" }
  | { status: "missing" };

const CacheEnvelopeSchema = z.object({
  data: z.unknown(),
  id: z.string().min(1),
});

// Missing entries and explicit old versions are expected. A current-version
// shape failure (or undecodable/unversioned data) is unexpected and reportable.
// Return the diagnosis; the action owns Sentry and recovery. Error messages
// deliberately omit persisted values and native JSON parser body excerpts.
export const decodeLiveCache = (
  raw: null | string,
  seasonId: string,
  version: string,
): CacheReadResult => {
  if (raw === null) {
    return { status: "missing" };
  }

  let value: unknown;

  try {
    value = JSON.parse(raw);
  } catch {
    return {
      error: new Error("Live cache contains malformed JSON"),
      status: "invalid",
    };
  }

  const envelope = CacheEnvelopeSchema.safeParse(value);

  if (!envelope.success) {
    return {
      error: new Error("Live cache has a malformed version envelope"),
      status: "invalid",
    };
  }

  // Check the version BEFORE interpreting data against the current schema.
  if (envelope.data.id !== version) {
    return { status: "incompatible" };
  }

  const parsed = LiveLoaderResponseSchema.safeParse(envelope.data.data);

  if (!parsed.success) {
    const paths = parsed.error.issues.map(
      (issue) => issue.path.join(".") || "<root>",
    );

    return {
      error: new Error(
        `Current-version live cache failed validation at: ${paths.join(", ")}`,
      ),
      status: "invalid",
    };
  }

  const hasWrongSeason = parsed.data.games.some(
    (game) => game.seasonId !== seasonId,
  );

  if (hasWrongSeason) {
    return {
      error: new Error("Current-version live cache contains another season"),
      status: "invalid",
    };
  }

  return { data: parsed.data, status: "valid" };
};

// Both islands share this calculation. An undated outage fallback must not
// acquire an invented fresh lifetime; elapsed deadlines must not go negative.
export const liveCacheControl = (expiresAt?: number): string | undefined => {
  if (expiresAt === undefined) {
    return;
  }

  const remainingSeconds = Math.floor((expiresAt - Date.now()) / 1000);
  const maxAge = Math.max(0, remainingSeconds);

  return `public, max-age=${maxAge}`;
};
