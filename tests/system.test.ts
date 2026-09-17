import { describe, expect, test, vi } from "vitest";

import type { Team } from "../src/data/model";

import * as ContentUtils from "../src/content-utils";

// TODO test to catch the sort of issues seen on stats page i.e. showing current data?
// snapshot tests? something w/ astro? pattern for inspecting data passed to render? i.e.
// architecting for headless / testing?
// test to catch loader issues e.g. opening night '25?

// One fresh disk snapshot per run (including watch reruns) for both assertions
// and the real domain helpers. Never trust the empty/stale Astro dev store.
const fixture = await vi.hoisted(async () => {
  const { readContentFixture } = await import("./content-fixture");
  return readContentFixture();
});
vi.mock(import("virtual:tracker/catalog"), () => ({
  catalog: fixture.catalog,
  metadataHash: "test",
}));
const {
  games,
  games: rawGames,
  seasons,
  seasons: rawSeasons,
  teams: rawTeams,
  teamSeasons,
  teamSeasons: rawTeamSeasons,
} = fixture;

describe("system validation", () => {
  describe("season rules", () => {
    test("past seasons must have complete data (surprise teams and n (season length) games per team)", () => {
      const today = new Date();
      const gracePeriodDays = 15;

      for (const season of seasons) {
        const endDate = new Date(season.endDate);
        const daysSinceEnd =
          (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

        // Allow hotfixing right after season's end, assuming i might lag with manually archiving latest season
        if (daysSinceEnd < gracePeriodDays) {
          console.warn(
            `${season.id} season is past and missing static games, but still within grace period; skipping`,
          );
          continue;
        }

        const seasonTeams = teamSeasons.filter(
          (ts) => ts.seasonId === season.id,
        );

        expect(seasonTeams.length).toBeGreaterThanOrEqual(1);

        const seasonGames = games.filter((game) => game.seasonId === season.id);

        // Each surprise team should have 82 games (or 66/72 for shortened seasons)
        const expectedGames = season.shortened?.numGames || 82;

        for (const teamSeason of seasonTeams) {
          const teamGames = seasonGames.filter((game) =>
            game.teams.some((team) => team.teamId === teamSeason.teamId),
          );

          expect(teamGames.length).toBe(expectedGames);
        }
      }
    });

    test("current/upcoming seasons must not have static games data", () => {
      const today = new Date();
      const unfinishedSeasons = seasons.filter(
        (season) => new Date(season.endDate) > today,
      );

      for (const season of unfinishedSeasons) {
        const seasonGames = games.filter((game) => game.seasonId === season.id);
        expect(seasonGames).toHaveLength(0);
      }
    });

    test("only one current or upcoming season allowed", () => {
      const today = new Date();

      const currentOrUpcoming = seasons.filter((season) => {
        const endDate = new Date(season.endDate);
        return endDate > today;
      });

      expect(currentOrUpcoming.length).toBeLessThanOrEqual(1);
    });

    test("no overlapping season date ranges", () => {
      // Don't use the sortSeasons util here, as that intentionally sorts by id for simplicity's sake,
      // relying on the fact that date ranges are valid and correlated to id years such that id order
      // implies correct start/end date order, a fact we're verifying here. This is blatant overthinking?
      const sortedSeasons = [...seasons].toSorted(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

      for (let i = 0; i < sortedSeasons.length - 1; i++) {
        // sanity checks

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const season = sortedSeasons[i]!;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const year = Number.parseInt(season.id.split("-")![0]!, 10);
        expect(season.startDate.startsWith(year.toString())).toEqual(true);
        expect(season.endDate.startsWith((year + 1).toString())).toEqual(true);

        const startMoment = new Date(season.startDate).getTime();
        const endMoment = new Date(season.endDate).getTime();

        expect(endMoment).toBeGreaterThan(startMoment);

        // Now verify non-overlapping
        const currentEnd = new Date(season.endDate);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const nextStart = new Date(sortedSeasons[i + 1]!.startDate);

        expect(nextStart.getTime()).toBeGreaterThan(currentEnd.getTime());
      }
    });

    test("season timing convention - prevent premature next season addition", () => {
      const today = new Date();
      const maxDaysAway = 90;

      const futureSeasons = seasons.filter(
        (s) => new Date(s.startDate) > today,
      );

      expect(futureSeasons.length).toBeLessThanOrEqual(1); // partially redundant with "only one current or upcoming season allowed" test (doesn't cover current case)

      for (const season of futureSeasons) {
        const startDate = new Date(season.startDate);
        const daysUntilStart =
          (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        expect(daysUntilStart).toBeLessThanOrEqual(maxDaysAway);
      }
    });
  });

  describe("referential integrity and constraints", () => {
    test("all IDs unique within their respective files", async () => {
      const seasonIds = rawSeasons.map((s) => s.id);
      expect(new Set(seasonIds).size).toBe(seasonIds.length);

      const teamIds = rawTeams.map((t) => t.id);
      expect(new Set(teamIds).size).toBe(teamIds.length);

      const teamSeasonIds = rawTeamSeasons.map((ts) => ts.id);
      expect(new Set(teamSeasonIds).size).toBe(teamSeasonIds.length);

      const gameIds = rawGames.map((g) => g.id);
      expect(new Set(gameIds).size).toBe(gameIds.length);
    });

    test("team IDs consistent across all files", () => {
      const teamIds = new Set(rawTeams.map((t) => t.id));

      for (const teamSeason of rawTeamSeasons) {
        expect(teamIds).toContain(teamSeason.teamId);
        const [, teamId] = teamSeason.id.split("/", 2);
        expect(teamIds).toContain(teamId);
      }

      for (const game of rawGames) {
        for (const gameTeam of game.teams) {
          expect(teamIds).toContain(gameTeam.teamId);
        }
      }
    });

    test("season IDs consistent across all files", () => {
      const seasonIds = new Set(rawSeasons.map((s) => s.id));

      for (const teamSeason of rawTeamSeasons) {
        expect(seasonIds).toContain(teamSeason.seasonId);
        const [seasonId] = teamSeason.id.split("/", 1);
        expect(seasonIds).toContain(seasonId);
      }

      for (const game of rawGames) {
        expect(seasonIds).toContain(game.seasonId);
      }
    });

    test("game participants must be surprise team candidates", async () => {
      const surpriseTeamIdsBySeason = Object.fromEntries(
        rawSeasons.map(({ id }) => [id, new Set<Team["id"]>()]),
      );
      for (const teamSeason of teamSeasons) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        surpriseTeamIdsBySeason[teamSeason.seasonId]!.add(teamSeason.teamId);
      }

      for (const game of games) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const surpriseTeamIds = surpriseTeamIdsBySeason[game.seasonId]!;

        const hasSurpriseTeam = game.teams.some((team) => {
          return surpriseTeamIds.has(team.teamId);
        });

        expect(hasSurpriseTeam).toBe(true);
      }
    });
  });

  // Retire these tests as a programmatic way to adapt charts to different datasets becomes clear
  // Didn't feel like burning time hashing that out
  describe("chart hardcoding checks", () => {
    test("stats page top-10 table - no ties at cutoff", async () => {
      // Match Stats: only archived seasons contribute to the ranking.
      const archivedSeasonIds = new Set(games.map((data) => data.seasonId));
      const archivedTeams = teamSeasons.filter((data) =>
        archivedSeasonIds.has(data.seasonId),
      );
      expect(archivedTeams.length).toBeGreaterThan(10);
      const paceArchive = [];
      for (const teamSeason of archivedTeams) {
        const gamesPlayed = games.filter((data) => {
          return (
            data.seasonId === teamSeason.seasonId &&
            data.teams.map(({ teamId }) => teamId).includes(teamSeason.teamId)
          );
        });
        const record = ContentUtils.calculateTeamRecord(
          teamSeason.teamId,
          gamesPlayed,
        );

        paceArchive.push({
          pace: ContentUtils.pace(teamSeason, record),
          record,
          teamSeason,
        });
      }

      const paceArchiveDescending = paceArchive.toSorted(
        (a, b) => b.pace - a.pace,
      );
      const paceTop10 = paceArchiveDescending.slice(0, 10);

      // For each item in top 10, check that its pace value isn't repeated
      // by more following items than 9 - n (where n is position)
      for (const [n, element] of paceTop10.entries()) {
        const currentPace = element.pace;
        const maxAllowedRepeats = 9 - n;

        const followingRepeats = paceArchiveDescending
          .slice(n + 1)
          .filter((item) => item.pace === currentPace).length;

        expect(followingRepeats).toBeLessThanOrEqual(maxAllowedRepeats);
      }
    });
  });
});
