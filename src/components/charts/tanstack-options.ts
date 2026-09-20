import type { ChartPoint } from "@tanstack/charts/types";

import { defineChart } from "@tanstack/charts";
import { areaY } from "@tanstack/charts/area";
import { barY } from "@tanstack/charts/bar";
import { crosshair } from "@tanstack/charts/crosshair";
import { d3Curve } from "@tanstack/charts/d3/shape";
import { dot } from "@tanstack/charts/dot";
import { focusGuideX } from "@tanstack/charts/focus/guide";
import { lineY } from "@tanstack/charts/line";
import { decorative } from "@tanstack/charts/mark/decorative";
import { ruleY } from "@tanstack/charts/rule";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";
import { scalePoint } from "@tanstack/charts/scales/point";
import { tooltip } from "@tanstack/charts/tooltip";
import { curveMonotoneX } from "d3-shape";

import type { SurprisesByTeamChartProps } from "./surprises-by-team";
import type { SurprisesPerSeasonChartProps } from "./surprises-per-season";
import type { TrackerChart } from "./tanstack";
import type { TeamSeasonPaceChartData } from "./team-season-pace";
import type { TeamSeasonScatterplotProps } from "./team-season-scatter";

import { signedFormatter } from "../../utils";
import {
  add,
  axis,
  chartTheme,
  grid,
  labeled,
  logo,
  node,
  readTheme,
  ticks,
} from "./tanstack-style";

type Game = TeamSeasonPaceChartData["data"][number];
type Scatter = TeamSeasonScatterplotProps["data"][number];
type Season = SurprisesPerSeasonChartProps["data"][number];
type Team = SurprisesByTeamChartProps["data"][number];
const curve = d3Curve(curveMonotoneX);
const escapeSvg = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const tooltipOptions = {
  anchor: "point" as const,
  className: "tracker-tooltip",
  // Clearance for the focused dot and the popover's 12px spread/blur shadow.
  offset: 28,
  // Horizontal placement can clamp back over the dot on narrow charts.
  // Prefer above/below; the library still confines the tooltip to its host.
  placement: ["top", "bottom"] as const,
  use: tooltip,
};

export const describeSeason = (row: Season) =>
  `${row.seasonRange} season. ${row.numSurprises} surprise ${row.numSurprises === 1 ? "team" : "teams"}. ${row.surpriseTeams.map((team) => team.name).join(", ")}`;
export const seasonBody = (row: Season): HTMLElement => {
  const body = add(
    node("div"),
    node("h3", "tooltip-heading-centered", `${row.seasonRange} Season`),
  );
  if (row.surpriseTeams.length === 0)
    return add(body, node("p", "", "No surprises this year"));
  const list = node("ul", "tooltip-list");
  for (const team of row.surpriseTeams)
    add(
      list,
      add(
        node("li", "tooltip-list-item"),
        logo(team.name, team.logoSrc),
        document.createTextNode(` ${team.name}`),
      ),
    );
  return add(
    body,
    node("h4", "tooltip-section-heading", "Surprise Teams:"),
    list,
  );
};
export const seasonChart = (
  { data }: SurprisesPerSeasonChartProps,
  height: number,
): TrackerChart<Season, string, number> => {
  const t = readTheme();
  const rows = data.toSorted((a, b) => Number(a.seasonId) - Number(b.seasonId));
  const colors = new Map(data.map((row, i) => [row, i % 2 ? t.pale : t.green]));
  const fill = (row: Season) => colors.get(row) ?? t.green;
  const max = Math.max(1, ...rows.map((row) => row.numSurprises));
  const visibleTicks = rows
    .map((row) => row.seasonId)
    .filter((value) => Number(value) % 5 === 0);
  return {
    body: seasonBody,
    definition: defineChart({
      focus: "nearest-x",
      // Half a four-digit tick label fits beyond the final bar's center.
      margin: { bottom: 76, left: 60, right: 16, top: 0 },
      marks: [
        barY(rows, {
          fill,
          id: "seasons",
          maxThickness: 40,
          x: "seasonId",
          y: "numSurprises",
        }),
        // Decorative slivers preserve zero counts and original interaction rows.
        decorative(
          barY(
            rows.filter((row) => row.numSurprises === 0),
            {
              fill,
              id: "zero-seasons",
              maxThickness: 40,
              x: "seasonId",
              y: () => (max * 10) / Math.max(1, height - 76),
            },
          ),
        ),
        crosshair({
          x: { band: { fill: t.slate, fillOpacity: 0.5 } },
          y: false,
        }),
      ],
      maxFocusDistance: Infinity,
      scales: {
        x: {
          axis: {
            ...axis("Season", 56),
            tickLabels: {
              anchor: "middle",
              fontSize: 16,
              fontWeight: 700,
              opacity: 1,
            },
            ticks: { padding: 12, size: 6, values: visibleTicks },
          },
          grid: grid(t),
          scale: scaleBand<string>()
            .domain(rows.map((row) => row.seasonId))
            .paddingInner(0.2)
            .paddingOuter(0.1),
        },
        y: {
          axis: {
            ...axis("# Surprises", 40),
            tickLabels: {
              dy: ({ value }) => (value === max ? 10 : 0),
              fontSize: 16,
              fontWeight: 700,
              opacity: 1,
            },
            ticks: { padding: 12, size: 6, values: ticks(0, max, 1) },
          },
          grid: grid(t),
          scale: scaleLinear().domain([0, max]),
        },
      },
      theme: chartTheme(t),
      tooltip: {
        ...tooltipOptions,
        format: (point) => describeSeason(point.datum),
      },
    }),
    description:
      "Number of surprise teams each season. Ordered from earliest to latest season.",
    label: "Surprises per season",
  };
};

