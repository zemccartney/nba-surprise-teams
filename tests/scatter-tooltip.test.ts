import { describe, expect, it } from "vitest";

import { placeScatterTooltip } from "../src/components/charts/scatter-tooltip";

describe("scatter tooltip placement", () => {
  it.each([320, 390, 768, 1440])(
    "keeps full histories horizontally contained and clear of nearby dots at %ipx",
    (viewportWidth) => {
      const width = Math.min(512, viewportWidth - 32);
      for (const viewportHeight of [568, 844, 1000]) {
        for (const height of [150, 558, 1000]) {
          for (const x of [20, viewportWidth / 2, viewportWidth - 20]) {
            for (const y of [20, viewportHeight / 2, viewportHeight - 20]) {
              const box = placeScatterTooltip({
                height,
                offset: 40,
                viewportHeight,
                viewportWidth,
                width,
                x,
                y,
              });
              expect(box.x).toBeGreaterThanOrEqual(16);
              expect(box.x + width).toBeLessThanOrEqual(viewportWidth - 16);
              expect(
                box.x >= x + 40 ||
                  box.x + width <= x - 40 ||
                  box.y >= y + 40 ||
                  box.y + height <= y - 40,
              ).toBe(true);
            }
          }
        }
      }
    },
  );
  it("lets a tall mobile tooltip extend below the viewport instead of shifting over the dot", () => {
    expect(
      placeScatterTooltip({
        height: 558,
        offset: 40,
        viewportHeight: 844,
        viewportWidth: 390,
        width: 358,
        x: 200,
        y: 440,
      }),
    ).toEqual({ x: 16, y: 480 });
  });
});
