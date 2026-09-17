import { catalog } from "virtual:tracker/catalog";
import { describe, expect, it, vi } from "vitest";

import {
  getTeamHistory,
  projectedWins,
  resolveTeamName,
} from "../src/content-utils";

// Plain metadata with one explicitly synthetic shortened season.
vi.mock(import("virtual:tracker/catalog"), async () => {
  const { readContentFixture } = await import("./content-fixture");
  const { metadataCatalog } = await import("../src/data/catalog");
  const fixture = readContentFixture();
  fixture.seasons.push({
    endDate: "1999-01-01",
    id: "fixture-50",
    shortened: { numGames: 50, reason: "Synthetic test season" },
    startDate: "1998-01-01",
  });
  return { catalog: metadataCatalog(fixture), metadataHash: "synthetic" };
});

describe("projected wins", () => {
  it.each(["2004", "2006", "2012"])(
    "preserves a completed 47–35 record in %s",
    async (season) => {
      expect(projectedWins(season, { l: 35, w: 47 })).toBe(47);
    },
  );

  it.each([
    ["2025", 82],
    ["2011", 66],
    ["fixture-50", 50],
    ["2020", 72],
  ] as const)(
    "preserves every completed record in %s",
    async (season, length) => {
      for (let wins = 0; wins <= length; wins++) {
        expect(projectedWins(season, { l: length - wins, w: wins })).toBe(wins);
      }
    },
  );

  it("returns zero before any games and deliberately floors partial wins", async () => {
    expect(projectedWins("2025", { l: 0, w: 0 })).toBe(0);
    expect(projectedWins("2025", { l: 2, w: 1 })).toBe(27);
    expect(projectedWins("2025", { l: 0, w: 1 })).toBe(82);
    expect(projectedWins("2025", { l: 1, w: 0 })).toBe(0);
  });
});

describe("Charlotte historical names", () => {
  it.each([
    ["2004", "Charlotte Bobcats"],
    ["2013", "Charlotte Bobcats"],
    ["2014", "Charlotte Hornets"],
  ])("uses the season-specific name in %s", async (season, name) => {
    const team = catalog.getTeam("CHA");
    if (!team) throw new Error("Missing Charlotte fixture");
    expect(resolveTeamName(team, season)).toBe(name);
  });
});

describe("Nets history", () => {
  it.each(["BKN", "NJN"] as const)(
    "uses the right names for %s",
    async (team) => {
      expect(getTeamHistory(team)).toEqual([
        {
          duration: [1977, 2011],
          logo: "nets",
          name: "New Jersey Nets",
          teamId: "NJN",
        },
        {
          duration: [2012],
          logo: "dragon",
          name: "Brooklyn Nets",
          teamId: "BKN",
        },
      ]);
    },
  );
});
