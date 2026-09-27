import { createChartRuntime } from "@tanstack/charts/runtime";
import { describe, expect, it } from "vitest";

import type { ShowdownHistoryPoint } from "../src/components/charts/showdown-standings";
import type { Game, Team, TeamSeason } from "../src/data/model";
import type { ShowdownEra } from "../src/data/showdown-history";

import {
  showdownScatterChart,
  showdownScatterFocus,
} from "../src/components/charts/showdown-scatter";
import {
  describeShowdownHistory,
  showdownHistoryChart,
  showdownHistoryFocus,
} from "../src/components/charts/showdown-standings";
import { renderTrackerSvg } from "../src/components/charts/tanstack-svg";
import { getTeamHistory } from "../src/content-utils";
import { historicShowdownStandings } from "../src/data/showdown-history";
import { readContentFixture } from "./content-fixture";

const teams: Team[] = [
  { emoji: "a", id: "NJN", name: "New Jersey Nets" },
  { emoji: "a", id: "BKN", name: "Brooklyn Nets" },
  { emoji: "b", id: "CHI", name: "Chicago Bulls" },
  { emoji: "c", id: "ATL", name: "Atlanta Hawks" },
];
const row = (seasonId: string, teamId: Team["id"]): TeamSeason => ({
  id: `${seasonId}/${teamId}`,
  overUnder: 20,
  seasonId,
  teamId,
});
const game = (
  seasonId: string,
  teamId: Team["id"],
  isWin: boolean,
  index = 0,
): Game => ({
  id: `${seasonId}/${index}`,
  playedOn: `${seasonId}-11-01`,
  seasonId,
  teams: [
    { score: isWin ? 101 : 99, teamId },
    { score: 100, teamId: "CHI" },
  ],
});

