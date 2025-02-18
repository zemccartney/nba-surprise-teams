import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../tailwind.config.mjs";
import { SEASONS } from "./data";
import type { Season, TeamSeason } from "./data";

const easternFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/*
  Given the current datetime in the system timezone, return the current date, formatted as YYYY-MM-DD, 
  in the US Eastern timezone. Useful for date comparisons given the NBA scheduling data is all relative to that timezone

  https://community.cloudflare.com/t/cf-worker-determine-time-of-day-timezone/179405
*/
export const getCurrentEasternYYYYMMDD = () => {
  const parts = easternFormatter.formatToParts(new Date()); // e.g. array representing 03/02/2025

  // formatter should guarantee these parts exist
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const day = parts.find((p) => p.type === "day")!;
  const month = parts.find((p) => p.type === "month")!;
  const year = parts.find((p) => p.type === "year")!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  return `${year.value}-${month.value}-${day.value}`;
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
  seasons: typeof SEASONS,
  {
    orderBy = "endDate",
    direction = "desc",
  }: {
    orderBy?: "startDate" | "endDate";
    direction?: "asc" | "desc";
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

export const getArchivedSeasons = async () => {
  const checkSeasonData = await Promise.all(
    SEASONS.map(async (season) => {
      try {
        // file extension needed on dynamic import per https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
        await import(`./data/seasons/${season.id}/games.json`);
        return season;
      } catch {
        return false;
      }
    }),
  );

  return sortSeasonsByDate(checkSeasonData.filter(Boolean));
};

export const getTheme = () => resolveConfig(tailwindConfig).theme;

// TeamRecord and TeamStats are utility types, conventions for formatting game data and coalescing w/ team / season
// data to facilitate common calculations
export interface TeamRecord {
  w: number;
  l: number;
}

export type TeamStats = Pick<TeamSeason, "overUnder"> & TeamRecord;

export const displayRecord = (record: TeamRecord) =>
  `${record.w} - ${record.l}`;

export const toSurprise = (seasonData: Pick<TeamSeason, "overUnder">) =>
  Math.ceil(seasonData.overUnder + 10); // ceil b/c all over unders are either integers or end in 0.5 (so round up)

export const currentWinPct = (record: TeamRecord) =>
  record.w / (record.w + record.l);

export const projectedWins = (record: TeamRecord) =>
  Math.floor(82 * currentWinPct(record)); // Math.floor = partial wins don't count, need to absolutely exceed

export const isSurprise = (team: TeamStats) => team.w >= toSurprise(team);

export const isEliminated = (team: TeamStats) =>
  // number of wins team still needs is greater than the number of games they have left
  toSurprise(team) - team.w > 82 - (team.w + team.l);

export const pace = (team: TeamStats) => {
  return projectedWins(team) - toSurprise(team);
};

export const displayPace = (paceVal: ReturnType<typeof pace>): string => {
  const fmt = new Intl.NumberFormat("en-US", {
    signDisplay: "always",
  });

  return fmt.format(paceVal);
};

export const recordRemainingToSurprise = (
  team: TeamStats,
): TeamRecord | boolean => {
  if (isEliminated(team)) {
    return false;
  }

  if (isSurprise(team)) {
    return true;
  }

  const winsRemaining = toSurprise(team) - team.w;
  const gamesRemaining = 82 - (team.w + team.l);

  return {
    w: winsRemaining,
    l: gamesRemaining - winsRemaining,
  };
};

export const minToMs = (min: number) => min * 60 * 1000;
