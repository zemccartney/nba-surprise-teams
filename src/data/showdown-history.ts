import type { TeamCode } from "../loaders/live/utils";
import type { Game, Team, TeamSeason } from "./model";

export interface ShowdownEra {
  firstSeason: number;
  lastSeason?: number | undefined;
  logo: string;
  name: string;
  teamId: TeamCode;
}
type EraRecord = Record & ShowdownEra;
interface Record {
  l: number;
  w: number;
}
const percentage = ({ l, w }: Record) => (w + l ? w / (w + l) : undefined);
export function historicShowdownStandings({
  archivedSeasonIds,
  franchiseIds,
  games,
  histories = new Map<TeamCode, ShowdownEra[]>(),
  teams,
  teamSeasons,
}: {
  archivedSeasonIds: ReadonlySet<string>;
  franchiseIds: ReadonlyMap<TeamCode, TeamCode>;
  games: Game[];
  histories?: ReadonlyMap<TeamCode, ShowdownEra[]>;
  teams: Team[];
  teamSeasons: TeamSeason[];
}) {
  const byId = new Map(teams.map((team) => [team.id, team]));
  const records = new Map<
    TeamCode,
    Record & { history: EraRecord[]; team: Team }
  >();
  for (const team of teams) {
    const id = franchiseIds.get(team.id) ?? team.id;
    const current = byId.get(id);
    if (!current) throw new Error(`Unknown Showdown franchise ${id}`);
    records.set(id, {
      history: (histories.get(id) ?? []).map((era) => ({ ...era, l: 0, w: 0 })),
      l: 0,
      team: current,
      w: 0,
    });
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
    recordResult(first, a.teamId, game.seasonId, a.score > b.score);
    recordResult(second, b.teamId, game.seasonId, b.score > a.score);
  }
  return records
    .values()
    .map((row) => ({
      ...row,
      history: row.history.map((era) => ({ ...era, pct: percentage(era) })),
      pct: percentage(row),
    }))
    .toArray()
    .toSorted(
      (a, b) =>
        (b.pct ?? -1) - (a.pct ?? -1) || a.team.name.localeCompare(b.team.name),
    );
}

function recordResult(
  record: Record & { history: EraRecord[] },
  teamId: TeamCode,
  seasonId: string,
  isWin: boolean,
) {
  record[isWin ? "w" : "l"]++;
  if (record.history.length === 0) return;
  const year = Number(seasonId);
  const era = record.history.find(
    (entry) =>
      entry.teamId === teamId &&
      entry.firstSeason <= year &&
      (entry.lastSeason === undefined || entry.lastSeason >= year),
  );
  if (!era)
    throw new Error(`Missing Showdown name history for ${seasonId}/${teamId}`);
  era[isWin ? "w" : "l"]++;
}