describe("historic Showdown standings", () => {
  it("weights total games, merges franchises, excludes in-progress seasons and includes no-game teams", () => {
    const standings = historicShowdownStandings({
      archivedSeasonIds: new Set(["2024", "2025"]),
      franchiseIds: new Map<Team["id"], Team["id"]>([["NJN", "BKN"]]),
      games: [
        game("2024", "NJN", true),
        ...Array.from({ length: 9 }, (_, i) => game("2025", "BKN", i === 0, i)),
        game("2026", "BKN", true),
        game("2025", "ATL", true),
      ],
      teams,
      teamSeasons: [
        row("2024", "NJN"),
        row("2024", "CHI"),
        row("2025", "BKN"),
        row("2025", "CHI"),
        row("2026", "BKN"),
        row("2026", "CHI"),
      ],
    });
    expect(
      standings.map(({ l, pct, team, w }) => [team.id, w, l, pct]),
    ).toEqual([
      ["CHI", 8, 2, 0.8],
      ["BKN", 2, 8, 0.2],
      ["ATL", 0, 0, undefined],
    ]);
  });
  it("balances every archived head-to-head and includes exactly the existing franchise groups", () => {
    const fixture = readContentFixture();
    const archivedSeasonIds = new Set(
      fixture.games.map((game) => game.seasonId),
    );
    const histories = new Map<Team["id"], ShowdownEra[]>();
    const franchiseIds = new Map(
      fixture.teams.map((team) => {
        const history = getTeamHistory(team.id);
        const id = (history && history.at(-1)?.teamId) || team.id;
        if (history)
          histories.set(
            id,
            history.map((era) => {
              const firstSeason = era.duration[0];
              if (firstSeason === undefined)
                throw new Error("Missing era start");
              return {
                firstSeason,
                lastSeason: era.duration[1],
                logo: era.logo,
                name: era.name,
                teamId: era.teamId,
              };
            }),
          );
        return [team.id, id];
      }),
    );
    const rows = historicShowdownStandings({
      ...fixture,
      archivedSeasonIds,
      franchiseIds,
      histories,
    });
    const candidates = new Set(fixture.teamSeasons.map((row) => row.id));
    const count = fixture.games.filter((game) =>
      game.teams.every((team) =>
        candidates.has(`${game.seasonId}/${team.teamId}`),
      ),
    ).length;
    expect(rows).toHaveLength(new Set(franchiseIds.values()).size);
    expect(rows).toHaveLength(30);
    expect(rows.reduce((sum, row) => sum + row.w, 0)).toBe(count);
    expect(rows.reduce((sum, row) => sum + row.l, 0)).toBe(count);
    const historicalRows = rows.filter((row) => row.history.length > 0);
    for (const row of historicalRows) {
      expect(row.history.reduce((sum, era) => sum + era.w, 0)).toBe(row.w);
      expect(row.history.reduce((sum, era) => sum + era.l, 0)).toBe(row.l);
    }
    expect(
      rows.find((row) => row.team.id === "WAS")?.history.map((era) => era.name),
    ).toEqual(["Washington Bullets", "Washington Wizards"]);
  });
  it("assigns a stable team code to distinct name-era boundaries", () => {
    const washington: Team = {
      emoji: "w",
      id: "WAS",
      name: "Washington Wizards",
    };
    const rows = historicShowdownStandings({
      archivedSeasonIds: new Set(["1996", "1997"]),
      franchiseIds: new Map<Team["id"], Team["id"]>(),
      games: [game("1996", "WAS", true), game("1997", "WAS", false)],
      histories: new Map<Team["id"], ShowdownEra[]>([
        [
          "WAS",
          [
            {
              firstSeason: 1974,
              lastSeason: 1996,
              logo: "b",
              name: "Washington Bullets",
              teamId: "WAS",
            },
            {
              firstSeason: 1997,
              logo: "w",
              name: "Washington Wizards",
              teamId: "WAS",
            },
          ],
        ],
      ]),
      teams: [washington, ...teams],
      teamSeasons: [
        row("1996", "WAS"),
        row("1996", "CHI"),
        row("1997", "WAS"),
        row("1997", "CHI"),
      ],
    });
    expect(
      rows
        .find((row) => row.team.id === "WAS")
        ?.history.map(({ l, name, pct, w }) => [name, w, l, pct]),
    ).toEqual([
      ["Washington Bullets", 1, 0, 1],
      ["Washington Wizards", 0, 1, 0],
    ]);
  });
  it("renders all rows and describes no-games distinctly from zero percent", () => {
    const rows = [
      {
        l: 2,
        logoSrc: "/test.svg",
        name: "Chicago Bulls",
        pct: 0.8,
        teamId: "CHI",
        w: 8,
      },
      {
        l: 0,
        logoSrc: "/test.svg",
        name: "Atlanta Hawks",
        pct: undefined,
        teamId: "ATL",
        w: 0,
      },
    ];
    const chart = showdownHistoryChart({ data: rows });
    const runtime = createChartRuntime<ShowdownHistoryPoint, number, string>();
    try {
      const scene = runtime.render(chart.definition, {
        height: 600,
        width: 390,
      });
      expect(scene.points).toHaveLength(2);
      expect(
        showdownHistoryFocus
          .navigation(scene.points)
          .map((point) => point.datum.teamId),
      ).toEqual(["CHI", "ATL"]);
      expect(scene.points.map((point) => point.datum.teamId)).toEqual([
        "CHI",
        "ATL",
      ]);
      expect(scene.points[0]?.y).toBeLessThan(scene.points[1]?.y ?? 0);
      const svg = renderTrackerSvg(
        scene,
        { ariaLabel: chart.label },
        chart.annotation?.(scene),
      );
      expect(svg).toContain("8–2 | 80.0%");
      expect(svg).toContain("0–0 | —");
      expect(chart.annotation?.(scene)).toContain(
        'fill="var(--color-slate-950)"',
      );
      expect(chart.annotation?.(scene)).not.toContain('stroke-width="3"');
      expect(scene.points.map((point) => point.color)).toEqual([
        "var(--color-green-700)",
        "var(--color-lime-200)",
      ]);
      expect(chart.annotation?.(scene)).toContain(`x="${scene.chart.x + 8}"`);
      expect(scene.chart.width).toBe(390 - 56 - 16);
      const scatter = showdownScatterChart({
        data: [
          ...rows,
          {
            l: 4,
            logoSrc: "/test.svg",
            name: "Boston Celtics",
            pct: 0,
            teamId: "BOS",
            w: 0,
          },
        ],
      });
      const scatterRuntime = createChartRuntime<
        ShowdownHistoryPoint & { gamesPlayed: number; pct: number },
        number,
        number
      >();
      try {
        const scene = scatterRuntime.render(scatter.definition, {
          height: 600,
          width: 390,
        });
        expect(scene.points).toHaveLength(2);
        const nearby = scene.points.map((point, i) => ({
          ...point,
          x: 100 + i * 4,
          y: 100,
        }));
        expect(
          showdownScatterFocus.resolve(nearby, {
            maxDistance: 48,
            x: 100,
            y: 100,
          }),
        ).toEqual([nearby[0]]);
        expect(
          showdownScatterFocus.resolve(nearby, {
            maxDistance: 48,
            x: 104,
            y: 100,
          }),
        ).toEqual([nearby[1]]);
        expect(
          showdownScatterFocus.resolve(nearby, {
            maxDistance: 48,
            x: 1000,
            y: 100,
          }),
        ).toEqual([]);
        expect(showdownScatterFocus.navigation(nearby)).toEqual(nearby);
        expect(scene.points.map((point) => point.color)).toEqual([
          "var(--color-green-700)",
          "var(--color-green-700)",
        ]);
        expect(
          scene.points.map((point) => [point.xValue, point.yValue]),
        ).toEqual([
          [4, 0],
          [10, 0.8],
        ]);
        expect(
          scene.scales.x?.ticks.every((tick) =>
            Number.isSafeInteger(tick.value),
          ),
        ).toBe(true);
        expect(scatter.description).toContain(
          "click or press Enter for name history",
        );
      } finally {
        scatterRuntime.destroy();
      }
      expect(
        describeShowdownHistory({
          l: 0,
          logoSrc: "/test.svg",
          name: "Atlanta Hawks",
          teamId: "ATL",
          w: 0,
        }),
      ).toContain("No qualifying games");
    } finally {
      runtime.destroy();
    }
  });
});
