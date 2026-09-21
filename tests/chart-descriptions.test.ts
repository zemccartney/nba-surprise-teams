import { describe, expect, it } from "vitest";

import {
  describeGame,
  describeScatter,
  describeSeason,
  describeTeam,
} from "../src/components/charts/tanstack-options";

describe("renderer-independent chart descriptions", () => {
  it("announces zero counts without inventing surprises", () => {
    expect(
      describeSeason({
        numSurprises: 0,
        seasonId: "2025",
        seasonRange: "2025–26",
        surpriseTeams: [],
      }),
    ).toContain("0 surprise teams");
  });
  it("announces season identity and surprise team names", () => {
    expect(
      describeSeason({
        numSurprises: 1,
        seasonId: "2025",
        seasonRange: "2025–26",
        surpriseTeams: [
          {
            logoSrc: "/logo.svg",
            name: 'Team "quoted" & <historic>',
            teamId: "CHA",
          },
        ],
      }),
    ).toBe('2025–26 season. 1 surprise team. Team "quoted" & <historic>');
  });
  it("describes both team results and historical names with inclusive season endpoints", () => {
    expect(
      describeTeam({
        history: [
          {
            duration: [2004, 2013],
            logoSrc: "/logo.svg",
            name: "Bobcats",
            teamId: "CHA",
          },
          {
            duration: [2014],
            logoSrc: "/logo.svg",
            name: "Hornets",
            teamId: "CHA",
          },
        ],
        name: "Charlotte",
        numEliminated: 11,
        numSurprised: 3,
        teamId: "CHA",
      }),
    ).toBe(
      "Charlotte. 3 surprise seasons. 11 eliminated seasons. Team history: Bobcats, 2004 - 2014; Hornets, 2014 - present.",
    );
  });
  it.each([-5, 0, 5])(
    "announces the actual game and signed pace %i",
    (pace) => {
      expect(
        describeGame({
          date: "2025-10-22",
          pace,
          projectedWins: 41,
          recordFmt: "1 - 1",
        }),
      ).toBe(
        `2025-10-22. Record 1 - 1. Projected wins 41. Pace ${pace >= 0 ? "+" : ""}${pace}.`,
      );
    },
  );
  it.each([false, true])(
    "announces scatter coordinates and the result without relying on color: %s",
    (isSurpriseTeam) => {
      const text = describeScatter({
        isSurpriseTeam,
        logoSrc: "/logo.svg",
        overUnder: 24,
        pace: 5,
        recordFmt: "41 - 41",
        seasonRange: "2025–26",
        teamName: "Charlotte Hornets",
      });
      expect(text).toContain("Charlotte Hornets");
      expect(text).toContain("Over/under 24. Pace +5. Record 41 - 41.");
      expect(text).toContain(isSurpriseTeam ? "Surprise" : "Eliminated");
    },
  );
});
