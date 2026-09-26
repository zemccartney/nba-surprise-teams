import { describe, expect, it } from "vitest";

import type { Game, Team } from "../src/data/model";

import {
  showdownDates,
  showdownGames,
  showdownStandings,
} from "../src/data/showdown";
import { readContentFixture } from "./content-fixture";

const teams: Team[] = [
  { emoji: "a", id: "ATL", name: "Atlanta Hawks" },
  { emoji: "b", id: "BOS", name: "Boston Celtics" },
  { emoji: "c", id: "CHI", name: "Chicago Bulls" },
  { emoji: "d", id: "DAL", name: "Dallas Mavericks" },
];
const game = (
  a: Team["id"],
  b: Team["id"],
  day: string,
  seasonId = "2025",
): Game => ({
  id: `${day}/${a}__${b}`,
  playedOn: day,
  seasonId,
  teams: [
    { score: 100, teamId: a },
    { score: 90, teamId: b },
  ],
});

describe("Showdown", () => {
  it("requires both candidates in the requested season and sorts by date", () => {
    const later = game("ATL", "BOS", "2025-11-02");
    const earlier = game("BOS", "ATL", "2025-11-01");
    expect(
      showdownGames(
        [
          later,
          game("ATL", "CHI", "2025-11-01"),
          game("ATL", "BOS", "2024-11-01", "2024"),
          earlier,
        ],
        "2025",
        new Set(["ATL", "BOS"]),
      ),
    ).toEqual([earlier, later]);
  });

  it("shares ranks by percentage, orders ties by name, and puts no-games teams last", () => {
    const rows = showdownStandings(teams, [
      game("ATL", "CHI", "2025-11-01"),
      game("BOS", "CHI", "2025-11-02"),
      game("ATL", "CHI", "2025-11-03"),
    ]);
    expect(
      rows.map(({ l, pct, rank, team, w }) => [team.id, w, l, pct, rank]),
    ).toEqual([
      ["ATL", 2, 0, 1, 1],
      ["BOS", 1, 0, 1, 1],
      ["CHI", 0, 3, 0, 3],
      ["DAL", 0, 0, undefined, undefined],
    ]);
  });

  it("does not count tied placeholders or games with outside opponents", () => {
    const tied = game("ATL", "BOS", "2025-11-01");
    tied.teams[0].score = 90;
    expect(
      showdownStandings(teams.slice(0, 2), [
        tied,
        game("ATL", "CHI", "2025-11-02"),
      ]).every((row) => row.pct === undefined),
    ).toBe(true);
  });

  it("groups multiple matchups on one date", () => {
    const first = game("ATL", "BOS", "2025-11-01");
    const second = game("CHI", "DAL", "2025-11-01");
    expect(showdownDates([first, second])).toEqual([
      ["2025-11-01", [first, second]],
    ]);
  });

  it("balances wins and losses across every historical season", () => {
    const fixture = readContentFixture();
    for (const season of fixture.seasons) {
      const ids = new Set(
        fixture.teamSeasons
          .filter((row) => row.seasonId === season.id)
          .map((row) => row.teamId),
      );
      const selected = showdownGames(fixture.games, season.id, ids);
      const rows = showdownStandings(
        fixture.teams.filter((team) => ids.has(team.id)),
        selected,
      );
      expect(rows.reduce((sum, row) => sum + row.w, 0)).toBe(selected.length);
      expect(rows.reduce((sum, row) => sum + row.l, 0)).toBe(selected.length);
    }
  });
});
