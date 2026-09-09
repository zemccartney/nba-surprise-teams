import type { ChartOption, Theme } from "./echarts";

import * as Utils from "../../utils";
import { axisBase, escapeHtml, gridBase, tooltipBase } from "./echarts";

export interface TeamSeasonScatterplotProps {
  data: {
    isSurpriseTeam: boolean;
    logoSrc: string;
    overUnder: number;
    pace: number;
    recordFmt: string;
    seasonRange: string;
    teamName: string;
  }[];
}

const roundToFive = (num: number, dir: "down" | "up"): number => {
  const method =
    Math.sign(num) === -1
      ? dir === "up"
        ? "floor"
        : "ceil"
      : dir === "up"
        ? "ceil"
        : "floor";
  return Math.sign(num) * Math[method](Math.abs(num) / 5) * 5;
};

// Axis bounds: the nearest multiple of 5 beyond the data, never on a datapoint
const bounds = (values: number[]): [number, number] => {
  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    roundToFive(min, "down") === min
      ? roundToFive(min, "down") - 5
      : roundToFive(min, "down"),
    roundToFive(max, "up") === max
      ? roundToFive(max, "up") + 5
      : roundToFive(max, "up"),
  ];
};

export const option = (
  { data }: TeamSeasonScatterplotProps,
  t: Theme,
): ChartOption => {
  const [xMin, xMax] = bounds(data.map(({ overUnder }) => overUnder));
  const [yMin, yMax] = bounds(data.map(({ pace }) => pace));

  return {
    aria: { enabled: true },
    grid: { ...gridBase(t), bottom: 76, left: 60, right: 8, top: 12 },
    series: [
      {
        data: data.map((point) => ({
          itemStyle: { color: point.isSurpriseTeam ? t.lime500 : t.red700 },
          value: [point.overUnder, point.pace],
        })),
        symbolSize: 9,
        type: "scatter",
      },
    ],
    tooltip: {
      ...tooltipBase(t, "max-width: fit-content;"),
      formatter: (params) => {
        const param = Array.isArray(params) ? params[0] : params;
        const point = data[param?.dataIndex ?? -1];

        if (!point) {
          return "";
        }

        return [
          `<h3 class="tooltip-heading-centered"><img class="tooltip-logo" src="${escapeHtml(point.logoSrc)}" width="30"> ${escapeHtml(point.seasonRange)} ${escapeHtml(point.teamName)}</h3>`,
          `<p class="tooltip-para"><span class="tooltip-label">Pace (Record)</span>${Utils.signedFormatter.format(point.pace)} (${escapeHtml(point.recordFmt)})</p>`,
          `<p><span class="tooltip-label">Over/Under:</span>${point.overUnder}</p>`,
        ].join("");
      },
      trigger: "item",
    },
    xAxis: {
      ...axisBase(t),
      interval: 5,
      max: xMax,
      min: xMin,
      name: "Over/Under",
      nameGap: 44,
      type: "value",
    },
    yAxis: {
      ...axisBase(t),
      max: yMax,
      min: yMin,
      name: "Pace",
      nameGap: 40,
      type: "value",
    },
  };
};
