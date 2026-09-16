import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveLoaderResponse } from "../src/loaders/live/utils";

import { LIVE_DATA_VERSION } from "../src/loaders/live";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  get: vi.fn(),
  getEntry: vi.fn(),
  getLatestSeason: vi.fn(),
  loader: vi.fn(),
  put: vi.fn(),
}));
vi.mock(import("@sentry/cloudflare"), () => ({
  captureException: mocks.captureException,
}));
vi.mock("astro:content", () => ({ getEntry: mocks.getEntry }));
vi.mock(import("../src/content-utils"), async (importOriginal) => ({
  ...(await importOriginal()),
  getLatestSeason: mocks.getLatestSeason,
}));
vi.mock(import("../src/loaders/live"), async (importOriginal) => ({
  ...(await importOriginal()),
  default: mocks.loader,
}));
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
  seasonId: string;
}) => Promise<LiveLoaderResponse>;

const latest = {
  data: { endDate: "2027-04-12", id: "2026", startDate: "2026-10-20" },
  id: "2026",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T16:00:00Z"));
  vi.spyOn(console, "log").mockReturnValue(undefined);
  mocks.getLatestSeason.mockResolvedValue(latest);
  mocks.getEntry.mockResolvedValue(latest);
  // KV returns null for an absent key.
  // eslint-disable-next-line unicorn/no-null
  mocks.get.mockResolvedValue(null);
});
afterEach(() => {
  vi.useRealTimers();
});

const expectNoLiveAccess = () => {
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.loader).not.toHaveBeenCalled();
  expect(mocks.put).not.toHaveBeenCalled();
};

describe("latest-season live action contract", () => {
  it("rejects historical requests before live access", async () => {
    mocks.getEntry.mockResolvedValue({
      data: { endDate: "2026-04-12", id: "2025", startDate: "2025-10-21" },
      id: "2025",
    });
    await expect(run({ seasonId: "2025" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expectNoLiveAccess();
  });

  it("returns NOT_FOUND for unknown seasons", async () => {
    mocks.getEntry.mockResolvedValue(undefined);
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
    mocks.loader.mockRejectedValue(new Error("Feed unavailable"));
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
    mocks.loader.mockRejectedValue(new Error("Feed unavailable"));
    await expect(run({ seasonId: "2026" })).resolves.toEqual(saved);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("reports loader validation failures once", async () => {
    const error = new Error("NBA schedule season does not match 2026-27");

    mocks.loader.mockRejectedValue(error);

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
    mocks.loader.mockRejectedValue(error);

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
