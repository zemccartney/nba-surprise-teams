import type { ChartOption, Theme } from "./echarts";

import * as Utils from "../../utils";
import {
  axisBase,
  axisText,
  escapeHtml,
  gridBase,
  tooltipBase,
} from "./echarts";

// The wrapper resolves the emoji URL server-side: importing the SVG here would
// pull Astro's asset runtime (and zod) into the client bundle
export interface TeamSeasonPaceChartData extends TeamSeasonPaceChartProps {
  surprisedEmojiSrc: string;
}

export interface TeamSeasonPaceChartProps {
  data: {
    date: string;
    pace: number;
    projectedWins: number;
    recordFmt: string;
  }[];
  surpriseRules: {
    numGames: number;
    overUnderCutoff: number;
    paceTarget: number;
  };
  winsToSurprise: number;
}

export const paceAxisTicks = (numGames: number): number[] => [0, numGames];

export const describePacePoint = (
  point: TeamSeasonPaceChartProps["data"][number],
): string =>
  `${point.date}. Record ${point.recordFmt}. Projected wins ${point.projectedWins}. Pace ${Utils.signedFormatter.format(point.pace)}.`;

export const option = (
  {
    data,
    surprisedEmojiSrc,
    surpriseRules,
    winsToSurprise,
  }: TeamSeasonPaceChartData,
  t: Theme,
): ChartOption => ({
  aria: { enabled: true },
  // Match the old plot insets; the visible plot starts level with the table.
  grid: { ...gridBase(t), bottom: 30, left: 84, right: 0, top: 0 },
  series: [
    {
      // The fill runs between the line and the surprise threshold; visualMap
      // (below) colors it by which side of the threshold each point is on
      areaStyle: { opacity: 0.8, origin: winsToSurprise },
      data: data.map((point) => point.projectedWins),
      lineStyle: { color: t.lime500, width: 1.5 },
      markLine: {
        data: [{ yAxis: winsToSurprise }],
        label: {
          formatter: `{wins|${winsToSurprise}} {emoji|}`,
          position: "start",
          rich: {
            emoji: {
              backgroundColor: { image: surprisedEmojiSrc },
              height: 16,
              width: 16,
            },
            wins: axisText(t, 16),
          },
        },
        lineStyle: { color: t.lime500, type: "solid", width: 4 },
        silent: true,
        symbol: "none",
      },
      showSymbol: false,
      smooth: true,
      smoothMonotone: "x",
      symbolSize: 8,
      type: "line",
    },
  ],
  tooltip: {
    ...tooltipBase(t),
    axisPointer: { type: "none" },
    formatter: (params) => {
      const param = Array.isArray(params) ? params[0] : params;
      const point = data[param?.dataIndex ?? -1];

      if (!point) {
        return "";
      }

      return [
        `<p class="tooltip-heading">${escapeHtml(point.date)}</p>`,
        `<p><span class="tooltip-label">Record:</span>${escapeHtml(point.recordFmt)}</p>`,
        `<p><span class="tooltip-label">Projected Wins:</span>${point.projectedWins}</p>`,
        `<p><span class="tooltip-label">Pace:</span>${Utils.signedFormatter.format(point.pace)}</p>`,
      ].join("");
    },
    trigger: "axis",
  },
  visualMap: {
    dimension: 1,
    // Both pieces bounded: an open-ended piece crashes the line view's gradient
    // (LineView getVisualGradient reads a stop that was clipped away)
    pieces: [
      { color: t.green700, gte: winsToSurprise, lte: surpriseRules.numGames },
      { color: t.red700, gte: 0, lt: winsToSurprise },
    ],
    seriesIndex: 0,
    show: false,
  },
  xAxis: {
    ...axisBase(t),
    axisLine: { show: false },
    boundaryGap: false,
    data: data.map((point) => point.date),
    splitLine: { ...axisBase(t).splitLine, show: true },
    type: "category",
  },
  yAxis: {
    ...axisBase(t),
    axisLabel: {
      ...axisBase(t).axisLabel,
      // Only the endpoints: the threshold has its own label and icon, and
      // intermediate ticks distract from it. Use the actual season length.
      customValues: paceAxisTicks(surpriseRules.numGames),
      showMaxLabel: true,
      showMinLabel: true,
      verticalAlignMaxLabel: "top",
    },
    axisLine: { show: false },
    axisTick: { show: false },
    max: surpriseRules.numGames,
    min: 0,
    name: "Projected Wins",
    nameGap: 64,
    // The surprise threshold is the only horizontal line.
    splitLine: { show: false },
    type: "value",
  },
});
