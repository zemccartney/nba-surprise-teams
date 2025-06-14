import type { CollectionEntry } from "astro:content";

import { getCollection, getEntry } from "astro:content";

export type GameData = CollectionEntry<"games">["data"];
import type { TeamCode } from "./content.config";

import { TEAM_CODES } from "./content.config";
import * as Utils from "./utils";

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
// start/end date technically more accurate, but this is fine, easier to read,
// data validity enforced by tests
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

// Disambiguate team name in cases of the same team id being associated with multiple different teams over time,
// as opposed to multiple, different team ids representing the same team entity over time e.g. memphis and vancouver grizzlies
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

export const getTeamLogo = (teamId: TeamCode) => {
  return Utils.getEmoji(emojiByTeam[teamId]);
};

// Disambiguate team logo in cases of the same team id being associated with multiple different teams over time,
// as opposed to multiple, different team ids representing the same team entity over time e.g. memphis and vancouver grizzlies
export const getTeamSeasonLogo = async (
  team: CollectionEntry<"teams">,
  seasonId: CollectionEntry<"seasons">["id"],
) => {
  if (!team.data.alternativeNames) {
    return getTeamLogo(team.data.id);
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
  (await winsToSurprise(teamSeason));

export const winsToSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);
  return Math.ceil(teamSeason.data.overUnder + surpriseRules.paceTarget); // ceil b/c all over unders are either integers or end in 0.5 (so round up)
};

export const isSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => record.w >= (await winsToSurprise(teamSeason));

export const isEliminated = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);

  // number of wins team still needs is greater than the number of games they have left
  return (
    (await winsToSurprise(teamSeason)) - record.w >
    surpriseRules.numGames - (record.w + record.l)
  );
};

export const recordRemainingToSurprise = async (
  teamSeason: CollectionEntry<"teamSeasons">,
  record: ReturnType<typeof calculateTeamRecord>,
) => {
  const surpriseRules = await getSeasonSurpriseRules(teamSeason.data.season.id);
  const winsRemaining = (await winsToSurprise(teamSeason)) - record.w;
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

export const getTeamHistory = async (teamId: TeamCode) => {
  if ([TEAM_CODES.BKN, TEAM_CODES.NJN].includes(teamId)) {
    const [brooklyn, newJersey] = await Promise.all(
      [TEAM_CODES.BKN, TEAM_CODES.NJN].map((tc) => getEntry("teams", tc)),
    );

    return [
      {
        duration: [1977, 2011],
        logo: emojiByTeam[TEAM_CODES.NJN],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: brooklyn!.data.name,
        teamId: TEAM_CODES.NJN,
      },
      {
        duration: [2012],
        logo: emojiByTeam[TEAM_CODES.BKN],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: newJersey!.data.name,
        teamId: TEAM_CODES.BKN,
      },
    ];
  }

  if ([TEAM_CODES.OKC, TEAM_CODES.SEA].includes(teamId)) {
    const [sonics, thunder] = await Promise.all(
      [TEAM_CODES.SEA, TEAM_CODES.OKC].map((tc) => getEntry("teams", tc)),
    );

    return [
      {
        duration: [1967, 2007],
        logo: emojiByTeam[TEAM_CODES.SEA],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: sonics!.data.name,
        teamId: TEAM_CODES.SEA,
      },
      {
        duration: [2008],
        logo: emojiByTeam[TEAM_CODES.OKC],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: thunder!.data.name,
        teamId: TEAM_CODES.OKC,
      },
    ];
  }

  if ([TEAM_CODES.MEM, TEAM_CODES.VAN].includes(teamId)) {
    const [memphis, vancouver] = await Promise.all(
      [TEAM_CODES.MEM, TEAM_CODES.VAN].map((tc) => getEntry("teams", tc)),
    );

    return [
      {
        duration: [1995, 2000],
        logo: emojiByTeam[TEAM_CODES.VAN],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: vancouver!.data.name,
        teamId: TEAM_CODES.VAN,
      },
      {
        duration: [2001],
        logo: emojiByTeam[TEAM_CODES.MEM],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: memphis!.data.name,
        teamId: TEAM_CODES.MEM,
      },
    ];
  }

  if (teamId === TEAM_CODES.CHA) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hornets = (await getEntry("teams", teamId))!;

    return [
      {
        duration: [1988, 2001],
        logo: emojiByTeam[TEAM_CODES.CHA],
        name: hornets.data.name,
        teamId: TEAM_CODES.CHA,
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...hornets.data.alternativeNames![0]!, teamId: TEAM_CODES.CHA },
      {
        duration: [2014],
        logo: emojiByTeam[TEAM_CODES.CHA],
        name: hornets.data.name,
        teamId: TEAM_CODES.CHA,
      },
    ];
  }

  if (teamId === TEAM_CODES.WAS) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const wizards = (await getEntry("teams", teamId))!;

    return [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      { ...wizards.data.alternativeNames![0]!, teamId: TEAM_CODES.WAS },
      {
        duration: [1997],
        logo: emojiByTeam[TEAM_CODES.WAS],
        name: wizards.data.name,
        teamId: TEAM_CODES.WAS,
      },
    ];
  }

  if ([TEAM_CODES.NOH, TEAM_CODES.NOK, TEAM_CODES.NOP].includes(teamId)) {
    const [nola, okc, pelicans] = await Promise.all(
      [TEAM_CODES.NOH, TEAM_CODES.NOK, TEAM_CODES.NOP].map((tc) =>
        getEntry("teams", tc),
      ),
    );

    return [
      {
        duration: [2002, 2004],
        logo: emojiByTeam[TEAM_CODES.NOH],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: nola!.data.name,
        teamId: TEAM_CODES.NOH,
      },
      {
        duration: [2005, 2006],
        logo: emojiByTeam[TEAM_CODES.NOK],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: okc!.data.name,
        teamId: TEAM_CODES.NOK,
      },
      {
        duration: [2007, 2012],
        logo: emojiByTeam[TEAM_CODES.NOH],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: nola!.data.name,
        teamId: TEAM_CODES.NOH,
      },
      {
        duration: [2013],
        logo: emojiByTeam[TEAM_CODES.NOP],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: pelicans!.data.name,
        teamId: TEAM_CODES.NOP,
      },
    ];
  }

  return false;
};

// convenience
export { TEAM_CODES } from "./content.config";
export type { TeamCode } from "./content.config";
