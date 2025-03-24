import type {
  Game,
  Season,
  SeasonData,
  SeasonId,
  TeamCode,
  TeamRecord,
  TeamSeason,
  TeamStats,
} from "../types.ts";

import * as Utils from "../../utils.ts";
import * as TeamUtils from "../teams.ts";
import _1993 from "./1993/data.ts";
import _1996 from "./1996/data.ts";
import _1997 from "./1997/data.ts";
import _1999 from "./1999/data.ts";
import _2000 from "./2000/data.ts";
import _2001 from "./2001/data.ts";
import _2002 from "./2002/data.ts";
import _2003 from "./2003/data.ts";
import _2004 from "./2004/data.ts";
import _2005 from "./2005/data.ts";
import _2006 from "./2006/data.ts";
import _2007 from "./2007/data.ts";
import _2008 from "./2008/data.ts";
import _2009 from "./2009/data.ts";
import _2010 from "./2010/data.ts";
import _2011 from "./2011/data.ts";
import _2012 from "./2012/data.ts";
import _2013 from "./2013/data.ts";
import _2014 from "./2014/data.ts";
import _2015 from "./2015/data.ts";
import _2016 from "./2016/data.ts";
import _2017 from "./2017/data.ts";
import _2018 from "./2018/data.ts";
import _2020 from "./2020/data.ts";
import _2021 from "./2021/data.ts";
import _2022 from "./2022/data.ts";
import _2023 from "./2023/data.ts";
import _2024 from "./2024/data.ts";

const normalized = Utils.deepFreeze({
  [_1993.id]: _1993,
  [_1996.id]: _1996,
  [_1997.id]: _1997,
  [_1999.id]: _1999,
  [_2000.id]: _2000,
  [_2001.id]: _2001,
  [_2002.id]: _2002,
  [_2003.id]: _2003,
  [_2004.id]: _2004,
  [_2005.id]: _2005,
  [_2006.id]: _2006,
  [_2007.id]: _2007,
  [_2008.id]: _2008,
  [_2009.id]: _2009,
  [_2010.id]: _2010,
  [_2011.id]: _2011,
  [_2012.id]: _2012,
  [_2013.id]: _2013,
  [_2014.id]: _2014,
  [_2015.id]: _2015,
  [_2016.id]: _2016,
  [_2017.id]: _2017,
  [_2018.id]: _2018,
  [_2020.id]: _2020,
  [_2021.id]: _2021,
  [_2022.id]: _2022,
  [_2023.id]: _2023,
  [_2024.id]: _2024,
} satisfies Record<SeasonId, SeasonData>);

export const getSeasonById = (id: SeasonId) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { teams, ...season } = normalized[id];
  return season as Season;
};

export const getLatestSeason = () => {
  return getAllSeasons().toSorted((a, b) =>
    a.endDate > b.endDate ? -1 : a.endDate < b.endDate ? 1 : 0,
  )[0];
};

// TODO Figure out how to narrow to teams by given season id? Try repomix, through entire app into Claude, point at specific context?
export const getTeamsInSeason = (id: SeasonId) =>
  Object.values(normalized[id].teams).map((ts) =>
    TeamUtils.getTeamById(ts.teamId),
  );

export const getTeamSeason = (
  seasonId: SeasonId,
  teamId: TeamCode,
  // TODO TS should flag error if teamId not present in a season's candidates e.g. getTeamSeason(2024, "BOS");
  // @ts-expect-error: "Element implicitly has an 'any' type because expression of type 'TeamCode' can't be used to index type"
): TeamSeason => normalized[seasonId].teams[teamId];

export const getTeamSeasonsBySeason = (seasonId: SeasonId) =>
  Object.values(normalized[seasonId].teams) as TeamSeason[];

export const getAllSeasons = () =>
  Object.values(normalized).map((seasonData) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { teams, ...season } = seasonData;
    return season;
  });

export const getAllTeamSeasons = () => {
  const ts = [];

  for (const seasonData of Object.values(normalized)) {
    ts.push(...Object.values(seasonData.teams));
  }

  return ts;
};

export const abbreviateSeasonRange = (
  season: Season,
  { compact = false } = {},
) => {
  if (compact) {
    // @ts-expect-error: Object is possibly 'undefined' ; taking for granted that all registered seasons have dates set as YYYY-MM-DD
    return `'${season.startDate.split("-")[0].slice(2)}-${season.endDate.split("-")[0].slice(2)}`;
  }

  return `${season.startDate.split("-")[0]} - ${season.endDate.split("-")[0]}`;
};

export const sortSeasonsByDate = (
  seasons: Season[],
  {
    direction = "desc",
    orderBy = "endDate",
  }: {
    direction?: "asc" | "desc";
    orderBy?: "endDate" | "startDate";
  } = {},
) => {
  return seasons.toSorted((a, b) =>
    (direction === "desc" ? a : b)[orderBy] >
    (direction === "desc" ? b : a)[orderBy]
      ? -1
      : (direction === "desc" ? a : b)[orderBy] <
          (direction === "desc" ? b : a)[orderBy]
        ? 1
        : 0,
  );
};

