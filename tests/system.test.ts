import { describe, expect, test, vi } from "vitest";

import * as ContentUtils from "../src/content-utils";

// Restore and validate one canonical SQL snapshot per run, including watch runs.
// Schema/domain invariants belong to validateDataset and its rejection tests;
// this file checks application assumptions not expressed by those invariants.
const fixture = await vi.hoisted(async () => {
  const { readContentFixture } = await import("./content-fixture");
  return readContentFixture();
});
vi.mock(import("virtual:tracker/catalog"), () => ({
  catalog: fixture.catalog,
  metadataHash: "test",
}));
const { games, teamSeasons } = fixture;

describe("presentation assumptions", () => {
  test("Stats top-10 table has no ties crossing the cutoff", () => {
    const archivedSeasonIds = new Set(games.map((game) => game.seasonId));
    const archivedTeams = teamSeasons.filter((row) =>
      archivedSeasonIds.has(row.seasonId),
    );
    expect(archivedTeams.length).toBeGreaterThan(10);
    const ranked = archivedTeams
      .map((teamSeason) => {
        const played = games.filter(
          (game) =>
            game.seasonId === teamSeason.seasonId &&
            game.teams.some(({ teamId }) => teamId === teamSeason.teamId),
        );
        const record = ContentUtils.calculateTeamRecord(
          teamSeason.teamId,
          played,
        );
        return ContentUtils.pace(teamSeason, record);
      })
      .toSorted((a, b) => b - a);
    const eleventh = ranked[10],
      tenth = ranked[9];
    if (tenth === undefined || eleventh === undefined)
      throw new Error("Insufficient ranking fixture");
    expect(tenth).toBeGreaterThan(eleventh);
  });
});
