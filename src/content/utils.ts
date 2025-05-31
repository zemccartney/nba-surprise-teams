import type { CollectionEntry } from "astro:content";

import { getCollection, getEntry } from "astro:content";

export type GameData = CollectionEntry<"games">["data"];
import type { TeamCode } from "../content.config";

import * as Utils from "../utils";

const STANDARD_SEASON = {
  numGames: 82,
  overUnderCutoff: 36,
  paceTarget: 10,
};

export interface LoaderResponse {
  expiresAt?: number;
  games: GameData[];
}

export const getLatestSeason = async () => {
  const seasons = await getCollection("seasons");
  return sortSeasons(seasons)[0];
};

// Based on season ids being years
export const sortSeasons = (
  seasons: CollectionEntry<"seasons">[],
  {
    direction = "desc",
  }: {
    direction?: "asc" | "desc";
  } = {},
) => {
  // parseInt downstream effect of astro not supporting non-string ids for json-loaded content
  // localeCompare would have worked, too, but this felt more intentional(?)
  return seasons.toSorted((a, b) =>
    Number.parseInt((direction === "desc" ? a : b).data.id, 10) >
    Number.parseInt((direction === "desc" ? b : a).data.id, 10)
      ? -1
      : Number.parseInt((direction === "desc" ? a : b).data.id, 10) <
          Number.parseInt((direction === "desc" ? b : a).data.id, 10)
        ? 1
        : 0,
  );
};

export const getTeamsInSeason = async (
  seasonId: CollectionEntry<"seasons">["id"],
): Promise<CollectionEntry<"teams">[]> => {
  const teamSeasons = await getCollection("teamSeasons", ({ data }) => {
    return data.season.id === seasonId;
  });
  const teamIds = new Set(teamSeasons.map((ts) => ts.data.team.id));
  return await getCollection("teams", ({ id }) => teamIds.has(id));
};

export const abbreviateSeasonRange = (
  season: CollectionEntry<"seasons">,
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
export const getArchivedSeasons = async (): Promise<
  CollectionEntry<"seasons">[]
> => {
  const gamesEntries = await getCollection("games");
  const archivedSeasonIds = new Set(
    gamesEntries.map((entry) => entry.data.seasonId),
  );

  const seasons = await getCollection("seasons", ({ id }) => {
    return archivedSeasonIds.has(id);
  });

  return sortSeasons(seasons);
};

export const getSeasonArchive = async (
  seasonId: CollectionEntry<"seasons">["id"],
) => {
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
export const getSeasonSurpriseRules = async (
  seasonId: CollectionEntry<"seasons">["id"],
) => {
  const season = await getEntry("seasons", seasonId);

  if (!season) {
    throw new Error("[getSeasonSurpriseRules] season not found");
  }

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
  team: CollectionEntry<"teams">,
  seasonId: CollectionEntry<"seasons">["id"],
) => {
  if (!team.data.alternativeNames) {
    return team.data.name;
  }

  const altLookup = team.data.alternativeNames.find(
    (altName) =>
      // parseInt downstream effect of astro not supporting non-string ids for json-loaded content
      altName.duration[0] <= Number.parseInt(seasonId, 10) &&
      altName.duration[1] >= Number.parseInt(seasonId, 10),
  );

  return altLookup?.name || team.data.name;
};

export const getCurrentTeamLogo = (teamId: TeamCode) => {
  return Utils.getEmoji(emojiByTeam[teamId]);
};

export const getTeamSeasonLogo = (
  team: CollectionEntry<"teams">,
  seasonId: CollectionEntry<"seasons">["id"],
) => {
  if (!team.data.alternativeNames) {
    return getCurrentTeamLogo(team.data.id);
  }

  const altLookup = team.data.alternativeNames.find(
    (altName) =>
      // parseInt downstream effect of astro not supporting non-string ids for json-loaded content
      altName.duration[0] <= Number.parseInt(seasonId, 10) &&
      altName.duration[1] >= Number.parseInt(seasonId, 10),
  );

  return Utils.getEmoji(altLookup?.logo || emojiByTeam[team.data.id]);
};

export const formatGameId = ({
  playedOn,
  teams,
}: {
  playedOn: GameData["playedOn"];
  teams: [TeamCode, TeamCode];
}) => {
  return `${playedOn}/${teams.toSorted((t1, t2) => t1.localeCompare(t2)).join("__")}`;
};

export const calculateTeamRecord = (
  teamId: CollectionEntry<"teams">["id"],
  games: GameData[],
) => {
  const record = { l: 0, w: 0 };

  for (const game of games) {
    const [teamA, teamZ] = game.teams;

    if (teamA.teamId === teamId || teamZ.teamId === teamId) {
      if (teamId === teamA.teamId) {
        record[teamA.score > teamZ.score ? "w" : "l"] += 1;
      } else if (teamId === teamZ.teamId) {
        record[teamZ.score > teamA.score ? "w" : "l"] += 1;
      }
    }
  }

  return record;
};

export const formatRecord = (record: ReturnType<typeof calculateTeamRecord>) =>
  `${record.w} - ${record.l}`;

export const currentWinPct = (
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const divisor = record.w + record.l;
  return divisor ? record.w / divisor : 0;
};

export const projectedWins = async (
  seasonId: CollectionEntry<"seasons">["id"],
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const surpriseRules = await getSeasonSurpriseRules(seasonId);
  return Math.floor(surpriseRules.numGames * currentWinPct(record)); // Math.floor = partial wins don't count, need to absolutely exceed
};

export const pace = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) =>
  (await projectedWins(teamSeason.data.season.id, record)) -
  (await winsRemainingToSurprise(teamSeason));

export const winsRemainingToSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);
  return Math.ceil(teamSeason.data.overUnder + surpriseRules.paceTarget); // ceil b/c all over unders are either integers or end in 0.5 (so round up)
};

export const isSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => record.w >= (await winsRemainingToSurprise(teamSeason));

export const isEliminated = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);

  // number of wins team still needs is greater than the number of games they have left
  return (
    (await winsRemainingToSurprise(teamSeason)) - record.w >
    surpriseRules.numGames - (record.w + record.l)
  );
};

export const recordRemainingToSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);
  const winsRemaining = (await winsRemainingToSurprise(teamSeason)) - record.w;
  const gamesRemaining = surpriseRules.numGames - (record.w + record.l);

  return {
    l: gamesRemaining - winsRemaining,
    w: winsRemaining,
  };
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

// convenience
export { TEAM_CODES } from "../content.config";
export type { TeamCode } from "../content.config";
