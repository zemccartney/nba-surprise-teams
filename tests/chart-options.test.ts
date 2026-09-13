import { describe, expect, it } from "vitest";

import type { Theme } from "../src/components/charts/echarts";
import type { TeamSeasonPaceChartData } from "../src/components/charts/team-season-pace";

import { axisBase } from "../src/components/charts/echarts";
import { keyboard as teamKeyboard } from "../src/components/charts/surprises-by-team";
import {
  keyboard as seasonKeyboard,
  seasonKeyboardOrder,
  option as seasonOption,
} from "../src/components/charts/surprises-per-season";
import {
  describePacePoint,
  option,
  paceAxisTicks,
} from "../src/components/charts/team-season-pace";
import {
  keyboard as scatterKeyboard,
  scatterKeyboardOrder,
  option as scatterOption,
} from "../src/components/charts/team-season-scatter";

const theme: Theme = {
  blurple: "#302060",
  fontMono: "monospace",
  green200: "#aaffaa",
  green700: "#008800",
  indigo400: "#818cf8",
  lime200: "#ccffaa",
  lime500: "#88cc00",
  red700: "#cc0000",
  shadowPopover: "none",
  slate400: "#889999",
  slate950: "#020618",
  yellow400: "#ffff00",
};

const fixture: TeamSeasonPaceChartData = {
  data: [
    { date: "2025-10-22", pace: 44, projectedWins: 82, recordFmt: "1 - 0" },
    { date: "2025-10-25", pace: 3, projectedWins: 41, recordFmt: "1 - 1" },
  ],
  surprisedEmojiSrc: "/hushed-face.svg",
  surpriseRules: { numGames: 82, overUnderCutoff: 35, paceTarget: 10 },
  winsToSurprise: 38,
};

describe("Stats keyboard descriptions and ordering", () => {
  it("explores seasons chronologically while retaining series indices", () => {
    const props = {
      data: [
        {
          numSurprises: 1,
          seasonId: "2025",
          seasonRange: "2025–26",
          surpriseTeams: [
            { logoSrc: "/hornet.svg", name: "Hornets", teamId: "CHA" },
          ],
        },
        {
          numSurprises: 0,
          seasonId: "1993",
          seasonRange: "1993–94",
          surpriseTeams: [],
        },
      ],
      latestSeasonYear: 2025,
    };
    expect(seasonKeyboardOrder(props)).toEqual([1, 0]);
    expect(seasonKeyboard.points(props)).toEqual([
      "1993–94 season. 0 surprise teams.",
      "2025–26 season. 1 surprise team. Hornets.",
    ]);
  });

  it("matches team bar order and describes both stacked results", () => {
    expect(
      teamKeyboard.points({
        data: [
          { name: "Beta", numEliminated: 4, numSurprised: 2, teamId: "B" },
          { name: "Alpha", numEliminated: 3, numSurprised: 0, teamId: "A" },
        ],
      }),
    ).toEqual([
      "Alpha. 0 surprise seasons. 3 eliminated seasons.",
      "Beta. 2 surprise seasons. 4 eliminated seasons.",
    ]);
    expect(teamKeyboard.seriesIndices).toEqual([0, 1]);
  });

  it("orders scatter selections by over/under then pace and announces both coordinates", () => {
    const props = {
      data: [
        {
          isSurpriseTeam: true,
          logoSrc: "/b.svg",
          overUnder: 30,
          pace: 2,
          recordFmt: "42 - 40",
          seasonRange: "2025–26",
          teamName: "Beta",
        },
        {
          isSurpriseTeam: false,
          logoSrc: "/a.svg",
          overUnder: 20,
          pace: -3,
          recordFmt: "27 - 55",
          seasonRange: "2024–25",
          teamName: "Alpha",
        },
        {
          isSurpriseTeam: false,
          logoSrc: "/c.svg",
          overUnder: 30,
          pace: -1,
          recordFmt: "39 - 43",
          seasonRange: "2023–24",
          teamName: "Gamma",
        },
      ],
    };
    expect(scatterKeyboardOrder(props)).toEqual([1, 2, 0]);
    expect(scatterKeyboard.points(props)[0]).toBe(
      "2024–25 Alpha. Over/under 20. Pace -3. Record 27 - 55. Eliminated.",
    );
  });
});

