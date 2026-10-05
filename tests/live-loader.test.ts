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
  games: (ReturnType<typeof game> & {
    gameStatusText?: string;
    gameTimeTBD?: number;
  })[],
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

it("sends the hosted-compatible NBA request headers", async () => {
  const fetch = feed([]);

  await expect(loader()).resolves.toEqual({ games: [] });

  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    {
      headers: {
        Accept: "application/json",
        Origin: "https://www.nba.com",
        Referer: "https://www.nba.com/",
        "User-Agent": expect.stringContaining("Mozilla/5.0"),
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
        venue: { awayTeamId: "CHA", homeTeamId: "POR" },
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

// Zero scores match observed live feed behavior; positive scores are defensive.
it.each([0, 49])(
  "excludes in-progress games with score %s from completed results",
  async (score) => {
    feed([{ ...game("0022600085", score), gameStatus: 2 }]);
    const result = await loader();
    expect(result.games).toHaveLength(0);
  },
);

it.each([
  [0, 0],
  [0, 100],
  [100, 0],
])("excludes final games with scores %s–%s", async (away, home) => {
  const final = game("0022600085");
  final.awayTeam.score = away;
  final.homeTeam.score = home;
  feed([final]);
  const result = await loader();
  expect(result.games).toHaveLength(0);
  expect(result.expiresAt).toBeGreaterThan(Date.now());
});

it.each(["awayTeam", "homeTeam"] as const)(
  "rejects final games missing the %s score",
  async (side) => {
    const final = game("0022600085");
    Reflect.deleteProperty(final[side], "score");
    feed([final]);
    await expect(loader()).rejects.toThrow();
  },
);

it("optionally returns the whole scoreless schedule from the same request", async () => {
  const request = feed([
    game("0022600001"),
    game("0022600002", 0),
    game("0062600001", 0),
  ]);
  const result = await loader("2026", { includeSchedule: true });
  expect(request).toHaveBeenCalledTimes(1);
  expect(result.games).toHaveLength(1);
  expect(result.schedule).toHaveLength(2);
  expect(result.schedule?.map((entry) => entry.status)).toEqual([
    "final",
    "scheduled",
  ]);
  expect(result.schedule?.[1]).not.toHaveProperty("teams");
  expect(result.schedule?.[1]).toMatchObject({
    startsAt: "2026-10-22T23:00:00Z",
    venue: { awayTeamId: "CHA", homeTeamId: "POR" },
  });
});

it("exposes future fixtures before opening night and caps schedule freshness", async () => {
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
  feed([game("0022600001", 0)]);
  const result = await loader("2026", { includeSchedule: true });
  expect(result.games).toEqual([]);
  expect(result.schedule).toHaveLength(1);
  expect(result.expiresAt).toBe(Date.now() + 6 * 60 * 60 * 1000);
});

it("keeps TBD, postponed and in-progress fixtures unscored", async () => {
  feed([
    { ...game("0022600001", 0), gameTimeTBD: 1 },
    { ...game("0022600002", 0), gameStatusText: "Postponed" },
    { ...game("0022600003", 50), gameStatus: 2 },
  ]);
  const result = await loader("2026", { includeSchedule: true });
  expect(result.games).toEqual([]);
  expect(result.schedule?.map((entry) => entry.status)).toEqual([
    "scheduled",
    "postponed",
    "pending",
  ]);
  expect(result.schedule?.[0]?.startsAt).toBeUndefined();
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
