import type { CollectionEntry } from "astro:content";

import { getCollection } from "astro:content";
import Fs from "node:fs/promises";
import { beforeAll, describe, expect, test } from "vitest";

import * as ContentUtils from "./src/content-utils";

/*
  Warning: changes to content don't appear to surface automatically in tests,
  required starting dev server to trigger a content sync. Unclear why yet
*/
const games = await getCollection("games");
const seasons = await getCollection("seasons");
const teamSeasons = await getCollection("teamSeasons");

console.log(seasons.length, games.length, teamSeasons.length, "PENGUIN");

describe("system validation", () => {
  describe("season rules", () => {
    test("past seasons must have complete data (surprise teams and n (season length) games per team)", () => {
      const today = new Date();
      const gracePeriodDays = 15;

      for (const season of seasons) {
        const endDate = new Date(season.data.endDate);
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
          (ts) => ts.data.season.id === season.id,
        );

        expect(seasonTeams.length).toBeGreaterThanOrEqual(1);

        const seasonGames = games.filter(
          (game) => game.data.seasonId === season.id,
        );

        // Each surprise team should have 82 games (or 66/72 for shortened seasons)
        const expectedGames = season.data.shortened?.numGames || 82;

        for (const teamSeason of seasonTeams) {
          const teamGames = seasonGames.filter((game) =>
            game.data.teams.some(
              (team) => team.teamId === teamSeason.data.team.id,
            ),
          );

          expect(teamGames.length).toBe(expectedGames);
        }
      }
    });

    test("current/upcoming seasons must not have static games data", () => {
      const today = new Date();

      for (const season of seasons) {
        const endDate = new Date(season.data.endDate);

        if (endDate > today && games.length > 0) {
          const seasonGames = games.filter(
            (game) => game.data.seasonId === season.id,
          );
          expect(seasonGames.length).toBe(0);
        }
      }
    });

    test("only one current or upcoming season allowed", () => {
      const today = new Date();

      const currentOrUpcoming = seasons.filter((season) => {
        const endDate = new Date(season.data.endDate);
        return endDate > today;
      });

      expect(currentOrUpcoming.length).toBeLessThanOrEqual(1);
    });

    test("no overlapping season date ranges", () => {
      // Don't use the sortSeasons util here, as that intentionally sorts by id for simplicity's sake,
      // relying on the fact that date ranges are valid and correlated to id years such that id order
      // implies correct start/end date order, a fact we're verifying here. This is blatant overthinking?
      const sortedSeasons = [...seasons].sort(
        (a, b) =>
          new Date(a.data.startDate).getTime() -
          new Date(b.data.startDate).getTime(),
      );

      for (let i = 0; i < sortedSeasons.length - 1; i++) {
        // sanity checks

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const season = sortedSeasons[i]!;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const year = Number.parseInt(season.id.split("-")![0]!, 10);
        expect(season.data.startDate.startsWith(year.toString())).toEqual(true);
        expect(season.data.endDate.startsWith((year + 1).toString())).toEqual(
          true,
        );

        const startMoment = new Date(season.data.startDate).getTime();
        const endMoment = new Date(season.data.endDate).getTime();

        expect(endMoment).toBeGreaterThan(startMoment);

        // Now verify non-overlapping
        const currentEnd = new Date(season.data.endDate);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const nextStart = new Date(sortedSeasons[i + 1]!.data.startDate);

        expect(nextStart.getTime()).toBeGreaterThan(currentEnd.getTime());
      }
    });

    test("season timing convention - prevent premature next season addition", () => {
      const today = new Date();
      const maxDaysAway = 90;

      const futureSeasons = seasons.filter(
        (s) => new Date(s.data.startDate) > today,
      );

      expect(futureSeasons.length).toBeLessThanOrEqual(1); // partially redundant with "only one current or upcoming season allowed" test (doesn't cover current case)

      for (const season of futureSeasons) {
        const startDate = new Date(season.data.startDate);
        const daysUntilStart =
          (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        expect(daysUntilStart).toBeLessThanOrEqual(maxDaysAway);
      }
    });
  });

  describe("referential integrity and constraints", () => {
    let rawSeasons: CollectionEntry<"seasons">["data"][];
    let rawTeams: CollectionEntry<"teams">["data"][];
    let rawTeamSeasons: CollectionEntry<"teamSeasons">["data"][];
    let rawGames: CollectionEntry<"games">["data"][];

    beforeAll(async () => {
      /*
        Why loading raw data? To work around how astro treats swallows duplicate ids, preserving
        only the latest (source order) record of the duplicated id instead of erroring. Unclear why,
        but prefer to guard against that

        The idea is that these tests should verify the data on disk is referentially consistent. Ideally,
        astro's representation of said data would match its physical representation or at least as far
        as ref integrity goes, but since it's not, use raw data wherever we need to assert facts we need
        to be true about the ids of said data
      */

      rawSeasons = JSON.parse(
        await Fs.readFile("./src/content/seasons.json", { encoding: "utf8" }),
      ) as unknown as CollectionEntry<"seasons">["data"][];

      rawTeams = JSON.parse(
        await Fs.readFile("./src/content/teams.json", { encoding: "utf8" }),
      ) as unknown as CollectionEntry<"teams">["data"][];

      rawTeamSeasons = JSON.parse(
        await Fs.readFile("./src/content/teamSeasons.json", {
          encoding: "utf8",
        }),
      ) as unknown as CollectionEntry<"teamSeasons">["data"][];

      rawGames = JSON.parse(
        await Fs.readFile("./src/content/games.json", { encoding: "utf8" }),
      ) as unknown as CollectionEntry<"games">["data"][];
    });

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
        expect(teamIds).toContain(teamSeason.team);
        const [, teamId] = teamSeason.id.split("/");
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
        expect(seasonIds).toContain(teamSeason.season);
        const [seasonId] = teamSeason.id.split("/");
        expect(seasonIds).toContain(seasonId);
      }

      for (const game of rawGames) {
        expect(seasonIds).toContain(game.seasonId);
      }
    });

    test("game participants must be surprise team candidates", async () => {
      const surpriseTeamIdsBySeason = Object.fromEntries(
        rawSeasons.map(({ id }) => [
          id,
          new Set<CollectionEntry<"teams">["id"]>(),
        ]),
      );
      for (const teamSeason of teamSeasons) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        surpriseTeamIdsBySeason[teamSeason.data.season.id]!.add(
          teamSeason.data.team.id,
        );
      }

      for (const game of games) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const surpriseTeamIds = surpriseTeamIdsBySeason[game.data.seasonId]!;

        const hasSurpriseTeam = game.data.teams.some((team) => {
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
      if (games.length === 0) {
        console.warn("Skipping top-10 table test - no games data available");
        return;
      }

      // Use exact same calculation as stats.astro (lines 37-57)
      const paceArchive = [];
      for (const teamSeason of teamSeasons) {
        const gamesPlayed = games.filter(({ data }) => {
          return (
            data.seasonId === teamSeason.data.season.id &&
            data.teams
              .map(({ teamId }) => teamId)
              .includes(teamSeason.data.team.id)
          );
        });
        const record = ContentUtils.calculateTeamRecord(
          teamSeason.data.team.id,
          gamesPlayed.map((g) => g.data),
        );

        paceArchive.push({
          pace: await ContentUtils.pace(teamSeason, record),
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
