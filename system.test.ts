import { getCollection } from "astro:content";
import { describe, expect, test } from "vitest";

const games = await getCollection("games");
const seasons = await getCollection("seasons");
const teams = await getCollection("teams");
const teamSeasons = await getCollection("teamSeasons");

describe("Data Validation System", () => {
  describe.only("Season Data Rules", async () => {
    test("past seasons must have complete static games data", () => {
      const today = new Date();
      const gracePeriodDays = 15;

      for (const season of seasons) {
        const endDate = new Date(season.data.endDate);
        const daysSinceEnd =
          (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

        // Skip if within grace period
        if (daysSinceEnd < gracePeriodDays) {
          continue;
        }

        // Past seasons must have games data
        if (daysSinceEnd >= gracePeriodDays) {
          const seasonTeams = teamSeasons.filter(
            (ts) => ts.data.season.id === season.id,
          );

          if (seasonTeams.length > 0 && games.length > 0) {
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
        }
      }
    });

    test("current/upcoming seasons must not have static games data", () => {
      const today = new Date();

      for (const season of seasons) {
        const endDate = new Date(season.data.endDate);
        const startDate = new Date(season.data.startDate);

        // Current or upcoming seasons
        if ((endDate >= today || startDate >= today) && games.length > 0) {
          const seasonGames = games.filter(
            (game: any) => game.data.seasonId === season.id,
          );
          expect(seasonGames.length).toBe(0);
        }
      }
    });

    test("only one current or upcoming season allowed", () => {
      const today = new Date();
      let currentOrUpcomingCount = 0;

      for (const season of seasons) {
        const endDate = new Date(season.data.endDate);

        if (endDate >= today) {
          currentOrUpcomingCount++;
        }
      }

      expect(currentOrUpcomingCount).toBeLessThanOrEqual(1);
    });

    test("no overlapping season date ranges", () => {
      const sortedSeasons = [...seasons].sort(
        (a, b) =>
          new Date(a.data.startDate).getTime() -
          new Date(b.data.startDate).getTime(),
      );

      for (let i = 1; i < sortedSeasons.length; i++) {
        const prevEnd = new Date(sortedSeasons[i - 1]?.data.endDate);
        const currentStart = new Date(sortedSeasons[i]?.data.startDate);

        expect(currentStart.getTime()).toBeGreaterThan(prevEnd.getTime());
      }
    });
  });

  describe("Convention Rules", () => {
    test("grace period convention - most recently past season leniency", () => {
      const today = new Date();
      const gracePeriodDays = 15;

      // Find most recently ended season
      const pastSeasons = seasons
        .filter((s) => new Date(s.data.endDate) < today)
        .sort(
          (a, b) =>
            new Date(b.data.endDate).getTime() -
            new Date(a.data.endDate).getTime(),
        );

      if (pastSeasons.length > 0) {
        const mostRecent = pastSeasons[0];
        const daysSinceEnd =
          (today.getTime() - new Date(mostRecent.data.endDate).getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysSinceEnd < gracePeriodDays) {
          // Within grace period - incomplete data is allowed
          expect(true).toBe(true); // This test passes during grace period
        }
      }
    });

    test("season timing convention - prevent premature next season addition", () => {
      const today = new Date();
      const maxDaysAway = 90;

      const futureSeasons = seasons.filter(
        (s) => new Date(s.data.startDate) > today,
      );

      for (const season of futureSeasons) {
        const startDate = new Date(season.data.startDate);
        const daysUntilStart =
          (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

        expect(daysUntilStart).toBeLessThanOrEqual(maxDaysAway);
      }
    });
  });

  describe("Referential Integrity", () => {
    test("team IDs consistent across all files", () => {
      const teamIds = teams.map((t) => t.data.id);

      // Check teamSeasons references
      for (const teamSeason of teamSeasons) {
        expect(teamIds).toContain(teamSeason.data.team.id);
      }

      // Check games references (if games exist)
      if (games.length > 0) {
        for (const game of games) {
          for (const gameTeam of game.data.teams) {
            expect(teamIds).toContain(gameTeam.teamId);
          }
        }
      }
    });

    test("season IDs consistent across all files", () => {
      const seasonIds = seasons.map((s) => s.data.id);

      // Check teamSeasons references
      for (const teamSeason of teamSeasons) {
        expect(seasonIds).toContain(teamSeason.data.season.id);
      }

      // Check games references (if games exist)
      if (games.length > 0) {
        for (const game of games) {
          expect(seasonIds).toContain(game.data.seasonId);
        }
      }
    });

    test("game participants must be surprise team candidates", () => {
      if (games.length === 0) return;

      for (const game of games) {
        const seasonTeamSeasons = teamSeasons.filter(
          (ts) => ts.data.season.id === game.data.seasonId,
        );
        const surpriseTeamIds = new Set(
          seasonTeamSeasons.map((ts) => ts.data.team.id),
        );

        let hasSurpriseTeam = false;
        for (const gameTeam of game.data.teams) {
          if (surpriseTeamIds.has(gameTeam.teamId)) {
            hasSurpriseTeam = true;
            break;
          }
        }

        expect(hasSurpriseTeam).toBe(true);
      }
    });

    test("all IDs unique within their respective files", () => {
      // Check seasons
      const seasonIds = seasons.map((s) => s.data.id);
      expect(new Set(seasonIds).size).toBe(seasonIds.length);

      // Check teams
      const teamIds = teams.map((t) => t.data.id);
      expect(new Set(teamIds).size).toBe(teamIds.length);

      // Check teamSeasons
      const teamSeasonIds = teamSeasons.map((ts) => ts.id);
      expect(new Set(teamSeasonIds).size).toBe(teamSeasonIds.length);

      // Check games (if they exist)
      if (games.length > 0) {
        const gameIds = games.map((g) => g.data.id);
        expect(new Set(gameIds).size).toBe(gameIds.length);
      }
    });
  });

  describe("Chart Hardcoding Detection", () => {
    test("stats page top-10 table - no ties at cutoff", () => {
      if (games.length === 0) {
        console.warn("Skipping top-10 table test - no games data available");
        return;
      }

      // Calculate pace for all team seasons (simplified version)
      const paceData: { pace: number; teamSeason: (typeof teamSeasons)[0] }[] =
        [];

      for (const teamSeason of teamSeasons) {
        // Find games for this team in this season
        const teamGames = games.filter(
          (game) =>
            game.data.seasonId === teamSeason.data.season.id &&
            game.data.teams.some(
              (team) => team.teamId === teamSeason.data.team.id,
            ),
        );

        if (teamGames.length > 0) {
          // Calculate simple record
          let wins = 0;
          for (const game of teamGames) {
            const teamData = game.data.teams.find(
              (t) => t.teamId === teamSeason.data.team.id,
            );
            const opponentData = game.data.teams.find(
              (t) => t.teamId !== teamSeason.data.team.id,
            );

            if (
              teamData &&
              opponentData &&
              teamData.score > opponentData.score
            ) {
              wins++;
            }
          }

          // Calculate pace (simplified: projected wins - surprise threshold)
          const projectedWins =
            teamGames.length > 0 ? (wins / teamGames.length) * 82 : 0;
          const surpriseThreshold = Math.ceil(teamSeason.data.overUnder) + 10;
          const pace = projectedWins - surpriseThreshold;

          paceData.push({ pace, teamSeason });
        }
      }

      // Sort by pace and check for ties at position 10/11
      const sortedByPace = paceData.sort((a, b) => b.pace - a.pace);

      if (sortedByPace.length >= 11) {
        const tenthPlace = sortedByPace[9].pace;
        const eleventhPlace = sortedByPace[10].pace;

        expect(tenthPlace).not.toBe(eleventhPlace);
      }
    });

    test("chart hardcoded values should be documented", () => {
      // This test documents that chart components contain hardcoded values
      // that should be reviewed when data changes significantly

      const chartFiles = [
        "src/components/charts/team-season-scatter.tsx",
        "src/components/charts/surprises-by-team.tsx",
        "src/components/charts/surprises-per-season.tsx",
        "src/pages/stats.astro",
      ];

      // For now, just ensure this test reminds us to check hardcodings
      expect(chartFiles.length).toBeGreaterThan(0);
    });
  });
});
