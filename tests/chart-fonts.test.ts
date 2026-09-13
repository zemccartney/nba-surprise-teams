import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForChartFonts } from "../src/components/charts/fonts";

afterEach(() => vi.useRealTimers());

describe("chart font readiness", () => {
  it("loads regular and bold fonts", async () => {
    const load = vi.fn().mockResolvedValue([]);
    await waitForChartFonts({ load }, "monospace");
    expect(load.mock.calls).toEqual([
      ["16px monospace"],
      ["bold 16px monospace"],
    ]);
  });

  it("tolerates failed loads and synchronous font API errors", async () => {
    await expect(
      waitForChartFonts(
        { load: () => Promise.reject(new Error("offline")) },
        "mono",
      ),
    ).resolves.toBeUndefined();
    await expect(
      waitForChartFonts(
        {
          load: () => {
            throw new Error("unavailable");
          },
        },
        "mono",
      ),
    ).resolves.toBeUndefined();
  });

  it("bounds stalled loads and clears the timer", async () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const pending = waitForChartFonts(
      {
        load: () =>
          new Promise(() => {
            /*
            Deliberately never settles.
            */
          }),
      },
      "mono",
    ).then(done);
    await vi.advanceTimersByTimeAsync(1499);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
