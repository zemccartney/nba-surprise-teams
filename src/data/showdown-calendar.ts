import type { ScheduledGame, TeamCode } from "../loaders/live/utils";
import type { Game } from "./model";

import { showdownGames } from "./showdown";

export interface ShowdownMatchup {
  id: string;
  playedOn: string;
  startsAt?: string | undefined;
  status: ScheduledGame["status"];
  teams: readonly [Opponent, Opponent];
  venue?: Game["venue"];
}
interface Opponent {
  score?: number;
  teamId: TeamCode;
}

export function showdownCalendar(
  games: Game[],
  schedule: ScheduledGame[],
  seasonId: string,
  candidates: ReadonlySet<string>,
): ShowdownMatchup[] {
  const results = showdownGames(games, seasonId, candidates);
  const calendar = new Map<string, ShowdownMatchup>(
    results.map((game) => [
      game.nbaGameId ?? game.id,
      { ...game, status: "final" },
    ]),
  );
  for (const game of schedule) {
    if (
      game.seasonId !== seasonId ||
      [game.venue.awayTeamId, game.venue.homeTeamId].some(
        (id) => !candidates.has(id),
      )
    )
      continue;
    if (
      calendar.has(game.nbaGameId) ||
      results.some((result) => result.id === game.id)
    )
      continue;
    calendar.set(game.nbaGameId, {
      ...game,
      // A final schedule marker without a validated result is not a score.
      status: game.status === "final" ? "pending" : game.status,
      teams: [
        { teamId: game.venue.awayTeamId },
        { teamId: game.venue.homeTeamId },
      ],
    });
  }
  return calendar
    .values()
    .toArray()
    .toSorted(
      (a, b) =>
        a.playedOn.localeCompare(b.playedOn) ||
        (a.startsAt ?? "").localeCompare(b.startsAt ?? "") ||
        a.id.localeCompare(b.id),
    );
}
