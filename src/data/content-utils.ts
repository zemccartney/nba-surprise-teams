import type { CollectionEntry } from "astro:content";

import { getCollection, getEntry } from "astro:content";

import type {
  SeasonId as _SeasonId,
  TeamCode as _TeamCode,
} from "../content.config";

export type GameData = GameEntry["data"];

export type GameEntry = CollectionEntry<"games">;

export interface LoaderResponse {
  expiresAt?: number;
  games: GameData[];
}

// convenience
export type SeasonId = _SeasonId;

// TODO Explain
export interface SeasonsEntry extends Omit<CollectionEntry<"seasons">, "id"> {
  id: SeasonId;
}

// convenin
export type TeamCode = _TeamCode;

export interface TeamEntry extends Omit<CollectionEntry<"teams">, "id"> {
  id: TeamCode;
}
export type TeamSeasonData = CollectionEntry<"teamSeasons">["data"];

export type TeamSeasonEntry = CollectionEntry<"teamSeasons">;

export type TeamStats = TeamSeasonData & {
  record: TeamRecord;
};

// TODO Explain
export const getSeasonById = async (id: number) => {
  const season = await getEntry("seasons", id.toString());
  if (!season) {
    return season;
  }
  return {
    ...season,
    id: Number.parseInt(season.id, 10),
  };
};

// TODO Explain
export const getSeasons = async (filter?: (arg: SeasonsEntry) => unknown) => {
  const seasons = await getCollection("seasons", ({ id, ...rest }) =>
    filter?.({ id: Number.parseInt(id, 10), ...rest }),
  );
  return seasons.map((season) => ({
    ...season,
    id: Number.parseInt(season.id, 10),
  }));
};

export const getTeams = async (filter?: (arg: TeamEntry) => unknown) => {
  return (await getCollection("teams", ({ id, ...rest }) =>
    filter?.({ id: id as TeamCode, ...rest }),
  )) as TeamEntry[];
};

export const getTeamById = async (id: TeamCode) => {
  return await getEntry("teams", id);
};

export const getLatestSeason = async () => {
  const seasons = await getSeasons();
  return sortSeasons(seasons)[0];
};

// Based on season ids being years
export const sortSeasons = (
  seasons: SeasonsEntry[],
  {
    direction = "desc",
  }: {
    direction?: "asc" | "desc";
  } = {},
) => {
  return seasons.toSorted((a, b) =>
    (direction === "desc" ? a : b).data.id >
    (direction === "desc" ? b : a).data.id
      ? -1
      : (direction === "desc" ? a : b).data.id <
          (direction === "desc" ? b : a).data.id
        ? 1
        : 0,
  );
};

export const getTeamSeasonsBySeason = async (
  seasonId: number,
): Promise<TeamSeasonEntry[]> => {
  return await getCollection("teamSeasons", ({ data }) => {
    return data.seasonId === seasonId;
  });
};

export const getTeamSeasonById = async (seasonId: number, teamId: string) => {
  return await getEntry("teamSeasons", `${seasonId}/${teamId}`);
};

export const getGamesBySeason = async (seasonId: number) => {
  return await getCollection("games", ({ data }) => {
    return data.seasonId === seasonId;
  });
};

export const getTeamsInSeason = async (
  seasonId: number,
): Promise<TeamEntry[]> => {
  const teamSeasons = await getTeamSeasonsBySeason(seasonId);
  const teamIds = new Set(teamSeasons.map((ts) => ts.data.teamId));
  return await getTeams(({ id }) => teamIds.has(id));
};

export const getArchivedSeasons = async (): Promise<SeasonsEntry[]> => {
  const gamesEntries = await getCollection("games");
  const archivedSeasonIds = new Set(
    gamesEntries.map((entry) => entry.data.seasonId),
  );

  const seasons = await getSeasons(({ id }) => {
    return archivedSeasonIds.has(id);
  });

  return sortSeasons(seasons);
};

export const getCompleteDataset = async () => {
  const gamesEntries = await getCollection("games");
  return gamesEntries
    .flatMap((entry) => entry.data)
    .toSorted((a, b) => a.seasonId - b.seasonId);
};

export const abbreviateSeasonRange = (
  season: SeasonsEntry,
  { compact = false } = {},
) => {
  if (compact) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return `'${season.data.startDate.split("-")[0]!.slice(2)}-${season.data.endDate.split("-")[0]!.slice(2)}`;
  }

  return `${season.data.startDate.split("-")[0]} - ${season.data.endDate.split("-")[0]}`;
};

