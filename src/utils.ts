import resolveConfig from "tailwindcss/resolveConfig";
import tailwindConfig from "../tailwind.config.mjs";
import type { TeamSeason } from "./data";

/*
    Returns an ISO String representing the current time in the US Eastern timezone
    Useful for date comparisons given the NBA scheduling data is all relative to that timezone

    https://community.cloudflare.com/t/cf-worker-determine-time-of-day-timezone/179405
    https://cloudflareworkers.com/?&_ga=2.210309013.1661354319.1590399175-1e120377e5869563dd571ab6d3c69695#b2ce644441c28d716a5886203bf6fe76:https://tutorial.Cloudflareworkers.com
*/
export const getCurrentDateEastern = () => {
  const d = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  // Coerce the date string with correct timezone back into a date
  return new Date(d).toISOString();
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
  Math.floor(82 * currentWinPct(record)); // TODO Is floor correct here? I think we want to take a pessimistic view here?

export const isSurprise = (team: TeamStats) => team.w >= toSurprise(team);

export const isEliminated = (team: TeamStats) =>
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
