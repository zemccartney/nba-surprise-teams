/*
TODO

- test if client:load actually needed or fine to render entirely on server (I assume not)
- standardize Y scale (always up to 82); fix whatever's happening with Utah's chart
- fix font (use theme)
- make tooltip more informative
- dial in colors (use theme)
- test with a full season's worth of data; what happens to dates? other display issues?
- play around with cartesian grid; ok that variably-sized blocks, given diff gaps between games?
- fix layout relative to table (just use flex, can accomplish the same with flex values, i think)
- number formatting for pace

*/

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import * as Utils from "../utils";
import type { Game, TeamSeason } from "../data";

// Essentially copied from https://recharts.org/en-US/examples/AreaChartFillByValue

interface DataPoint {
  projectedWins: number;
  date: string;
}

// TODO Acknowledge claude usage / actually understand how this shit works
// Calculate the gradient offset based on y-axis threshold
const getGradientOffset = (
  data: DataPoint[],
  toSurprise: ReturnType<typeof Utils.toSurprise>,
) => {
  const dataMax = Math.max(...data.map((i) => i.projectedWins));
  const dataMin = Math.min(...data.map((i) => i.projectedWins));
  const totalHeight = dataMax - dataMin;

  // Convert the threshold to a percentage of the total height
  // Note: We subtract from 1 because SVG gradients go from top (0) to bottom (1)
  return 1 - (toSurprise - dataMin) / totalHeight;
};

const theme = Utils.getTheme();

export default function PaceChart({
  games,
  teamSeason,
}: {
  games: Game[];
  teamSeason: TeamSeason;
}) {
  const data = useMemo<DataPoint[]>(() => {
    // need to fill in non-game days?
    // target line (# of surprise wins)
    // for each game, calculate
    const points: DataPoint[] = [];
    const record = {
      w: 0,
      l: 0,
    };

    games.forEach((game) => {
      // TODO Abstract this check? Used twice, essentially same pattern in our action, too
      if (
        game.homeTeam === teamSeason.team ||
        game.awayTeam === teamSeason.team
      ) {
        const homeWin = game.homeScore > game.awayScore;

        if (teamSeason.team === game.homeTeam) {
          record[homeWin ? "w" : "l"] += 1;
        } else {
          record[homeWin ? "l" : "w"] += 1;
        }

        points.push({
          projectedWins: Utils.projectedWins(record),
          date: game.date,
        });
      }
    });

    return points;
  }, [games, teamSeason]);

  const toSurprise = Utils.toSurprise(teamSeason);
  const offset = getGradientOffset(data, toSurprise);

  return (
    <ResponsiveContainer width="100%" height={600}>
      <AreaChart data={data}>
        <CartesianGrid
          fill={theme.colors.slate[950]}
          stroke={theme.colors.lime[100]}
          strokeDasharray="3 3"
        />
        <XAxis dataKey="date" />
        <YAxis dataKey="projectedWins" />
        <Tooltip />
        <defs>
          <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
            <stop offset={offset} stopColor="green" stopOpacity={1} />
            <stop offset={offset} stopColor="red" stopOpacity={1} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="projectedWins"
          stroke="#000"
          fill="url(#splitColor)"
          baseValue={toSurprise} // Note to self: key to fixing issues, tho not sure why
        />
        <ReferenceLine
          y={toSurprise}
          stroke={theme.colors.lime[500]}
          strokeWidth={4}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