// Team utilities
export const resolveTeamName = (seasonId: number, team: TeamEntry) => {
  if (!team.data.alternativeNames) {
    return team.data.name;
  }

  const altName = team.data.alternativeNames.find(
    (altName) =>
      altName.duration[0] <= seasonId && altName.duration[1] >= seasonId,
  );

  return altName?.name || team.data.name;
};

export const getCurrentTeamLogo = (team: TeamEntry) => {
  // Note: This will need to be updated when we implement the emoji utility
  return team.data.emoji;
};

export const getTeamSeasonLogo = (seasonId: number, team: TeamEntry) => {
  if (!team.data.alternativeNames) {
    return team.data.emoji;
  }

  const altName = team.data.alternativeNames.find(
    (altName) =>
      altName.duration[0] <= seasonId && altName.duration[1] >= seasonId,
  );

  return altName?.logo || team.data.emoji;
};

// Business logic calculations (ported from seasons/index.ts)
export interface TeamRecord {
  l: number;
  w: number;
}

const standardSeason = {
  numGames: 82,
  overUnderCutoff: 36,
  paceTarget: 10,
};

export const shortenedAdjust = ({
  season,
}: {
  season: SeasonsEntry & {
    data: { shortened: NonNullable<SeasonsEntry["data"]["shortened"]> };
  };
}) => ({
  overUnderCutoff: Math.ceil(
    (standardSeason.overUnderCutoff / standardSeason.numGames) *
      season.data.shortened.numGames,
  ),
  paceTarget: Math.round(
    (standardSeason.paceTarget / standardSeason.numGames) *
      season.data.shortened.numGames,
  ),
});

export const getSeasonSurpriseRules = (season: SeasonsEntry) => {
  if (season.data.shortened) {
    return {
      numGames: season.data.shortened.numGames,
      ...shortenedAdjust({ season } as Parameters<typeof shortenedAdjust>[0]),
    };
  }

  return standardSeason;
};

export const formatRecord = (record: TeamRecord) => `${record.w} - ${record.l}`;

export const toSurprise = (
  teamSeason: TeamSeasonEntry,
  season: SeasonsEntry,
) => {
  const surpriseRules = getSeasonSurpriseRules(season);
  return Math.ceil(teamSeason.data.overUnder + surpriseRules.paceTarget);
};

export const currentWinPct = (record: TeamRecord) => {
  const divisor = record.w + record.l;
  return divisor ? record.w / divisor : 0;
};

export const projectedWins = (teamStats: TeamStats, season: SeasonsEntry) => {
  const surpriseRules = getSeasonSurpriseRules(season);
  return Math.floor(surpriseRules.numGames * currentWinPct(teamStats.record));
};

export const isSurprise = (teamStats: TeamStats, season: SeasonsEntry) =>
  teamStats.record.w >= toSurprise(teamStats, season);

export const isEliminated = (teamStats: TeamStats, season: SeasonsEntry) => {
  const { record } = teamStats;
  const surpriseRules = getSeasonSurpriseRules(season);

  return (
    toSurprise(teamStats, season) - record.w >
    surpriseRules.numGames - (record.w + record.l)
  );
};

export const pace = (teamStats: TeamStats, season: SeasonsEntry) =>
  projectedWins(teamStats, season) - toSurprise(teamStats, season);

export const signedFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
});

export const formatPace = (
  teamStats: TeamStats,
  season: SeasonsEntry,
): string => {
  if (teamStats.record.w + teamStats.record.l === 0) {
    return "—";
  }

  return signedFormatter.format(pace(teamStats, season));
};

export const recordRemainingToSurprise = (
  teamStats: TeamStats,
  season: SeasonsEntry,
): TeamRecord => {
  const { record } = teamStats;

  const surpriseRules = getSeasonSurpriseRules(season);
  const winsRemaining = toSurprise(teamStats, season) - record.w;
  const gamesRemaining = surpriseRules.numGames - (record.w + record.l);

  return {
    l: gamesRemaining - winsRemaining,
    w: winsRemaining,
  };
};

// ADDED BY NEED

export const formatGameId = ({
  playedOn,
  teams,
}: {
  playedOn: GameData["playedOn"];
  teams: [TeamCode, TeamCode];
}) => {
  return `${playedOn}/${teams.toSorted((t1, t2) => t1.localeCompare(t2)).join("__")}`;
};