export const getSeasonArchive = async (seasonId: SeasonId) => {
  // TODO Could use node fs here, given, by convention only, would want
  // to enforce in code somehow, never running on-demand, only at build time?
  // though would then be bundled, causing some sort of missing ref issues, i think?

  try {
    // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
    const { default: games } = await import(`./${seasonId}/games.json`);
    return games as Game[];
  } catch {
    // TODO Possible to identify module lookup errors specifically? Message Error: Unknown variable dynamic import
    // no data
    return false;
  }
};

export const getArchivedSeasons = async () => {
  const checkSeasonData = await Promise.all(
    getAllSeasons().map(async (season) => {
      const archive = await getSeasonArchive(season.id);
      return archive ? season : false;
    }),
  );

  return sortSeasonsByDate(checkSeasonData.filter(Boolean));
};

export const getCompleteDataset = async () => {
  const seasonGames = await Promise.all(
    getAllSeasons().map((season) => getSeasonArchive(season.id)),
  );

  return seasonGames
    .filter(Boolean)
    .flat()
    .toSorted((a, b) => a.seasonId - b.seasonId);
};

const standardSeason = {
  numGames: 82,
  overUnderCutoff: 36,
  paceTarget: 10,
};

/*
TODO Revisit thinking on calculations here if ever comes up

Actual results given seasons:

2020: { overUnderCutoff: 32, paceTarget: 9 }
2011: { overUnderCutoff: 29, paceTarget: 8 }

*/
export const shortenedAdjust = ({
  season,
}: {
  season: Required<Pick<Season, "shortened">> & Season;
}) => ({
  // O/Us are always half numbers, so results are always decisive, as there are no half wins or losses
  // so, O/U here should be a whole number to definitively boundary teams (no team can match cut-off, so no ambiguity)
  // round up O/U as no partial wins, achievement means full win to get to nearest ceil int
  overUnderCutoff: Math.ceil(
    (standardSeason.overUnderCutoff / standardSeason.numGames) *
      season.shortened.numGames,
  ),
  // Math.round is semi-random here. Really, wanted 2011 and 2020
  // to have different results, given significantly different numGames
  // Math.ceil would have resulted in 9 for both. Hopefully don't have
  // more cases to review this against anytime soon
  paceTarget: Math.round(
    (standardSeason.paceTarget / standardSeason.numGames) *
      season.shortened.numGames,
  ),
});

export const getSeasonSurpriseRules = (seasonId: SeasonId) => {
  const season = getSeasonById(seasonId);

  if (season.shortened) {
    return {
      numGames: season.shortened.numGames,
      ...shortenedAdjust({ season } as Parameters<typeof shortenedAdjust>[0]),
    };
  }

  return standardSeason;
};

export const formatGameId = ({
  playedOn,
  teams,
}: {
  playedOn: Game["playedOn"];
  teams: [TeamCode, TeamCode];
}) => {
  return `${playedOn}/${teams.toSorted((t1, t2) => t1.localeCompare(t2)).join("__")}`;
};

export const formatRecord = (record: TeamRecord) => `${record.w} - ${record.l}`;

export const toSurprise = (teamSeason: TeamSeason) => {
  const surpriseRules = getSeasonSurpriseRules(teamSeason.seasonId);
  return Math.ceil(teamSeason.overUnder + surpriseRules.paceTarget); // ceil b/c all over unders are either integers or end in 0.5 (so round up)
};

export const currentWinPct = (record: TeamRecord) => {
  const divisor = record.w + record.l;
  return divisor ? record.w / divisor : 0;
};

export const projectedWins = (teamStats: TeamStats) => {
  const surpriseRules = getSeasonSurpriseRules(teamStats.seasonId);
  return Math.floor(surpriseRules.numGames * currentWinPct(teamStats.record)); // Math.floor = partial wins don't count, need to absolutely exceed
};

export const isSurprise = (teamStats: TeamStats) =>
  teamStats.record.w >= toSurprise(teamStats);

export const isEliminated = (teamStats: TeamStats) => {
  const { record, seasonId } = teamStats;
  const surpriseRules = getSeasonSurpriseRules(seasonId);

  // number of wins team still needs is greater than the number of games they have left
  return (
    toSurprise(teamStats) - record.w >
    surpriseRules.numGames - (record.w + record.l)
  );
};

export const pace = (teamStats: TeamStats) =>
  projectedWins(teamStats) - toSurprise(teamStats);

export const signedFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
});

export const formatPace = (teamStats: TeamStats): string => {
  if (teamStats.record.w + teamStats.record.l === 0) {
    return "—";
  }

  return signedFormatter.format(pace(teamStats));
};

export const recordRemainingToSurprise = (teamStats: TeamStats): TeamRecord => {
  const { record, seasonId } = teamStats;

  const surpriseRules = getSeasonSurpriseRules(seasonId);
  const winsRemaining = toSurprise(teamStats) - record.w;
  const gamesRemaining = surpriseRules.numGames - (record.w + record.l);

  return {
    l: gamesRemaining - winsRemaining,
    w: winsRemaining,
  };
};
