import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveLoaderResponse } from "../src/loaders/live/utils";

import { LIVE_DATA_VERSION } from "../src/loaders/live";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  get: vi.fn(),
  getLatestSeason: vi.fn(),
  getSeason: vi.fn(),
  loader: vi.fn(),
  put: vi.fn(),
}));
vi.mock(import("@sentry/cloudflare"), () => ({
  captureException: mocks.captureException,
}));
vi.mock(import("virtual:tracker/catalog"), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    catalog: { ...original.catalog, getSeason: mocks.getSeason },
  };
});
vi.mock(import("../src/content-utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  getLatestSeason: mocks.getLatestSeason,
}));
vi.mock(import("../src/loaders/live"), async (importOriginal) => ({
  ...(await importOriginal()),
  default: mocks.loader,
}));
// These two shims intentionally replace only the handler/transport boundary,
// not the full platform APIs. Keep string mocks rather than casting away their
// incompatible types merely to force the typed-import syntax.
vi.mock("cloudflare:workers", () => ({
  env: { GAMES_KV: { get: mocks.get, put: mocks.put } },
}));
// Exercise the actual handler, not Astro's transport/validation machinery.
vi.mock("astro:actions", () => ({
  ActionError: class extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
  defineAction: ({ handler }: { handler: unknown }) => handler,
}));

const { server } = await import("../src/actions/index");
const run = server.getSeasonData as unknown as (input: {
  includeSchedule?: boolean;
  seasonId: string;
}) => Promise<LiveLoaderResponse>;

const latest = {
  endDate: "2027-04-12",
  id: "2026",
  startDate: "2026-10-20",
};

const expectedRefreshErrors: string[] = [];
const rejectRefresh = (error: Error) => {
  expectedRefreshErrors.push(error.message);
  mocks.loader.mockRejectedValue(error);
};

beforeEach(() => {
  expectedRefreshErrors.length = 0;
  vi.spyOn(console, "error").mockReturnValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
  vi.spyOn(console, "log").mockReturnValue(undefined);
  mocks.getLatestSeason.mockReturnValue(latest);
  mocks.getSeason.mockReturnValue(latest);
  // KV returns null for an absent key.
  // eslint-disable-next-line unicorn/no-null
  mocks.get.mockResolvedValue(null);
});
afterEach(() => {
  try {
    // Capture expected failure-path logging without hiding unexpected errors.
    assert.deepEqual(
      vi.mocked(console.error).mock.calls,
      expectedRefreshErrors.map((message) => ["Live refresh failed:", message]),
    );
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});

const expectNoLiveAccess = () => {
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.loader).not.toHaveBeenCalled();
  expect(mocks.put).not.toHaveBeenCalled();
};

