import { describe, expect, it } from "vitest";

import type { Game } from "../src/data/model";
import type { ScheduledGame } from "../src/loaders/live/utils";

import { showdownCalendar } from "../src/data/showdown-calendar";

const fixture: ScheduledGame = {
  id: "2026-11-01/CHA__POR",
  nbaGameId: "0022600001",
  playedOn: "2026-11-01",
  seasonId: "2026",
  status: "scheduled",
  venue: { awayTeamId: "POR", homeTeamId: "CHA" },
};
const final: Game = {
  ...fixture,
  teams: [
    { score: 101, teamId: "CHA" },
    { score: 99, teamId: "POR" },
  ],
};
const candidates = new Set(["CHA", "POR"]);

describe("Showdown schedule calendar", () => {
  it("uses completed scores instead of duplicating a fixture", () => {
    const games = showdownCalendar([final], [fixture], "2026", candidates);
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ status: "final", teams: final.teams });
  });
  it("never manufactures scores for scheduled, pending or postponed games", () => {
    const entries = ["scheduled", "pending", "postponed", "final"].map(
      (status, index) => ({
        ...fixture,
        nbaGameId: String(index),
        status: status as ScheduledGame["status"],
      }),
    );
    const games = showdownCalendar([], entries, "2026", candidates);
    expect(games).toHaveLength(4);
    expect(
      games.every((game) =>
        game.teams.every((team) => team.score === undefined),
      ),
    ).toBe(true);
    expect(games.map((game) => game.status)).toEqual([
      "scheduled",
      "pending",
      "postponed",
      "pending",
    ]);
  });
  it("requires both candidates in this season and sorts chronologically", () => {
    const earlier = {
      ...fixture,
      id: "earlier",
      nbaGameId: "earlier",
      playedOn: "2026-10-25",
    };
    const outside = {
      ...fixture,
      nbaGameId: "outside",
      venue: { awayTeamId: "BOS" as const, homeTeamId: "CHA" as const },
    };
    const otherSeason = { ...fixture, nbaGameId: "other", seasonId: "2025" };
    expect(
      showdownCalendar(
        [],
        [fixture, outside, otherSeason, earlier],
        "2026",
        candidates,
      ).map((game) => game.id),
    ).toEqual(["earlier", fixture.id]);
  });
  it("does not duplicate a rescheduled result with the same provider ID", () => {
    expect(
      showdownCalendar(
        [final],
        [{ ...fixture, id: "old-date", playedOn: "2026-10-30" }],
        "2026",
        candidates,
      ),
    ).toHaveLength(1);
  });
});
