import type { Metadata, Season, Team, TeamSeason } from "./model";

/**
Metadata only. Safe in prerender, server islands and actions; never stores games.
*/
export interface Catalog {
  getLatestSeason(): Season;
  getSeason(id: string): Season | undefined;
  getSeasons(): Season[];
  getTeam(id: string): Team | undefined;
  getTeams(): Team[];
  getTeamSeason(seasonId: string, teamId: string): TeamSeason | undefined;
  getTeamSeasons(seasonId?: string): TeamSeason[];
  requireSeason(id: string): Season;
  requireTeam(id: string): Team;
  requireTeamSeason(seasonId: string, teamId: string): TeamSeason;
}
export function metadataCatalog(metadata: Metadata): Catalog {
  const seasons = new Map(metadata.seasons.map((row) => [row.id, row]));
  const teams = new Map<string, Team>(
    metadata.teams.map((row) => [row.id, row]),
  );
  const teamSeasons = new Map(metadata.teamSeasons.map((row) => [row.id, row]));
  const latest = metadata.seasons.toSorted((a, b) =>
    b.startDate.localeCompare(a.startDate),
  )[0];
  if (!latest) throw new Error("Metadata has no seasons");
  const requireValue = <T>(value: T | undefined, identity: string): T => {
    if (value === undefined) throw new Error(`Unknown ${identity}`);
    return value;
  };
  return {
    getLatestSeason: () => latest,
    getSeason: (id) => seasons.get(id),
    getSeasons: () => [...metadata.seasons],
    getTeam: (id) => teams.get(id),
    getTeams: () => [...metadata.teams],
    getTeamSeason: (seasonId, teamId) =>
      teamSeasons.get(`${seasonId}/${teamId}`),
    getTeamSeasons: (seasonId) =>
      metadata.teamSeasons.filter(
        (row) => seasonId === undefined || row.seasonId === seasonId,
      ),
    requireSeason: (id) => requireValue(seasons.get(id), `season ${id}`),
    requireTeam: (id) => requireValue(teams.get(id), `team ${id}`),
    requireTeamSeason: (seasonId, teamId) =>
      requireValue(
        teamSeasons.get(`${seasonId}/${teamId}`),
        `team season ${seasonId}/${teamId}`,
      ),
  };
}