describe("latest-season live action contract", () => {
  it("rejects historical requests before live access", async () => {
    mocks.getSeason.mockReturnValue({
      endDate: "2026-04-12",
      id: "2025",
      startDate: "2025-10-21",
    });
    await expect(run({ seasonId: "2025" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expectNoLiveAccess();
  });

  it("returns NOT_FOUND for unknown seasons", async () => {
    mocks.getSeason.mockReturnValue(undefined);
    await expect(run({ seasonId: "unknown" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expectNoLiveAccess();
  });

  it("bypasses live access before the season", async () => {
    vi.setSystemTime(new Date("2026-09-14T16:00:00Z"));
    await expect(run({ seasonId: "2026" })).resolves.toEqual({ games: [] });
    expectNoLiveAccess();
  });

  it("stores current-season results", async () => {
    const data: LiveLoaderResponse = {
      expiresAt: Date.now() + 300_000,
      games: [
        {
          id: "2026-10-21/CHA__POR",
          nbaGameId: "0022600085",
          playedOn: "2026-10-21",
          seasonId: "2026",
          teams: [
            { score: 101, teamId: "CHA" },
            { score: 100, teamId: "POR" },
          ],
        },
      ],
    };
    mocks.loader.mockResolvedValue(data);
    await expect(run({ seasonId: "2026" })).resolves.toEqual(data);
    expect(mocks.get).toHaveBeenCalledWith("2026", "text");
    expect(mocks.loader).toHaveBeenCalledOnce();
    expect(mocks.put).toHaveBeenCalledWith("2026", expect.any(String));
    expect(JSON.parse(mocks.put.mock.calls[0]?.[1] as string)).toMatchObject({
      data,
      id: LIVE_DATA_VERSION,
    });
  });
});

const saved: LiveLoaderResponse = {
  games: [
    {
      id: "2026-10-21/CHA__POR",
      nbaGameId: "0022600085",
      playedOn: "2026-10-21",
      seasonId: "2026",
      teams: [
        { score: 101, teamId: "CHA" },
        { score: 100, teamId: "POR" },
      ],
    },
  ],
};
const encode = (data: unknown, id = LIVE_DATA_VERSION) =>
  JSON.stringify({ data, id });

describe("schedule-aware live action", () => {
  const scheduled: LiveLoaderResponse = {
    games: [],
    schedule: [
      {
        id: "2026-10-22/CHA__POR",
        nbaGameId: "0022600001",
        playedOn: "2026-10-22",
        seasonId: "2026",
        status: "scheduled",
        venue: { awayTeamId: "CHA", homeTeamId: "POR" },
      },
    ],
  };
  it("fetches a preseason schedule without altering the results-only key", async () => {
    vi.setSystemTime(new Date("2026-09-26T12:00:00Z"));
    mocks.loader.mockResolvedValue(scheduled);
    await expect(
      run({ includeSchedule: true, seasonId: "2026" }),
    ).resolves.toEqual(scheduled);
    expect(mocks.get).toHaveBeenCalledWith("2026:schedule", "text");
    expect(mocks.loader).toHaveBeenCalledWith("2026", {
      includeSchedule: true,
    });
    expect(mocks.put).toHaveBeenCalledWith("2026:schedule", encode(scheduled));
  });
  it("does not accept results-only cached data for a schedule request", async () => {
    mocks.get.mockResolvedValue(
      encode({ ...saved, expiresAt: Date.now() + 300_000 }),
    );
    mocks.loader.mockResolvedValue(scheduled);
    await expect(
      run({ includeSchedule: true, seasonId: "2026" }),
    ).resolves.toEqual(scheduled);
    expect(mocks.loader).toHaveBeenCalledOnce();
  });
  it("preserves cached schedules on refresh failure without claiming freshness", async () => {
    mocks.get.mockResolvedValue(
      encode({ ...scheduled, expiresAt: Date.now() - 1 }),
    );
    rejectRefresh(new Error("offline"));
    await expect(
      run({ includeSchedule: true, seasonId: "2026" }),
    ).resolves.toEqual(scheduled);
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it("rejects a cached schedule from another season", async () => {
    mocks.get.mockResolvedValue(
      encode({
        ...scheduled,
        schedule: scheduled.schedule?.map((game) => ({
          ...game,
          seasonId: "2025",
        })),
      }),
    );
    rejectRefresh(new Error("offline"));
    await expect(
      run({ includeSchedule: true, seasonId: "2026" }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("validated KV freshness and fallback", () => {
  it.each([
    { name: "malformed JSON", raw: "not JSON" },
    { name: "null envelope", raw: "null" },
    { name: "missing version", raw: "{}" },
    { name: "empty version", raw: encode(saved, "") },
    { name: "invalid games", raw: encode({ games: "wrong" }) },
    { name: "old version", raw: encode(saved, "old-policy") },
    {
      name: "missing provider ID",
      raw: encode({ games: [{ ...saved.games[0], nbaGameId: undefined }] }),
    },
    {
      name: "wrong season",
      raw: encode({ games: [{ ...saved.games[0], seasonId: "2025" }] }),
    },
    {
      name: "championship result",
      raw: encode({ games: [{ ...saved.games[0], nbaGameId: "0062600001" }] }),
    },
    {
      name: "invalid expiry",
      raw: encode({ ...saved, expiresAt: "tomorrow" }),
    },
  ])("rejects $name as fallback", async ({ raw }) => {
    mocks.get.mockResolvedValue(raw);
    rejectRefresh(new Error("Feed unavailable"));
    await expect(run({ seasonId: "2026" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
    expect(mocks.loader).toHaveBeenCalledOnce();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("refetches malformed JSON", async () => {
    mocks.get.mockResolvedValue("bad JSON");
    mocks.loader.mockResolvedValue(saved);
    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);
    expect(mocks.put).toHaveBeenCalledWith("2026", encode(saved));
  });

  it("serves fresh empty results", async () => {
    const data = { expiresAt: Date.now() + 60_000, games: [] };
    mocks.get.mockResolvedValue(encode(data));
    await expect(run({ seasonId: "2026" })).resolves.toEqual(data);
    expect(mocks.loader).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("serves complete nonempty data without expiry", async () => {
    mocks.get.mockResolvedValue(encode(saved));
    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);
    expect(mocks.loader).not.toHaveBeenCalled();
  });

  it("retries empty undated results", async () => {
    mocks.get.mockResolvedValue(encode({ games: [] }));
    mocks.loader.mockResolvedValue(saved);
    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);
    expect(mocks.loader).toHaveBeenCalledOnce();
  });

  it("refreshes at expiry and writes the new response", async () => {
    const data = { ...saved, expiresAt: Date.now() + 1000 };
    mocks.get.mockResolvedValue(encode(data));
    await expect(run({ seasonId: "2026" })).resolves.toEqual(data);
    expect(mocks.loader).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    const refreshed: LiveLoaderResponse = {
      expiresAt: Date.now() + 300_000,
      games: [
        ...saved.games,
        {
          id: "2026-10-22/CHA__POR",
          nbaGameId: "0022600086",
          playedOn: "2026-10-22",
          seasonId: "2026",
          teams: [
            { score: 102, teamId: "CHA" },
            { score: 100, teamId: "POR" },
          ],
        },
      ],
    };
    mocks.loader.mockResolvedValue(refreshed);
    await expect(run({ seasonId: "2026" })).resolves.toEqual(refreshed);
    expect(mocks.put).toHaveBeenCalledWith("2026", encode(refreshed));
  });

  it("serves valid stale backup without an expiry", async () => {
    mocks.get.mockResolvedValue(encode({ ...saved, expiresAt: 0 }));
    rejectRefresh(new Error("Feed unavailable"));
    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("reports loader validation failures once", async () => {
    const error = new Error("NBA schedule season does not match 2026-27");

    rejectRefresh(error);

    await expect(run({ seasonId: "2026" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });

    expect(mocks.loader).toHaveBeenCalledWith("2026");
    expect(mocks.captureException).toHaveBeenCalledExactlyOnceWith(error);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("reports loader failures even when backup is served", async () => {
    const error = new Error("NBA schedule season does not match 2026-27");

    mocks.get.mockResolvedValue(encode({ ...saved, expiresAt: 0 }));
    rejectRefresh(error);

    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);

    expect(mocks.captureException).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("silently refreshes old versions", async () => {
    mocks.get.mockResolvedValue(encode({ oldShape: true }, "old-policy"));
    mocks.loader.mockResolvedValue(saved);

    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);

    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  it("reports current-version corruption", async () => {
    mocks.get.mockResolvedValue(encode({ games: "private cached value" }));
    mocks.loader.mockResolvedValue(saved);

    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);

    expect(mocks.captureException).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining("Current-version"),
      }),
      { tags: { source: "live-cache-validation" } },
    );
    expect(String(mocks.captureException.mock.calls[0]?.[0])).not.toContain(
      "private cached value",
    );
  });
});
