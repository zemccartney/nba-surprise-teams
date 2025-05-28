import type { CollectionEntry } from "astro:content";

import { getCollection, getEntry } from "astro:content";

export type GameData = GameEntry["data"];
export type GameEntry = CollectionEntry<"games">;
// TODO Explain
export interface SeasonsEntry extends Omit<CollectionEntry<"seasons">, "id"> {
  id: number;
}

import type { TeamCode as _TeamCode } from "../content.config";

import * as Utils from "../utils";

export type TeamCode = _TeamCode; // convenience
export interface TeamEntry extends Omit<CollectionEntry<"teams">, "id"> {
  id: TeamCode;
}
export type TeamSeasonEntry = CollectionEntry<"teamSeasons">;

const STANDARD_SEASON = {
  numGames: 82,
  overUnderCutoff: 36,
  paceTarget: 10,
};

// TODO Explain
export const getSeasonById = async (id: SeasonsEntry["id"]) => {
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
  const seasons = await getCollection(
    "seasons",
    ({ id, ...rest }) =>
      console.log({ id }, typeof id, "GETTING SEASONS") ||
      filter?.({ id: id as unknown as number, ...rest }),
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

export const getTeamById = async (id: TeamEntry["id"]) => {
  const team = await getEntry("teams", id);
  return {
    ...team,
    id: id as TeamCode,
  } as TeamEntry;
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

export const getTeamsInSeason = async (
  seasonId: SeasonsEntry["id"],
): Promise<TeamEntry[]> => {
  const teamSeasons = await getCollection("teamSeasons", ({ data }) => {
    return data.seasonId.id === seasonId;
  });
  const teamIds = new Set(teamSeasons.map((ts) => ts.data.teamId));
  return await getTeams(({ id }) => teamIds.has(id));
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

// archiving: games are present only in complete sets, only for complete seasons
// so, this query assumes games are present only if a season is over and we've archived games
// data from our live loader system
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

export const getSeasonArchive = async (seasonId: SeasonsEntry["id"]) => {
  const gamesEntries = await getCollection("games", ({ data }) => {
    return data.seasonId === seasonId;
  });

  if (!gamesEntries || gamesEntries.length === 0) {
    return;
  }

  return gamesEntries;
};

/*
TODO Revisit thinking on calculations here if ever comes up

Actual results given seasons:

2020: { overUnderCutoff: 32, paceTarget: 9 }
2011: { overUnderCutoff: 29, paceTarget: 8 }

*/
export const getSeasonSurpriseRules = async (season: SeasonsEntry) => {
  if (season.data.shortened) {
    return {
      numGames: season.data.shortened.numGames,
      // O/Us are always half numbers, so results are always decisive, as there are no half wins or losses
      // so, O/U here should be a whole number to definitively boundary teams (no team can match cut-off, so no ambiguity)
      // round up O/U as no partial wins, achievement means full win to get to nearest ceil int
      overUnderCutoff: Math.ceil(
        (STANDARD_SEASON.overUnderCutoff / STANDARD_SEASON.numGames) *
          season.data.shortened.numGames,
      ),
      // Math.round is semi-random here. Really, wanted 2011 and 2020
      // to have different results, given significantly different numGames
      // Math.ceil would have resulted in 9 for both. Hopefully don't have
      // more cases to review this against anytime soon
      paceTarget: Math.round(
        (STANDARD_SEASON.paceTarget / STANDARD_SEASON.numGames) *
          season.data.shortened.numGames,
      ),
    };
  }

  return STANDARD_SEASON;
};

export const resolveTeamName = (
  team: TeamEntry,
  seasonId: SeasonsEntry["id"],
) => {
  if (!team.data.alternativeNames) {
    return team.data.name;
  }

  const altLookup = team.data.alternativeNames.find(
    (altName) =>
      altName.duration[0] <= seasonId && altName.duration[1] >= seasonId,
  );

  return altLookup?.name || team.data.name;
};

export const getCurrentTeamLogo = (teamId: TeamCode) => {
  return Utils.getEmoji(emojiByTeam[teamId]);
};

export const getTeamSeasonLogo = (
  team: TeamEntry,
  seasonId: SeasonsEntry["id"],
) => {
  if (!team.data.alternativeNames) {
    return getCurrentTeamLogo(team.data.id);
  }

  const altLookup = team.data.alternativeNames.find(
    (altName) =>
      altName.duration[0] <= seasonId && altName.duration[1] >= seasonId,
  );

  return Utils.getEmoji(altLookup?.logo || emojiByTeam[team.data.id]);
};

export const emojiByTeam: Record<TeamCode, string> = {
  ATL: "feather",
  BKN: "dragon",
  BOS: "shamrock",
  CHA: "hornet", // honeybee emoji, re-colored
  CHI: "bull", // ox emoji, re-colored
  CLE: "whammer", // https://sportsmascots.fandom.com/wiki/Whammer_(Cleveland_Cavaliers)
  DAL: "mav",
  DEN: "nuggets",
  DET: "piston",
  GSW: "warriors",
  HOU: "rocket",
  IND: "pacer",
  LAC: "clipper",
  LAL: "giraffe",
  MEM: "grizzly",
  MIA: "heat",
  MIL: "deer",
  MIN: "wolf",
  NJN: "nets",
  NOH: "fleur-de-hornet",
  NOK: "fleur-de-hornet",
  NOP: "king-cake-baby",
  NYK: "tophat",
  OKC: "bison",
  ORL: "magic",
  PHI: "bell",
  PHX: "sun",
  POR: "hiking-boot",
  SAC: "crown",
  SAS: "bat",
  SEA: "space-needle",
  TOR: "raptor", // t-rex emoji, re-colored
  UTA: "saxophone",
  VAN: "bear",
  WAS: "wizard", // mage emoji, re-colored
};

export { TEAM_CODES } from "../content.config";
