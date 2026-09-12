import type { ChartOption, Theme } from "./echarts";

import { axisBase, escapeHtml, gridBase, tooltipBase } from "./echarts";

export interface SurprisesPerSeasonChartProps {
  data: {
    numSurprises: number;
    seasonId: string;
    seasonRange: string;
    surpriseTeams: {
      logoSrc: string;
      name: string;
      teamId: string;
    }[];
  }[];
  latestSeasonYear: number;
}

export const option = (
  { data, latestSeasonYear }: SurprisesPerSeasonChartProps,
  t: Theme,
): ChartOption => {
  const axis = axisBase(t);

  return {
    aria: { enabled: true },
    grid: { ...gridBase(t), bottom: 76, left: 60, right: 8, top: 12 },
    series: [
      {
        barMaxWidth: 40,
        // Seasons with no surprises still get a sliver, so they're hoverable
        barMinHeight: 10,
        data: data.map((point, i) => ({
          itemStyle: { color: i % 2 ? t.lime200 : t.green700 },
          value: [Number(point.seasonId), point.numSurprises],
        })),
        type: "bar",
      },
    ],
    tooltip: {
      ...tooltipBase(t, "max-width: 20rem; padding-bottom: 1rem;"),
      axisPointer: {
        shadowStyle: { color: t.slate400, opacity: 0.5 },
        type: "shadow",
      },
      formatter: (params) => {
        const param = Array.isArray(params) ? params[0] : params;
        const point = data[param?.dataIndex ?? -1];

        if (!point) {
          return "";
        }

        const teams =
          point.surpriseTeams.length > 0
            ? [
                `<h4 class="tooltip-section-heading">Surprise Teams:</h4>`,
                `<ul class="tooltip-list">`,
                ...point.surpriseTeams.map(
                  (team) =>
                    `<li class="tooltip-list-item"><img class="tooltip-logo" src="${escapeHtml(team.logoSrc)}" width="30"> ${escapeHtml(team.name)}</li>`,
                ),
                `</ul>`,
              ]
            : [`<p>No surprises this year</p>`];

        return [
          `<h3 class="tooltip-heading-centered">${escapeHtml(point.seasonRange)} Season</h3>`,
          ...teams,
        ].join("");
      },
      trigger: "axis",
    },
    xAxis: {
      ...axis,
      axisLabel: {
        ...axis.axisLabel,
        formatter: (value: number) => (value % 5 === 0 ? String(value) : ""),
      },
      interval: 5,
      max: latestSeasonYear + 1,
      min: 1990,
      name: "Season",
      nameGap: 44,
      type: "value",
    },
    yAxis: {
      ...axis,
      minInterval: 1,
      name: "# Surprises",
      nameGap: 40,
      type: "value",
    },
  };
};
