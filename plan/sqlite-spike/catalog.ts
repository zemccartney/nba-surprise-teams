export interface Catalog {
  getLatestSeason(): Season;
  getSeason(id: string): Season | undefined;
  getTeam(id: string): Team | undefined;
  getTeamSeason(seasonId: string, teamId: string): TeamSeason | undefined;
}
export interface Game {
  id: string;
  playedOn: string;
  seasonId: string;
  teams: [{ score: number; teamId: string }, { score: number; teamId: string }];
}
export interface Metadata {
  seasons: Season[];
  teams: Team[];
  teamSeasons: TeamSeason[];
}
export interface Season {
  endDate: string;
  episodeDate?: string;
  episodeTitle?: string;
  episodeUrl?: string;
  id: string;
  shortened?: { numGames: number; reason: string };
  startDate: string;
}
// Plain domain records shared by the SQLite reader and embedded Worker catalog.
// No Astro collection entries, runtime imports, filesystem access or SQL here.
export interface Team {
  alternativeNames?: {
    duration: [number, number];
    logo: string;
    name: string;
  }[];
  emoji: string;
  id: string;
  name: string;
}
export interface TeamSeason {
  overUnder: number;
  seasonId: string;
  teamId: string;
}
export function embeddedCatalog(metadata: Metadata): Catalog {
  const teams = new Map(metadata.teams.map((team) => [team.id, team]));
  const seasons = new Map(
    metadata.seasons.map((season) => [season.id, season]),
  );
  const teamSeasons = new Map(
    metadata.teamSeasons.map((entry) => [
      `${entry.seasonId}/${entry.teamId}`,
      entry,
    ]),
  );
  const latest = metadata.seasons.toSorted((a, b) =>
    b.startDate.localeCompare(a.startDate),
  )[0];
  if (!latest) throw new Error("Catalog has no seasons");
  return {
    getLatestSeason: () => latest,
    getSeason: (id) => seasons.get(id),
    getTeam: (id) => teams.get(id),
    getTeamSeason: (seasonId, teamId) =>
      teamSeasons.get(`${seasonId}/${teamId}`),
  };
}

export function paceView(
  catalog: Catalog,
  seasonId: string,
  teamId: string,
  games: Game[],
) {
  const season = catalog.getSeason(seasonId);
  const team = catalog.getTeam(teamId);
  const teamSeason = catalog.getTeamSeason(seasonId, teamId);
  if (!season || !team || !teamSeason)
    throw new Error(`Unknown team season ${seasonId}/${teamId}`);
  const numGames = season.shortened?.numGames ?? 82;
  const surpriseRules = {
    numGames,
    overUnderCutoff: season.shortened ? Math.ceil((36 / 82) * numGames) : 36,
    paceTarget: season.shortened ? Math.round((10 / 82) * numGames) : 10,
  };
  const winsToSurprise = Math.ceil(
    teamSeason.overUnder + surpriseRules.paceTarget,
  );
  const record = { l: 0, w: 0 };
  const data = games
    .filter(
      (game) =>
        game.seasonId === seasonId &&
        game.teams.some((entry) => entry.teamId === teamId),
    )
    .toSorted(
      (a, b) =>
        a.playedOn.localeCompare(b.playedOn) || a.id.localeCompare(b.id),
    )
    .map((game) => {
      const [a, b] = game.teams;
      const isWon = a.teamId === teamId ? a.score > b.score : b.score > a.score;
      if (isWon) record.w++;
      else record.l++;
      const projectedWins = Math.floor(
        (numGames * record.w) / (record.w + record.l),
      );
      return {
        date: game.playedOn,
        pace: projectedWins - winsToSurprise,
        projectedWins,
        recordFmt: `${record.w} - ${record.l}`,
      };
    });
  const name =
    team.alternativeNames?.find(
      (entry) =>
        entry.duration[0] <= Number(seasonId) &&
        entry.duration[1] >= Number(seasonId),
    )?.name ?? team.name;
  return {
    chart: { data, surpriseRules, winsToSurprise },
    name,
    overUnder: teamSeason.overUnder,
    record,
  };
}