describe("scatter point feedback", () => {
  it("outlines active points with the purple accent while retaining result colors", () => {
    expect(
      scatterOption(
        {
          data: [
            {
              isSurpriseTeam: true,
              logoSrc: "/team.svg",
              overUnder: 30,
              pace: 2,
              recordFmt: "42 - 40",
              seasonRange: "2025–26",
              teamName: "Example",
            },
          ],
        },
        theme,
      ),
    ).toMatchObject({
      series: [
        {
          data: [{ itemStyle: { color: theme.lime500 } }],
          emphasis: {
            itemStyle: {
              borderColor: theme.indigo400,
              borderWidth: 2,
              opacity: 1,
            },
            scale: 1.4,
          },
        },
      ],
    });
  });
});

describe("shared chart axes", () => {
  it("keeps dotted green interior gridlines without boundary or gray axis strokes", () => {
    expect(axisBase(theme)).toMatchObject({
      axisLine: { show: false },
      splitLine: {
        lineStyle: { color: theme.lime200, type: [3, 3] },
        showMaxLine: false,
        showMinLine: false,
      },
    });
  });
});

describe("season-count chart", () => {
  it("uses only actual seasons, even when the latest is not a multiple of five", () => {
    expect(
      seasonOption(
        {
          data: ["2026", "1997", "2024"].map((seasonId) => ({
            numSurprises: 1,
            seasonId,
            seasonRange: seasonId,
            surpriseTeams: [],
          })),
          latestSeasonYear: 2026,
        },
        theme,
      ),
    ).toMatchObject({
      grid: { borderWidth: 0, top: 0 },
      series: [
        {
          data: [
            { value: ["2026", 1] },
            { value: ["1997", 1] },
            { value: ["2024", 1] },
          ],
        },
      ],
      xAxis: {
        boundaryGap: true,
        data: ["1997", "2024", "2026"],
        splitLine: { showMaxLine: false, showMinLine: false },
        type: "category",
      },
      yAxis: { splitLine: { showMaxLine: false, showMinLine: false } },
    });
  });
});

describe("pace chart parity choices", () => {
  it.each([
    { games: 82, ticks: [0, 82] },
    { games: 66, ticks: [0, 66] },
    { games: 50, ticks: [0, 50] },
  ])(
    "labels only the endpoints of a $games-game season",
    ({ games, ticks }) => {
      expect(paceAxisTicks(games)).toEqual(ticks);
    },
  );

  it("aligns the plot, keeps vertical grid lines and only the horizontal threshold", () => {
    expect(option(fixture, theme)).toMatchObject({
      grid: { bottom: 30, left: 84, right: 0, top: 0 },
      series: [
        {
          areaStyle: { opacity: 0.8, origin: 38 },
          data: [82, 41],
          markLine: { data: [{ yAxis: 38 }] },
        },
      ],
      xAxis: { splitLine: { show: true } },
      yAxis: {
        axisLabel: {
          customValues: [0, 82],
          showMaxLabel: true,
          showMinLabel: true,
        },
        axisTick: { show: false },
        max: 82,
        min: 0,
        splitLine: { show: false },
      },
    });
  });

  it("describes the actual point, including signed pace, for keyboard users", () => {
    expect(
      describePacePoint({
        date: "2025-11-01",
        pace: -11,
        projectedWins: 27,
        recordFmt: "2 - 4",
      }),
    ).toBe("2025-11-01. Record 2 - 4. Projected wins 27. Pace -11.");
  });
});
