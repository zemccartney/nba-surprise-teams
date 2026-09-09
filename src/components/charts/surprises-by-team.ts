import type { ChartOption, Theme } from "./echarts";

import { axisBase, escapeHtml, gridBase, tooltipBase } from "./echarts";

export interface SurprisesByTeamChartProps {
  data: Datapoint[];
}

type Datapoint = (
  | {
      history: {
        duration: [number, number?];
        logoSrc: string;
        name: string;
        teamId: string;
      }[];
    }
  | {
      logoSrc?: string;
    }
) & {
  name: string;
  numEliminated: number;
  numSurprised: number;
  teamId: string;
};

const tooltipContent = (point: Datapoint) => {
  const record = `<p class="tooltip-centered">Surprise Record: ${point.numSurprised} - ${point.numEliminated}</p>`;

  if ("history" in point) {
    return [
      `<h3 class="tooltip-heading-centered">${escapeHtml(point.name)}</h3>`,
      record,
      `<ul class="tooltip-list">`,
      ...point.history.map((hist) => {
        // A name's range is written by calendar years, so the end is the year the
        // last season under that name ended: one more than its season id
        const [start, end] = hist.duration;
        const range = `${start} - ${end ? end + 1 : "present"}`;

        return `<li class="tooltip-list-item"><img class="tooltip-logo" src="${escapeHtml(hist.logoSrc)}" width="32"> ${escapeHtml(hist.name)} (${range})</li>`;
      }),
      `</ul>`,
    ].join("");
  }

  return [
    `<h3 class="tooltip-heading-centered"><img class="tooltip-logo" src="${escapeHtml(point.logoSrc ?? "")}" width="30"> ${escapeHtml(point.name)}</h3>`,
    record,
  ].join("");
};

export const option = (
  { data }: SurprisesByTeamChartProps,
  t: Theme,
): ChartOption => {
  const axis = axisBase(t);
  const points = data.toSorted((a, b) => a.teamId.localeCompare(b.teamId));

  return {
    aria: { enabled: true },
    grid: { ...gridBase(t), bottom: 56, left: 60, right: 8, top: 12 },
    series: [
      {
        barCategoryGap: "10%",
        data: points.map((point) => point.numSurprised),
        itemStyle: { color: t.green700 },
        stack: "results",
        type: "bar",
      },
      {
        // Negative so eliminations stack downward from the zero line
        data: points.map((point) => -point.numEliminated),
        itemStyle: { color: t.red700 },
        markLine: {
          data: [{ yAxis: 0 }],
          label: { show: false },
          lineStyle: { color: t.yellow400, type: "solid", width: 4 },
          silent: true,
          symbol: "none",
        },
        stack: "results",
        type: "bar",
      },
    ],
    tooltip: {
      ...tooltipBase(t, "max-width: fit-content;"),
      axisPointer: {
        shadowStyle: { color: t.slate400, opacity: 0.5 },
        type: "shadow",
      },
      formatter: (params) => {
        const param = Array.isArray(params) ? params[0] : params;
        const point = points[param?.dataIndex ?? -1];

        return point ? tooltipContent(point) : "";
      },
      trigger: "axis",
    },
    xAxis: {
      ...axis,
      axisLabel: { show: false },
      data: points.map((point) => point.teamId),
      name: "Team",
      nameGap: 20,
      type: "category",
    },
    yAxis: {
      ...axis,
      axisLabel: {
        ...axis.axisLabel,
        formatter: (value: number) => String(Math.abs(value)),
      },
      interval: 5,
      // Round the extent out to the tick interval, so the top tick is a multiple
      // of 5 rather than the data max
      max: (value: { max: number }) => Math.ceil(value.max / 5) * 5,
      min: (value: { min: number }) => Math.floor(value.min / 5) * 5,
      name: "Season Results",
      nameGap: 40,
      type: "value",
    },
  };
};
