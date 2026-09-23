import { resolveFocusPresentation } from "@tanstack/charts";
import { createChartRuntime } from "@tanstack/charts/runtime";
import { describe, expect, it } from "vitest";

import type {
  SurprisesPerSeasonChartProps,
  TeamSeasonPaceChartData,
} from "../src/components/charts/data";

import {
  paceChart,
  seasonChart,
} from "../src/components/charts/tanstack-options";
import { theme } from "../src/components/charts/tanstack-style";
import { renderTrackerSvg } from "../src/components/charts/tanstack-svg";

describe("CSS-backed chart paints", () => {
  it("retains variable paints in pace gradients and native focused markers", () => {
    const runtime = createChartRuntime<
      TeamSeasonPaceChartData["data"][number],
      string,
      number
    >();
    try {
      const chart = paceChart({
        data: [
          {
            date: "2025-10-22",
            pace: 44,
            projectedWins: 82,
            recordFmt: "1 - 0",
          },
          {
            date: "2025-10-25",
            pace: -18,
            projectedWins: 20,
            recordFmt: "1 - 3",
          },
        ],
        surprisedEmojiSrc: "/emoji.svg",
        surpriseRules: { numGames: 82, overUnderCutoff: 30, paceTarget: 10 },
        winsToSurprise: 38,
      });
      const scene = runtime.render(chart.definition, {
        height: 600,
        width: 600,
      });
      const point = scene.points[1];
      if (!point) throw new Error("Missing below-threshold point");
      const focus = resolveFocusPresentation(scene, {
        group: [point],
        pinned: false,
        primary: point,
        source: "keyboard",
      });
      const markup = renderTrackerSvg(
        { ...scene, nodes: [...focus.under, ...scene.nodes, ...focus.over] },
        { ariaLabel: chart.label },
      );
      expect(markup).toContain('stop-color="var(--color-pace-red)"');
      expect(markup).toContain('stop-color="var(--color-lime-500)"');
      expect(markup).toMatch(
        /<circle[^>]*fill="var\(--color-pace-red\)"[^>]*stroke="var\(--color-pace-red\)"/,
      );
    } finally {
      runtime.destroy();
    }
  });
  it("maps semantic roles directly to global tokens without needing a document", () => {
    expect(theme).toEqual({
      accent: "var(--color-indigo-400)",
      background: "var(--color-slate-950)",
      brightRed: "var(--color-pace-red)",
      green: "var(--color-green-700)",
      lime: "var(--color-lime-500)",
      pale: "var(--color-lime-200)",
      red: "var(--color-red-700)",
      slate: "var(--color-slate-400)",
      yellow: "var(--color-yellow-400)",
    });
  });
  it("preserves CSS variable references through the actual SVG renderer", () => {
    const runtime = createChartRuntime<
      SurprisesPerSeasonChartProps["data"][number],
      string,
      number
    >();
    try {
      const chart = seasonChart(
        {
          data: [
            {
              numSurprises: 1,
              seasonId: "2025",
              seasonRange: "2025–26",
              surpriseTeams: [],
            },
          ],
          latestSeasonYear: 2025,
        },
        600,
      );
      const scene = runtime.render(chart.definition, {
        height: 600,
        width: 600,
      });
      const markup = renderTrackerSvg(scene, { ariaLabel: chart.label });
      expect(markup).toContain('fill="var(--color-lime-500)"');
      expect(markup).toContain('fill="var(--color-green-700)"');
      expect(markup).toContain('fill="var(--color-slate-950)"');
    } finally {
      runtime.destroy();
    }
  });
});
