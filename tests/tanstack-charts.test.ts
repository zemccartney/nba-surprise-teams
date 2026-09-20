import type { ChartValue } from "@tanstack/charts/types";

import { createChartRuntime } from "@tanstack/charts/runtime";
import { describe, expect, it, vi } from "vitest";

import type { TrackerChart } from "../src/components/charts/tanstack";

import {
  dateTicks,
  paceChart,
  scatterBounds,
  scatterChart,
  seasonChart,
  teamChart,
} from "../src/components/charts/tanstack-options";
import { renderTrackerSvg } from "../src/components/charts/tanstack-svg";

vi.mock(
  import("../src/components/charts/tanstack-style"),
  async (importOriginal) => ({
    ...(await importOriginal()),
    readTheme: () => ({
      accent: "#818cf8",
      background: "#020617",
      brightRed: "#ff8073",
      green: "#15803d",
      lime: "#84cc16",
      pale: "#d9f99d",
      red: "#b91c1c",
      slate: "#94a3b8",
      yellow: "#facc15",
    }),
  }),
);
const render = <Row, X extends ChartValue, Y extends ChartValue>(
  chart: TrackerChart<Row, X, Y>,
  width = 600,
) => {
  const runtime = createChartRuntime<Row, X, Y>();
  try {
    return runtime.render(chart.definition, { height: 600, width });
  } finally {
    runtime.destroy();
  }
};

