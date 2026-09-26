import type { ChartFocusStrategy } from "@tanstack/charts/types";

import { defineChart } from "@tanstack/charts";
import { barX } from "@tanstack/charts/bar";
import { crosshair } from "@tanstack/charts/crosshair";
import { focusNearestY } from "@tanstack/charts/focus";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";

import type { TrackerChart } from "./tanstack";

import {
  add,
  axis,
  chartTheme,
  grid,
  logo,
  node,
  theme,
} from "./tanstack-style";

export interface ShowdownHistoryPoint {
  l: number;
  logoSrc: string;
  name: string;
  pct?: number | undefined;
  teamId: string;
  w: number;
}
export interface ShowdownHistoryProps {
  data: ShowdownHistoryPoint[];
}

export const showdownPct = (pct: number | undefined) =>
  pct === undefined ? "—" : `${(pct * 100).toFixed(1)}%`;
export const describeShowdownHistory = (row: ShowdownHistoryPoint) =>
  `${row.name}. ${row.w} wins, ${row.l} losses in ${row.w + row.l} head-to-head games. ${row.pct === undefined ? "No qualifying games." : `Winning percentage ${showdownPct(row.pct)}.`} Archived seasons only; includes franchise history.`;

export const showdownHistoryFocus: ChartFocusStrategy<
  ShowdownHistoryPoint,
  number,
  string
> = {
  ...focusNearestY,
  // Follow ranked visual order, not the preset's alphabetical category order.
  navigation: (points) => points.toSorted((a, b) => a.y - b.y),
};

export function showdownHistoryChart({
  data,
}: ShowdownHistoryProps): TrackerChart<ShowdownHistoryPoint, number, string> {
  return {
    annotation: (scene) =>
      `<g aria-hidden="true" fill="var(--color-green-200)" font-size="14" font-family="var(--font-mono)"><text x="${scene.chart.x + scene.chart.width + 12}" y="18">W–L · PCT</text>${scene.points.map((point) => `<text x="${scene.chart.x + scene.chart.width + 12}" y="${point.y}" dominant-baseline="middle">${point.datum.w}–${point.datum.l} · ${showdownPct(point.datum.pct)}</text>`).join("")}</g>`,
    body: (row) =>
      add(
        node("div"),
        add(
          node("h3", "tooltip-heading-centered"),
          logo(row.name, row.logoSrc),
          document.createTextNode(` ${row.name}`),
        ),
        node("p", "", describeShowdownHistory(row)),
      ),
    definition: defineChart({
      focus: showdownHistoryFocus,
      margin: { bottom: 60, left: 56, right: 156, top: 32 },
      marks: [
        barX(data, {
          fill: "var(--color-showdown-red)",
          id: "showdown-history",
          maxThickness: 24,
          x: (row) => row.pct ?? 0,
          y: "teamId",
        }),
        crosshair({
          x: false,
          y: { band: { fill: theme.slate, fillOpacity: 0.3 } },
        }),
      ],
      maxFocusDistance: Infinity,
      scales: {
        x: {
          axis: {
            ...axis("Win percentage", 42),
            tickLabels: { fontSize: 12 },
            ticks: {
              format: (value) => `${Number(value) * 100}%`,
              padding: 8,
              values: [0, 0.25, 0.5, 0.75, 1],
            },
          },
          grid: grid(theme),
          scale: scaleLinear().domain([0, 1]),
        },
        y: {
          axis: {
            ...axis("", 0),
            ticks: { padding: 10, values: data.map((row) => row.teamId) },
          },
          scale: scaleBand<string>()
            .domain(data.map((row) => row.teamId))
            .paddingInner(0.25)
            .paddingOuter(0.1),
        },
      },
      theme: chartTheme(theme),
      tooltip: {
        anchor: "point",
        className: "tracker-tooltip",
        format: (point) => describeShowdownHistory(point.datum),
        offset: 28,
        placement: ["top", "bottom"],
        use: tooltip,
      },
    }),
    description:
      "All franchises ranked by head-to-head winning percentage in archived seasons. Only matchups between that season's surprise candidates count. No-game teams appear last with an em dash, not a zero percentage.",
    label: "Historic Showdown standings",
  };
}
