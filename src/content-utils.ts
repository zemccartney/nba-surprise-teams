import { catalog } from "virtual:tracker/catalog";

import type { Game, Season, Team, TeamSeason } from "./data/model";

import { projectWins, rulesForSeason, surpriseWins } from "./data/rules";
import { TEAM_CODES, type TeamCode } from "./loaders/live/utils";
import * as Utils from "./utils";
export {
  TEAM_CODES,
  type TeamCode,
  teamCodeSchema,
} from "./loaders/live/utils";
export type GameData = Game;
export interface LoaderResponse {
  expiresAt?: number;
  games: Game[];
}

export const getLatestSeason = () => catalog.getLatestSeason();
export const sortSeasons = (
  seasons: Season[],
  { direction = "desc" }: { direction?: "asc" | "desc" } = {},
) =>
  seasons.toSorted((a, b) =>
    direction === "desc" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id),
  );
export const getTeamsInSeason = (seasonId: string): Team[] => {
  const ids = new Set(
    catalog.getTeamSeasons(seasonId).map((row) => row.teamId),
  );
  return catalog.getTeams().filter((team) => ids.has(team.id));
};
export const abbreviateSeasonRange = (
  season: Season,
  { compact = false } = {},
) =>
  compact
    ? `'${season.startDate.slice(2, 4)}-${season.endDate.slice(2, 4)}`
    : `${season.startDate.slice(0, 4)} - ${season.endDate.slice(0, 4)}`;
export const getSeasonSurpriseRules = (seasonId: string) =>
  rulesForSeason(catalog.requireSeason(seasonId));
export const resolveTeamName = (team: Team, seasonId: string) =>
  team.alternativeNames?.find(
    (name) =>
      name.duration[0] <= Number(seasonId) &&
      name.duration[1] >= Number(seasonId),
  )?.name || team.name;
export const getTeamLogo = (teamId: TeamCode) =>
  Utils.getEmoji(catalog.requireTeam(teamId).emoji);
export const getTeamSeasonLogo = (team: Team, seasonId: string) => {
  const name = team.alternativeNames?.find(
    (entry) =>
      entry.duration[0] <= Number(seasonId) &&
      entry.duration[1] >= Number(seasonId),
  );
  return Utils.getEmoji(name?.logo || team.emoji);
};
export const formatGameId = ({
  playedOn,
  teams,
}: {
  playedOn: string;
  teams: [TeamCode, TeamCode];
}) => `${playedOn}/${teams.toSorted((a, b) => a.localeCompare(b)).join("__")}`;
export const calculateTeamRecord = (teamId: string, games: Game[]) => {
  const record = { l: 0, w: 0 };
  for (const game of games) {
    const [a, b] = game.teams;
    if (a.teamId === teamId) record[a.score > b.score ? "w" : "l"] += 1;
    else if (b.teamId === teamId) record[b.score > a.score ? "w" : "l"] += 1;
  }
  return record;
};
type Record = ReturnType<typeof calculateTeamRecord>;
export const formatRecord = (record: Record) => `${record.w} - ${record.l}`;
export const currentWinPct = ({ l, w }: Record) => (w + l ? w / (w + l) : 0);
export const projectedWins = (seasonId: string, record: Record) =>
  projectWins(getSeasonSurpriseRules(seasonId), record);
export const winsToSurprise = (teamSeason: TeamSeason) =>
  surpriseWins(
    getSeasonSurpriseRules(teamSeason.seasonId),
    teamSeason.overUnder,
  );
export const pace = (teamSeason: TeamSeason, record: Record) =>
  projectedWins(teamSeason.seasonId, record) - winsToSurprise(teamSeason);
export const isSurprise = (teamSeason: TeamSeason, record: Record) =>
  record.w >= winsToSurprise(teamSeason);
export const recordRemainingToSurprise = (
  teamSeason: TeamSeason,
  record: Record,
) => {
  const winsRemaining = winsToSurprise(teamSeason) - record.w;
  return {
    l:
      getSeasonSurpriseRules(teamSeason.seasonId).numGames -
      record.w -
      record.l -
      winsRemaining,
    w: winsRemaining,
  };
};
export const isEliminated = (teamSeason: TeamSeason, record: Record) =>
  recordRemainingToSurprise(teamSeason, record).l < 0;

export const getTeamHistory = (teamId: TeamCode) => {
  const entry = (id: TeamCode, duration: number[]) => ({
    duration,
    logo: catalog.requireTeam(id).emoji,
    name: catalog.requireTeam(id).name,
    teamId: id,
  });
  if ([TEAM_CODES.BKN, TEAM_CODES.NJN].includes(teamId))
    return [entry("NJN", [1977, 2011]), entry("BKN", [2012])];
  if ([TEAM_CODES.OKC, TEAM_CODES.SEA].includes(teamId))
    return [entry("SEA", [1967, 2007]), entry("OKC", [2008])];
  if ([TEAM_CODES.MEM, TEAM_CODES.VAN].includes(teamId))
    return [entry("VAN", [1995, 2000]), entry("MEM", [2001])];
  if (teamId === "CHA" || teamId === "WAS") {
    const alternative = catalog.requireTeam(teamId).alternativeNames?.[0];
    if (!alternative) throw new Error(`Missing historical name for ${teamId}`);
    const old = { ...alternative, teamId };
    return teamId === "CHA"
      ? [entry("CHA", [1988, 2001]), old, entry("CHA", [2014])]
      : [old, entry("WAS", [1997])];
  }
  if ([TEAM_CODES.NOH, TEAM_CODES.NOK, TEAM_CODES.NOP].includes(teamId))
    return [
      entry("NOH", [2002, 2004]),
      entry("NOK", [2005, 2006]),
      entry("NOH", [2007, 2012]),
      entry("NOP", [2013]),
    ];
  return false;
};
