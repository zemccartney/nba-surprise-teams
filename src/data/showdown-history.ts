import type { TeamCode } from "../loaders/live/utils";
import type { Game, Team, TeamSeason } from "./model";

export function historicShowdownStandings({
  archivedSeasonIds,
  franchiseIds,
  games,
  teams,
  teamSeasons,
}: {
  archivedSeasonIds: ReadonlySet<string>;
  franchiseIds: ReadonlyMap<TeamCode, TeamCode>;
  games: Game[];
  teams: Team[];
  teamSeasons: TeamSeason[];
}) {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const records = new Map<TeamCode, { l: number; team: Team; w: number }>();
  for (const team of teams) {
    const id = franchiseIds.get(team.id) ?? team.id;
    const current = byId.get(id);
    if (!current) throw new Error(`Unknown Showdown franchise ${id}`);
    records.set(id, { l: 0, team: current, w: 0 });
  }
  const candidates = new Set(
    teamSeasons.map((row) => `${row.seasonId}/${row.teamId}`),
  );
  for (const game of games) {
    if (
      !archivedSeasonIds.has(game.seasonId) ||
      game.teams.some(
        ({ teamId }) => !candidates.has(`${game.seasonId}/${teamId}`),
      )
    )
      continue;
    const [a, b] = game.teams;
    const first = records.get(franchiseIds.get(a.teamId) ?? a.teamId);
    const second = records.get(franchiseIds.get(b.teamId) ?? b.teamId);
    if (!first || !second || first === second || a.score === b.score) continue;
    first[a.score > b.score ? "w" : "l"]++;
    second[b.score > a.score ? "w" : "l"]++;
  }
  return records
    .values()
    .map((row) => ({
      ...row,
      pct: row.w + row.l ? row.w / (row.w + row.l) : undefined,
    }))
    .toArray()
    .toSorted(
      (a, b) =>
        (b.pct ?? -1) - (a.pct ?? -1) || a.team.name.localeCompare(b.team.name),
    );
}