describe("application TanStack definitions", () => {
  it.each([390, 1440])(
    "paints only the configured plotting bounds at %ipx, leaving label gutters transparent",
    (width) => {
      const chart = seasonChart(
        {
          data: [
            {
              numSurprises: 2,
              seasonId: "2025",
              seasonRange: "2025–26",
              surpriseTeams: [],
            },
          ],
          latestSeasonYear: 2025,
        },
        600,
      );
      const scene = render(chart, width);
      const nodes = scene.nodes;
      const markup = renderTrackerSvg(
        scene,
        { ariaLabel: chart.label },
        '<g data-test-annotation=""/>',
      );
      const background = markup.match(
        /<rect[^>]*data-ts-key="tracker-plot-background"[^>]*>/,
      )?.[0];
      expect(scene.chart).toEqual({
        height: 524,
        width: width - 76,
        x: 60,
        y: 0,
      });
      expect(background).toContain('x="60"');
      expect(background).toContain('y="0"');
      expect(background).toContain(`width="${width - 76}"`);
      expect(background).toContain('height="524"');
      expect(markup).not.toContain('data-ts-key="background"');
      expect(markup).toContain('data-test-annotation=""');
      expect(markup).toContain('aria-label="Surprises per season"');
      expect(scene.nodes).toBe(nodes);
      expect(scene.theme.background).toBe("#020617");
    },
  );
  it("uses centered five-year ticks and crisp, interior-only grids with opaque labels", () => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      numSurprises: i % 4,
      seasonId: String(1993 + i),
      seasonRange: String(1993 + i),
      surpriseTeams: [],
    }));
    const chart = seasonChart({ data, latestSeasonYear: 2006 }, 600);
    const scene = render(chart);
    expect(scene.scales.x?.ticks.map((tick) => tick.value)).toEqual([
      "1995",
      "2000",
      "2005",
    ]);
    const markup = renderTrackerSvg(scene, { ariaLabel: chart.label });
    const labels = markup
      .matchAll(/<text[^>]*>/g)
      .map((match) => match[0])
      .toArray();
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).toContain('opacity="1"');
      expect(label).toContain('font-weight="700"');
    }
    const tickLabels = labels.filter((label) =>
      label.includes("x-tick-label:"),
    );
    for (const label of tickLabels)
      expect(label).toContain('text-anchor="middle"');
    const lines = markup
      .matchAll(/<line[^>]*data-ts-key="[xy]-grid:[^>]*>/g)
      .map((match) => match[0])
      .toArray();
    expect(lines).toHaveLength(5); // Three verticals and two interior horizontals.
    for (const line of lines) {
      const attribute = (name: string) =>
        Number(line.match(new RegExp(`${name}="([^"]+)"`))?.[1]);
      const isVertical = attribute("x1") === attribute("x2");
      const position = attribute(isVertical ? "x1" : "y1");
      const min = isVertical ? scene.chart.x : scene.chart.y;
      const max = min + (isVertical ? scene.chart.width : scene.chart.height);
      expect(position).toBeGreaterThan(min);
      expect(position).toBeLessThan(max);
      expect(position % 1).toBe(0.5);
      expect(line).toContain('stroke-opacity="1"');
    }
  });
  it("orders seasons chronologically while preserving original rows and true zero values", () => {
    const recent = {
      numSurprises: 0,
      seasonId: "2025",
      seasonRange: "2025–26",
      surpriseTeams: [],
    };
    const earlier = {
      numSurprises: 2,
      seasonId: "2024",
      seasonRange: "2024–25",
      surpriseTeams: [],
    };
    const data = [recent, earlier];
    const scene = render(seasonChart({ data, latestSeasonYear: 2025 }, 600));
    expect(scene.scales.x?.domain).toEqual(["2024", "2025"]);
    expect(scene.points).toHaveLength(2);
    expect(scene.points[0]?.datum).toBe(earlier);
    expect(scene.points[1]?.datum).toBe(recent);
    expect(scene.points[1]?.yValue).toBe(0);
    expect(data).toEqual([recent, earlier]);
  });
  it("keeps the rounded team domain instead of reinferring it from a factory", () => {
    const row = {
      name: "Charlotte Hornets",
      numEliminated: 11,
      numSurprised: 3,
      teamId: "CHA",
    };
    const scene = render(teamChart({ data: [row] }));
    expect(scene.scales.y?.domain).toEqual([-15, 5]);
    expect(scene.points.map((p) => p.yValue)).toEqual([3, -11]);
    expect(scene.points.every((p) => p.datum === row)).toBe(true);
    const markup = renderTrackerSvg(scene, { ariaLabel: "Teams" });
    const zero = markup.match(/<line[^>]*stroke-width="4"[^>]*>/)?.[0];
    expect(zero).toContain('stroke-opacity="1"');
    expect(markup).not.toMatch(/data-ts-key="x-tick:/);
    expect(markup).toContain(">Team</text>");
  });
  it("keeps explicit result colors even when an eliminated row is encountered first", () => {
    const eliminated = {
      isSurpriseTeam: false,
      logoSrc: "/a.svg",
      overUnder: 16,
      pace: -8,
      recordFmt: "18 - 64",
      seasonRange: "2025–26",
      teamName: "A",
    };
    const surprised = {
      ...eliminated,
      isSurpriseTeam: true,
      overUnder: 24,
      pace: 10,
      teamName: "B",
    };
    const scene = render(scatterChart({ data: [surprised, eliminated] }));
    expect(scene.points.map((p) => p.color)).toEqual(["#b91c1c", "#84cc16"]);
    expect(scene.points[0]?.datum).toBe(eliminated);
    expect(scene.scales.x?.domain).toEqual([15, 25]);
    expect(scene.scales.y?.domain).toEqual([-10, 15]);
  });
  it.each([50, 66, 82])(
    "keeps the full %i-game pace domain and threshold annotation",
    (numGames) => {
      const row = {
        date: "2025-10-22",
        pace: -5,
        projectedWins: 25,
        recordFmt: "1 - 1",
      };
      const chart = paceChart({
        data: [row],
        surprisedEmojiSrc: '/emoji".svg',
        surpriseRules: { numGames, overUnderCutoff: 30, paceTarget: 10 },
        winsToSurprise: 30,
      });
      const scene = render(chart);
      expect(scene.scales.y?.domain).toEqual([0, numGames]);
      expect(scene.points).toHaveLength(1);
      expect(scene.points[0]?.datum).toBe(row);
      const markup = renderTrackerSvg(scene, { ariaLabel: chart.label });
      expect(markup.match(/<line[^>]*stroke-width="4"[^>]*>/)?.[0]).toContain(
        'stroke-opacity="1"',
      );
      expect(chart.annotation?.(scene)).toContain(
        'aria-label="Surprise threshold: 30 wins"',
      );
      expect(chart.annotation?.(scene)).toContain('href="/emoji&quot;.svg"');
      expect(
        scene.gradients[0]?.stops.every((stop) => Number.isFinite(stop.offset)),
      ).toBe(true);
    },
  );
  it.each([
    { paint: "url(#pace-line-threshold)", stop: 0.64, values: [70, 20, 60] },
    { paint: "#84cc16", stop: 0, values: [60, 70] },
    { paint: "#ff8073", stop: 0, values: [20, 30] },
    { paint: "#ff8073", stop: 0, values: [20, 38] },
    { paint: "#84cc16", stop: 0, values: [38, 60] },
    { paint: "#84cc16", stop: 0, values: [38, 38] },
    { paint: "#ff8073", stop: 0, values: [20] },
  ])(
    "colors the pace stroke without splitting or changing games: $values",
    ({ paint, stop, values }) => {
      const data = values.map((projectedWins, i) => ({
        date: `game-${i}`,
        pace: projectedWins - 38,
        projectedWins,
        recordFmt: "1 - 1",
      }));
      const chart = paceChart({
        data,
        surprisedEmojiSrc: "/emoji.svg",
        surpriseRules: { numGames: 82, overUnderCutoff: 30, paceTarget: 10 },
        winsToSurprise: 38,
      });
      const scene = render(chart);
      expect(scene.points.map((point) => point.datum)).toEqual(data);
      expect(
        scene.gradients.find(
          (gradient) => gradient.id === "pace-line-threshold",
        )?.stops,
      ).toEqual([
        { color: "#84cc16", offset: 0 },
        { color: "#84cc16", offset: stop },
        { color: "#ff8073", offset: stop },
        { color: "#ff8073", offset: 1 },
      ]);
      const markup = renderTrackerSvg(
        scene,
        { ariaLabel: chart.label },
        chart.annotation?.(scene),
      );
      expect(markup).toContain(`stroke="${paint}"`);
      expect(markup).toContain('font-weight="700">38</text>');
    },
  );
  it("renders an empty pace season without inventing games or invalid gradients", () => {
    const scene = render(
      paceChart({
        data: [],
        surprisedEmojiSrc: "/emoji.svg",
        surpriseRules: { numGames: 82, overUnderCutoff: 30, paceTarget: 10 },
        winsToSurprise: 38,
      }),
    );
    expect(scene.points).toHaveLength(0);
    expect(scene.scales.y?.domain).toEqual([0, 82]);
    expect(
      scene.gradients[0]?.stops.every((stop) => Number.isFinite(stop.offset)),
    ).toBe(true);
  });
  it("rebuilds sparse date ticks responsively without dropping games", () => {
    const data = Array.from({ length: 82 }, (_, i) => ({
      date: `game-${i}`,
      pace: 2,
      projectedWins: 40,
      recordFmt: "1 - 1",
    }));
    const chart = paceChart({
      data,
      surprisedEmojiSrc: "/emoji.svg",
      surpriseRules: { numGames: 82, overUnderCutoff: 30, paceTarget: 10 },
      winsToSurprise: 38,
    });
    const narrow = render(chart, 390),
      wide = render(chart, 1200);
    expect(wide.scales.x?.ticks.length).toBeGreaterThan(
      narrow.scales.x?.ticks.length ?? 0,
    );
    expect(narrow.points).toHaveLength(82);
    expect(
      dateTicks(
        data.map((row) => row.date),
        390,
      ),
    ).toEqual(["game-0", "game-28", "game-56"]);
    expect(
      dateTicks(
        data.map((row) => row.date),
        720,
      ),
    ).toEqual([
      "game-0",
      "game-14",
      "game-28",
      "game-42",
      "game-56",
      "game-70",
    ]);
    for (const width of [320, 390, 720, 1200]) {
      const scene = render(chart, width);
      const markup = renderTrackerSvg(scene, { ariaLabel: chart.label });
      const labels = markup
        .matchAll(/<text[^>]*data-ts-key="x-tick-label:[^>]*>/g)
        .toArray();
      expect(labels.length).toBeGreaterThan(0);
      for (const [label] of labels) {
        expect(label).toContain('text-anchor="middle"');
        expect(
          Number(label.match(/ x="([^"]+)"/)?.[1]) + 40,
        ).toBeLessThanOrEqual(width);
      }
      expect(scene.points).toHaveLength(82);
    }
  });
  it("bounds scatter axes beyond exact multiples and handles empty input", () => {
    expect(scatterBounds([-10, 20])).toEqual([-15, 25]);
    expect(scatterBounds([])).toEqual([0, 5]);
    expect(dateTicks([], 390)).toEqual([]);
    expect(dateTicks(["one"], 390)).toEqual(["one"]);
  });
});
