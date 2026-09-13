import type { CollectionEntry } from "astro:content";

import { getEntry } from "astro:content";
import { describe, expect, it, vi } from "vitest";

import {
  getTeamHistory,
  projectedWins,
  resolveTeamName,
} from "../src/content-utils";

// These tests use fresh JSON, not Astro's potentially empty/stale dev store.
vi.mock("astro:content", async () => {
  const { default: seasons } = await import("../src/content/seasons.json");
  const { default: teams } = await import("../src/content/teams.json");
  const { createContentApi } = await import("./content-api");
  // No archived 50-game season exists in this dataset. Reuse the shape of an
  // existing season; only its length and identity matter to these unit tests.
  const seasonFixtures = [
    ...seasons,
    {
      ...seasons[0],
      id: "fixture-50",
      shortened: { numGames: 50, reason: "Synthetic test season" },
    },
  ] as CollectionEntry<"seasons">["data"][];
  return createContentApi({
    seasons: seasonFixtures.map((data) => ({
      collection: "seasons",
      data,
      id: data.id,
    })),
    teams: (teams as CollectionEntry<"teams">["data"][]).map((data) => ({
      collection: "teams",
      data,
      id: data.id,
    })),
  });
});

describe("projected wins", () => {
  it.each(["2004", "2006", "2012"])(
    "preserves a completed 47–35 record in %s",
    async (season) => {
      expect(await projectedWins(season, { l: 35, w: 47 })).toBe(47);
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
        expect(await projectedWins(season, { l: length - wins, w: wins })).toBe(
          wins,
        );
      }
    },
  );

  it("returns zero before any games and deliberately floors partial wins", async () => {
    expect(await projectedWins("2025", { l: 0, w: 0 })).toBe(0);
    expect(await projectedWins("2025", { l: 2, w: 1 })).toBe(27);
    expect(await projectedWins("2025", { l: 0, w: 1 })).toBe(82);
    expect(await projectedWins("2025", { l: 1, w: 0 })).toBe(0);
  });
});

describe("Charlotte historical names", () => {
  it.each([
    ["2004", "Charlotte Bobcats"],
    ["2013", "Charlotte Bobcats"],
    ["2014", "Charlotte Hornets"],
  ])("uses the season-specific name in %s", async (season, name) => {
    const team = await getEntry("teams", "CHA");
    if (!team) throw new Error("Missing Charlotte fixture");
    expect(resolveTeamName(team, season)).toBe(name);
  });
});

describe("Nets history", () => {
  it.each(["BKN", "NJN"] as const)(
    "uses the right names for %s",
    async (team) => {
      expect(await getTeamHistory(team)).toEqual([
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
