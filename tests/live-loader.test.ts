import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTeamsInSeason } from "../src/content-utils";
import loader from "../src/loaders/live";

vi.mock(import("../src/content-utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  getLatestSeason: () => ({
    endDate: "2027-04-11",
    id: "2026",
    startDate: "2026-10-20",
  }),
  getTeamsInSeason: vi.fn(),
}));

const game = (id: string, score = 100) => ({
  awayTeam: { score, teamTricode: "CHA" },
  gameDateTimeUTC: "2026-10-22T23:00:00Z",
  gameId: id,
  gameStatus: score > 0 ? 3 : 1,
  homeTeam: { score: score > 0 ? score + 1 : 0, teamTricode: "POR" },
});
const feed = (
  games: ReturnType<typeof game>[],
  gameDate = "10/22/2026 00:00:00",
) => {
  const fetch = vi.fn().mockImplementation(() =>
    Promise.resolve(
      Response.json({
        leagueSchedule: {
          gameDates: [{ gameDate, games }],
          seasonYear: "2026-27",
        },
      }),
    ),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => {
  vi.mocked(getTeamsInSeason).mockReturnValue([
    {
      emoji: "test",
      id: "CHA",
      name: "Charlotte",
    },
  ]);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T23:30:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

it("sends the NBA Referer header", async () => {
  const fetch = feed([]);

  await expect(loader()).resolves.toEqual({ games: [] });

  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    {
      headers: {
        Accept: "application/json",
        Referer: "https://www.nba.com/",
      },
      signal: expect.any(AbortSignal),
    },
  );
});

describe("Cup eligibility", () => {
  it.each(["0022600015", "0022601201", "0022601229"])(
    "retains regular-season ID %s",
    async (id) => {
      feed([game(id)]);
      const result = await loader();
      expect(result.games).toHaveLength(1);
      expect(result.games[0]).toMatchObject({
        id: "2026-10-22/CHA__POR",
        nbaGameId: id,
        seasonId: "2026",
      });
    },
  );
  it.each([0, 100])(
    "excludes championship score %s from results and refresh",
    async (score) => {
      feed([game("0062600001", score), game("0022600085")]);
      const result = await loader();
      expect(result.games.map((entry) => entry.nbaGameId)).toEqual([
        "0022600085",
      ]);
      expect(result.expiresAt).toBeUndefined();
    },
  );
  it("retains the season date window", async () => {
    feed([game("0012600009")], "10/03/2026 00:00:00");
    await expect(loader()).resolves.toEqual({ games: [] });
  });
});

it("preserves score-based finality pending observation", async () => {
  feed([{ ...game("0022600085", 49), gameStatus: 2 }]);

  const result = await loader();

  expect(result.games).toHaveLength(1);
});

it("retries five minutes after the estimated finish", async () => {
  feed([game("0022600085", 0)]);

  const beforeExpectedEnd = await loader();

  expect(beforeExpectedEnd.expiresAt).toBe(Date.parse("2026-10-23T01:25:00Z"));

  vi.setSystemTime(new Date("2026-10-23T02:00:00Z"));

  const overdue = await loader();

  expect(overdue.expiresAt).toBe(Date.parse("2026-10-23T02:05:00Z"));
});

it("rejects another requested season before fetching", async () => {
  const fetch = feed([]);

  await expect(loader("2025")).rejects.toThrow("requested season");

  expect(fetch).not.toHaveBeenCalled();
});

it("rejects a different upstream season", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        leagueSchedule: { gameDates: [], seasonYear: "2025-26" },
      }),
    ),
  );

  await expect(loader("2026")).rejects.toThrow("does not match 2026-27");
});

it("rejects unrecognized upstream dates", async () => {
  feed([game("0022600085")], "unknown date");

  await expect(loader("2026")).rejects.toThrow("slate date");
});

it("rejects unknown mapped tricodes", async () => {
  const invalid = game("0022600085");
  invalid.homeTeam.teamTricode = "UNKNOWN";
  feed([invalid]);
  await expect(loader()).rejects.toThrow();
});