const historyRange = (duration: [number, number?]) =>
  `${duration[0]} - ${duration[1] === undefined ? "present" : duration[1] + 1}`;
export const describeTeam = (row: Team) =>
  `${row.name}. ${row.numSurprised} surprise seasons. ${row.numEliminated} eliminated seasons.${"history" in row ? ` Team history: ${row.history.map((h) => `${h.name}, ${historyRange(h.duration)}`).join("; ")}.` : ""}`;
export const teamBody = (row: Team): HTMLElement => {
  const title = node("h3", "tooltip-heading-centered");
  if (!("history" in row) && row.logoSrc)
    add(title, logo(row.name, row.logoSrc));
  add(title, document.createTextNode(` ${row.name}`));
  const body = add(
    node("div"),
    title,
    node(
      "p",
      "tooltip-centered",
      `Surprise Record: ${row.numSurprised} - ${row.numEliminated}`,
    ),
  );
  if ("history" in row) {
    const list = node("ul", "tooltip-list");
    for (const h of row.history)
      add(
        list,
        add(
          node("li", "tooltip-list-item"),
          logo(h.name, h.logoSrc, 32),
          document.createTextNode(` ${h.name} (${historyRange(h.duration)})`),
        ),
      );
    add(body, list);
  }
  return body;
};
export const teamChart = ({
  data,
}: SurprisesByTeamChartProps): TrackerChart<Team, string, number> => {
  const t = readTheme();
  const rows = data.toSorted((a, b) => a.teamId.localeCompare(b.teamId));
  const min =
    -Math.ceil(Math.max(1, ...rows.map((r) => r.numEliminated)) / 5) * 5;
  const max =
    Math.ceil(Math.max(1, ...rows.map((r) => r.numSurprised)) / 5) * 5;
  return {
    body: teamBody,
    definition: defineChart({
      focus: "group-x",
      margin: { bottom: 56, left: 60, right: 8, top: 12 },
      marks: [
        barY(rows, {
          fill: t.green,
          id: "surprised",
          x: "teamId",
          y: "numSurprised",
        }),
        barY(rows, {
          fill: t.red,
          id: "eliminated",
          x: "teamId",
          y: (r) => -r.numEliminated,
        }),
        ruleY([0], {
          stroke: t.yellow,
          strokeOpacity: 1,
          strokeWidth: 4,
        }),
        crosshair({
          x: { band: { fill: t.slate, fillOpacity: 0.5 } },
          y: false,
        }),
      ],
      maxFocusDistance: Infinity,
      scales: {
        x: {
          axis: { ...axis("Team", 40), tickLabels: false, ticks: false },
          scale: scaleBand<string>()
            .domain(rows.map((r) => r.teamId))
            .paddingInner(0.1)
            .paddingOuter(0.05),
        },
        y: {
          axis: {
            ...axis("Season Results", 40),
            ticks: {
              format: (value) => String(Math.abs(value)),
              padding: 12,
              size: 6,
              values: ticks(min, max),
            },
          },
          grid: grid(t),
          scale: scaleLinear().domain([min, max]),
        },
      },
      theme: chartTheme(t),
      tooltip: {
        ...tooltipOptions,
        formatGroup: (points) =>
          points[0] ? describeTeam(points[0].datum) : "",
      },
    }),
    description:
      "Surprise and eliminated season counts. Ordered by team code from left to right.",
    label: "Surprise results by team",
  };
};

