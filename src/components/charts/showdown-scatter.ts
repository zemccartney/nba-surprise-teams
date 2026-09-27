import { defineChart } from "@tanstack/charts";
import { dot } from "@tanstack/charts/dot";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";

import type {
  ShowdownHistoryPoint,
  ShowdownHistoryProps,
} from "./showdown-standings";
import type { TrackerChart } from "./tanstack";

import {
  describeShowdownHistory,
  showdownHistoryBody,
} from "./showdown-standings";
import { axis, chartTheme, grid, theme } from "./tanstack-style";

type ScatterPoint = ShowdownHistoryPoint & { gamesPlayed: number; pct: number };
export function showdownScatterChart({
  data,
}: ShowdownHistoryProps): TrackerChart<ScatterPoint, number, number> {
  const rows = data
    .flatMap((row) =>
      row.pct === undefined
        ? []
        : [{ ...row, gamesPlayed: row.w + row.l, pct: row.pct }],
    )
    .toSorted(
      (a, b) =>
        a.gamesPlayed - b.gamesPlayed ||
        a.pct - b.pct ||
        a.name.localeCompare(b.name),
    );
  const observedMax = Math.max(1, ...rows.map((row) => row.gamesPlayed));
  const tickStep = Math.max(25, Math.ceil(observedMax / 100) * 25);
  const maxGames = Math.ceil(observedMax / tickStep) * tickStep;
  return {
    body: showdownHistoryBody,
    definition: defineChart({
      margin: { bottom: 76, left: 68, right: 16, top: 16 },
      marks: [
        dot(rows, {
          fill: theme.green,
          id: "showdown-franchises",
          r: 6,
          states: [
            {
              style: { r: 8, stroke: theme.accent, strokeWidth: 2 },
              when: { focus: "primary" },
            },
          ],
          x: "gamesPlayed",
          y: "pct",
        }),
      ],
      scales: {
        x: {
          axis: {
            ...axis("Games played", 56),
            ticks: {
              format: String,
              padding: 12,
              values: Array.from(
                { length: maxGames / tickStep + 1 },
                (_, index) => index * tickStep,
              ),
            },
          },
          grid: grid(theme),
          scale: scaleLinear().domain([0, maxGames]),
        },
        y: {
          axis: {
            ...axis("Win percentage", 48),
            ticks: {
              format: (value) => `${Number(value) * 100}%`,
              padding: 10,
              values: [0, 0.25, 0.5, 0.75, 1],
            },
          },
          grid: grid(theme),
          scale: scaleLinear().domain([0, 1]),
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
      "Archived candidate head-to-head records by franchise. Games played on the horizontal axis; winning percentage on the vertical axis. Franchises without qualifying games have no percentage and are omitted. Keyboard order is games played, then percentage.",
    label: "Showdown win percentage versus games played",
  };
}
