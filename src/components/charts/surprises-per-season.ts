import type { ChartOption, Theme } from "./echarts";
import type { ChartKeyboardNavigation } from "./keyboard";

import { logoAlt } from "../logo-alt";
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

export const seasonKeyboardOrder = ({
  data,
}: SurprisesPerSeasonChartProps): number[] =>
  data
    .map((_point, index) => index)
    .toSorted((a, b) => Number(data[a]?.seasonId) - Number(data[b]?.seasonId));

export const keyboard: ChartKeyboardNavigation<SurprisesPerSeasonChartProps> = {
  dataIndices: seasonKeyboardOrder,
  label: "Selected season on the surprises per season chart",
  orderDescription: "Ordered from earliest to latest season.",
  pointLabel: "Season",
  points: (props) =>
    seasonKeyboardOrder(props).map((index) => {
      const point = props.data[index];
      if (!point) return "";
      return `${point.seasonRange} season. ${point.numSurprises} surprise ${point.numSurprises === 1 ? "team" : "teams"}.${point.surpriseTeams.length > 0 ? ` ${point.surpriseTeams.map((team) => team.name).join(", ")}.` : ""}`;
    }),
};

export const option = (
  { data }: SurprisesPerSeasonChartProps,
  t: Theme,
): ChartOption => {
  const axis = axisBase(t);
  const seasons = data
    .map((point) => point.seasonId)
    .toSorted((a, b) => Number(a) - Number(b));

  return {
    aria: { enabled: true },
    grid: { ...gridBase(t), bottom: 76, left: 60, right: 8, top: 0 },
    series: [
      {
        barMaxWidth: 40,
        // Seasons with no surprises still get a sliver, so they're hoverable
        barMinHeight: 10,
        data: data.map((point, i) => ({
          itemStyle: { color: i % 2 ? t.lime200 : t.green700 },
          value: [point.seasonId, point.numSurprises],
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
                    `<li class="tooltip-list-item"><img class="tooltip-logo" alt="${escapeHtml(logoAlt(team.name))}" src="${escapeHtml(team.logoSrc)}" width="30"> ${escapeHtml(team.name)}</li>`,
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
        formatter: (value: string) =>
          Number(value) % 5 === 0 ||
          value === seasons[0] ||
          value === seasons.at(-1)
            ? value
            : "",
        hideOverlap: true,
        interval: 0,
      },
      boundaryGap: true,
      data: seasons,
      name: "Season",
      nameGap: 44,
      splitLine: {
        ...axis.splitLine,
        interval: (_index: number, value: string) => Number(value) % 5 === 0,
        show: true,
        showMaxLine: false,
        showMinLine: false,
      },
      type: "category",
    },
    yAxis: {
      ...axis,
      axisLabel: { ...axis.axisLabel, verticalAlignMaxLabel: "top" },
      minInterval: 1,
      name: "# Surprises",
      nameGap: 40,
      splitLine: { ...axis.splitLine, showMaxLine: false, showMinLine: false },
      type: "value",
    },
  };
};