export const scatterBounds = (values: number[]): [number, number] => {
  if (values.length === 0) return [0, 5];
  return [
    Math.ceil(Math.min(...values) / 5) * 5 - 5,
    Math.floor(Math.max(...values) / 5) * 5 + 5,
  ];
};
export const describeScatter = (r: Scatter) =>
  `${r.seasonRange} ${r.teamName}. Over/under ${r.overUnder}. Pace ${signedFormatter.format(r.pace)}. Record ${r.recordFmt}. ${r.isSurpriseTeam ? "Surprise team" : "Eliminated"}.`;
export const scatterBody = (r: Scatter): HTMLElement =>
  add(
    node("div"),
    add(
      node("h3", "tooltip-heading-centered"),
      logo(r.teamName, r.logoSrc),
      document.createTextNode(` ${r.seasonRange} ${r.teamName}`),
    ),
    labeled(
      "Pace (Record)",
      `${signedFormatter.format(r.pace)} (${r.recordFmt})`,
      "tooltip-para",
    ),
    labeled("Over/Under:", String(r.overUnder)),
  );
export const scatterChart = ({
  data,
}: TeamSeasonScatterplotProps): TrackerChart<Scatter, number, number> => {
  const t = readTheme();
  const rows = data.toSorted(
    (a, b) =>
      a.overUnder - b.overUnder ||
      a.pace - b.pace ||
      a.teamName.localeCompare(b.teamName) ||
      a.seasonRange.localeCompare(b.seasonRange),
  );
  const [xMin, xMax] = scatterBounds(rows.map((r) => r.overUnder));
  const [yMin, yMax] = scatterBounds(rows.map((r) => r.pace));
  return {
    body: scatterBody,
    definition: defineChart({
      color: {
        scale: scaleOrdinal(["surprise", "eliminated"], [t.lime, t.red]),
      },
      margin: { bottom: 76, left: 60, right: 8, top: 12 },
      marks: [
        dot(rows, {
          color: (r) => (r.isSurpriseTeam ? "surprise" : "eliminated"),
          id: "team-seasons",
          r: 4.5,
          states: [
            {
              style: { r: 6.3, stroke: t.accent, strokeWidth: 2 },
              when: { focus: "primary" },
            },
          ],
          x: "overUnder",
          y: "pace",
        }),
      ],
      scales: {
        x: {
          axis: {
            ...axis("Over/Under", 56),
            ticks: { padding: 12, size: 6, values: ticks(xMin, xMax) },
          },
          grid: grid(t),
          scale: scaleLinear().domain([xMin, xMax]),
        },
        y: {
          axis: axis("Pace", 40),
          grid: grid(t),
          scale: scaleLinear().domain([yMin, yMax]),
        },
      },
      theme: chartTheme(t),
      tooltip: { ...tooltipOptions, format: (p) => describeScatter(p.datum) },
    }),
    description:
      "Ordered by over/under from low to high, then pace from low to high.",
    label: "Pace versus over/under by team season",
  };
};

export const dateTicks = (dates: string[], width: number): string[] => {
  if (dates.length <= 1) return dates;
  const plotWidth = Math.max(1, width - 84);
  const count = Math.max(1, Math.floor(plotWidth / 100));
  const step = Math.ceil(dates.length / count);
  // Regular intervals, as in the reference. Don't force the last game onto
  // the axis: its centered date would extend beyond the page's right edge.
  return dates.filter(
    (_date, index) =>
      index % step === 0 &&
      84 + (index * plotWidth) / (dates.length - 1) + 40 <= width,
  );
};

export const describeGame = (r: Game) =>
  `${r.date}. Record ${r.recordFmt}. Projected wins ${r.projectedWins}. Pace ${signedFormatter.format(r.pace)}.`;
export const gameBody = (r: Game): HTMLElement =>
  add(
    node("div"),
    node("p", "tooltip-heading", r.date),
    labeled("Record:", r.recordFmt),
    labeled("Projected Wins:", String(r.projectedWins)),
    labeled("Pace:", signedFormatter.format(r.pace)),
  );
