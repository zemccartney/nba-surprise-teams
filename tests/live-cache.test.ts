import { afterEach, expect, it, vi } from "vitest";

import { liveCacheControl } from "../src/loaders/live/utils";

afterEach(() => vi.useRealTimers());

it("counts down and clamps expired max-age", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-22T23:30:00Z"));
  const expiry = Date.parse("2026-10-23T01:25:00Z");
  expect(liveCacheControl(expiry)).toBe("public, max-age=6900");
  vi.advanceTimersByTime(500);
  expect(liveCacheControl(expiry)).toBe("public, max-age=6899");
  vi.setSystemTime(new Date(expiry + 1000));
  expect(liveCacheControl(expiry)).toBe("public, max-age=0");
});

it("omits headers without an expiry", () => {
  expect(liveCacheControl()).toBeUndefined();
});
