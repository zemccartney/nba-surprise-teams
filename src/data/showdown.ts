import type { Game, Team } from "./model";

export function showdownDates(games: Game[]) {
  const dates = new Map<string, Game[]>();
  for (const game of games) {
    const slate = dates.get(game.playedOn) ?? [];
    slate.push(game);
    dates.set(game.playedOn, slate);
  }
  return [...dates].toSorted(([a], [b]) => a.localeCompare(b));
}

/**
Membership is fixed by preseason candidacy, not whether a team surprised.
*/
export function showdownGames(
  games: Game[],
  seasonId: string,
  candidateIds: ReadonlySet<string>,
): Game[] {
  return games
    .filter(
      (game) =>
        game.seasonId === seasonId &&
        game.teams.every(({ teamId }) => candidateIds.has(teamId)),
    )
    .toSorted(
      (a, b) =>
        a.playedOn.localeCompare(b.playedOn) || a.id.localeCompare(b.id),
    );
}

/**
Only completed head-to-head games belong here, never scheduled games.
*/
export function showdownStandings(teams: Team[], games: Game[]) {
  const records = new Map(teams.map((team) => [team.id, { l: 0, team, w: 0 }]));
  for (const game of games) {
    const [a, b] = game.teams;
    const first = records.get(a.teamId);
    const second = records.get(b.teamId);
    if (!first || !second || a.score === b.score) continue;
    first[a.score > b.score ? "w" : "l"]++;
    second[b.score > a.score ? "w" : "l"]++;
  }
  const rows = records
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
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.pct !== rows[index - 1]?.pct) rank = index + 1;
    return { ...row, rank: row.pct === undefined ? undefined : rank };
  });
}