export const paceChart = ({
  data,
  surprisedEmojiSrc,
  surpriseRules,
  winsToSurprise,
}: TeamSeasonPaceChartData): TrackerChart<Game, string, number> => {
  const t = readTheme();
  const top = Math.max(winsToSurprise, ...data.map((r) => r.projectedWins));
  const bottom = Math.min(winsToSurprise, ...data.map((r) => r.projectedWins));
  const stop = top === bottom ? 0 : (top - winsToSurprise) / (top - bottom);
  const pointColor = (row: Game) =>
    row.projectedWins < winsToSurprise ? t.brightRed : t.lime;
  const lineTop = Math.max(...data.map((r) => r.projectedWins));
  const lineBottom = Math.min(...data.map((r) => r.projectedWins));
  const isCrossing = lineBottom < winsToSurprise && lineTop > winsToSurprise;
  // Stroke gradients use the line's own bounding box, not the area's box
  // (which also includes the threshold). Flat/one-sided lines use solid paint.
  const lineStop = isCrossing
    ? (lineTop - winsToSurprise) / (lineTop - lineBottom)
    : 0;
  const lineStroke = isCrossing
    ? "url(#pace-line-threshold)"
    : lineBottom < winsToSurprise
      ? t.brightRed
      : t.lime;
  return {
    annotation: ({ scales }) => {
      // eslint-disable-next-line unicorn/no-array-callback-reference -- Numeric scale, not Array.map.
      const y = scales.y?.map(winsToSurprise);
      if (y === undefined || !Number.isFinite(y)) return "";
      // Part of the renderer output so focus and resize cannot remove the label.
      return `<g data-threshold-label=""><text x="48" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${escapeSvg(t.lime)}" font-size="16" font-weight="700">${winsToSurprise}</text><image href="${escapeSvg(surprisedEmojiSrc)}" x="54" y="${y - 8}" width="16" height="16" role="img" aria-label="Surprise threshold: ${winsToSurprise} wins" /></g>`;
    },
    body: gameBody,
    definition: defineChart({
      chart: ({ width }) => ({
        gradients: [
          {
            id: "pace-threshold",
            stops: [
              { color: t.green, offset: 0 },
              { color: t.green, offset: stop },
              { color: t.red, offset: stop },
              { color: t.red, offset: 1 },
            ],
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 1,
          },
          {
            id: "pace-line-threshold",
            stops: [
              { color: t.lime, offset: 0 },
              { color: t.lime, offset: lineStop },
              { color: t.brightRed, offset: lineStop },
              { color: t.brightRed, offset: 1 },
            ],
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 1,
          },
        ],
        margin: { bottom: 30, left: 84, right: 0, top: 0 },
        marks: [
          decorative(
            areaY(data, {
              curve,
              fill: "url(#pace-threshold)",
              fillOpacity: 0.8,
              id: "pace-area",
              x: "date",
              y1: winsToSurprise,
              y2: "projectedWins",
            }),
          ),
          lineY(data, {
            curve,
            id: "pace-line",
            stroke: lineStroke,
            strokeWidth: 1.5,
            x: "date",
            y: "projectedWins",
          }),
          focusGuideX(data, {
            id: "pace-focus",
            marker: {
              fill: pointColor,
              radius: 4,
              stroke: pointColor,
              strokeWidth: 1,
            },
            x: "date",
            xRule: false,
            y: "projectedWins",
            yRule: false,
          }),
          ruleY([winsToSurprise], {
            stroke: t.lime,
            strokeOpacity: 1,
            strokeWidth: 4,
          }),
        ],
        scales: {
          x: {
            axis: {
              ...axis("", 0),
              tickLabels: {
                anchor: "middle",
                fontSize: 16,
                fontWeight: 700,
                opacity: 1,
                thin: true,
              },
              ticks: {
                padding: 12,
                size: 6,
                values: dateTicks(
                  data.map((row) => row.date),
                  width,
                ),
              },
            },
            grid: grid(t),
            scale: scalePoint<string>().domain(data.map((r) => r.date)),
          },
          y: {
            axis: {
              ...axis("Projected Wins", 64),
              tickLabels: {
                dy: ({ value }) => (value === surpriseRules.numGames ? 10 : 0),
                fontSize: 16,
                fontWeight: 700,
                opacity: 1,
              },
              ticks: {
                padding: 12,
                size: 0,
                values: [0, surpriseRules.numGames],
              },
            },
            scale: scaleLinear().domain([0, surpriseRules.numGames]),
          },
        },
        // The native focus guide supplies the data-colored marker instead of
        // the theme's single-color ring, for both pointer and keyboard focus.
        theme: chartTheme(t),
      }),
      focus: "nearest-x",
      maxFocusDistance: Infinity,
      tooltip: {
        ...tooltipOptions,
        format: (p: ChartPoint<Game, string, number>) => describeGame(p.datum),
      },
    }),
    description: `Surprise threshold: ${winsToSurprise} wins. Games are ordered chronologically.`,
    label: "Projected wins throughout the season",
  };
};
