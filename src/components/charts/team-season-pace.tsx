import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Game, TeamRecord, TeamSeason, TeamStats } from "../../data/types";

import SurprisedEmoji from "../../assets/images/emoji/hushed-face.svg";
import * as SeasonUtils from "../../data/seasons";
import { styles as PopoverStyles } from "../popover";

// Essentially copied from https://recharts.org/en-US/examples/AreaChartFillByValue

// TODO make consistent with other charts i.e. move data formatting outside component
interface DataPoint {
  _stats: Required<TeamStats>; // Marks TeamStats.record as required; data points exist only if games have been played
  date: string;
  projectedWins: number;
}

// TODO Acknowledge claude usage / actually understand how this shit works
// Calculate the gradient offset based on y-axis threshold
const getGradientOffset = (
  data: DataPoint[],
  toSurprise: ReturnType<typeof SeasonUtils.toSurprise>,
) => {
  const dataMax = Math.max(...data.map((i) => i.projectedWins));
  const dataMin = Math.min(...data.map((i) => i.projectedWins));
  const totalHeight = dataMax - dataMin;

  // Convert the threshold to a percentage of the total height
  // Note: We subtract from 1 because SVG gradients go from top (0) to bottom (1)
  return 1 - (toSurprise - dataMin) / totalHeight;
};

// https://recharts.org/en-US/examples/CustomContentOfTooltip
const TooltipContent = ({
  active,
  payload,
}: {
  active: boolean;
  label: string;
  payload: [{ payload: DataPoint }];
}) => {
  if (active && payload && payload.length > 0) {
    const point = payload[0].payload;

    return (
      <div className={PopoverStyles.body}>
        <p className="mb-1 font-bold underline">{point.date}</p>
        <p>
          <label className="mr-4 inline-block font-bold" htmlFor="record">
            Record:
          </label>
          <span id="record">
            {SeasonUtils.formatRecord(point._stats.record)}
          </span>
        </p>
        <p>
          <label
            className="mr-4 inline-block font-bold"
            htmlFor="projectedWins"
          >
            Projected Wins:
          </label>
          <span id="projectedWins">{point.projectedWins}</span>
        </p>
        <p>
          <label className="mr-4 inline-block font-bold" htmlFor="pace">
            Pace:
          </label>
          <span id="pace">{SeasonUtils.formatPace(point._stats)}</span>
        </p>
      </div>
    );
  }
};

const ReferenceLabel = ({ toSurprise, ...rest }: { toSurprise: number }) => {
  // Props injected by recharts
  const {
    viewBox: { x, y },
  } = rest as { viewBox: { x: number; y: number } };

  /* 
    Alignment calcs
    image:
      x - 24 - position outside left edge of graph
      y - 8 - vertically align with text

    text:
      x:

  */

  return (
    <>
      <image href={SurprisedEmoji.src} width={16} x={x - 24} y={y - 8} />
      <text className="fill-lime-500 stroke-lime-500" x={x - 24 - 20} y={y + 4}>
        {toSurprise}
      </text>
    </>
  );
};

// Adapted from https://github.com/recharts/recharts/issues/184
const YAxisLabel = ({
  viewBox,
}: {
  viewBox: {
    height: number;
    x: number;
    y: number;
  };
}) => {
  const { height, x, y } = viewBox;

  // TODO Actually understand what's going on here, all these additions
  // were pure guesses, stumbled onto approximately ok-looking positioning
  const cy = height / 2 + y;
  const rot = `270 ${x + 12} ${cy + 20}`;

  return (
    <text
      className="fill-lime-500 stroke-lime-500 font-mono text-xl tracking-wide"
      transform={`rotate(${rot})`}
      y={cy + 8}
    >
      Projected Wins
    </text>
  );
};

export default function TeamSeasonPaceChart({
  games,
  teamSeason,
}: {
  games: Game[];
  teamSeason: TeamSeason;
}) {
  const data = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [];
    const record: TeamRecord = {
      l: 0,
      w: 0,
    };

    for (const game of games) {
      // TODO Abstract this check? Used in standings table and team stats, too
      const [teamA, teamZ] = game.teams;

      if (
        teamA.teamId === teamSeason.teamId ||
        teamZ.teamId === teamSeason.teamId
      ) {
        if (teamSeason.teamId === teamA.teamId) {
          record[teamA.score > teamZ.score ? "w" : "l"] += 1;
        } else {
          record[teamZ.score > teamA.score ? "w" : "l"] += 1;
        }

        // spread = snapshot of record after current game
        const _stats = { record: { ...record }, ...teamSeason };

        points.push({
          _stats,
          date: game.playedOn,
          projectedWins: SeasonUtils.projectedWins(_stats),
        });
      }
    }

    return points;
  }, [games, teamSeason]);

  const toSurprise = SeasonUtils.toSurprise(teamSeason);
  const offset = getGradientOffset(data, toSurprise);
  const surpriseRules = SeasonUtils.getSeasonSurpriseRules(teamSeason.seasonId);

  return (
    <ResponsiveContainer height={600} width="100%">
      <AreaChart
        // https://github.com/recharts/recharts/blob/8341516709e6042d27733f3e37b63af19d366a56/storybook/stories/API/Accessibility.mdx#L10
        accessibilityLayer
        data={data}
        margin={{
          left: 24,
        }}
        width={400}
      >
        <CartesianGrid
          fill="var(--color-slate-950)"
          stroke="var(--color-lime-200)"
          strokeDasharray="3 3"
        />
        <XAxis
          axisLine={false}
          dataKey="date"
          interval="equidistantPreserveStart"
          tick={{
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
        />
        <YAxis
          axisLine={false}
          dataKey="projectedWins"
          domain={[0, surpriseRules.numGames]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          tick={{
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
        />
        {/* @ts-expect-error - necessary b/c Tooltip expects an element, but passes props for you under the hood */}
        <Tooltip content={<TooltipContent />} cursor={false} />
        <defs>
          <linearGradient id="splitColor" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset={offset}
              stopColor="var(--color-green-700)"
              stopOpacity={1}
            />
            <stop
              offset={offset}
              stopColor="var(--color-green-700)"
              stopOpacity={1}
            />
          </linearGradient>
        </defs>
        <Area
          baseValue={toSurprise} // Note to self: key to fixing area highlighting issues relative to slope, tho not sure why
          dataKey="projectedWins"
          fill="url(#splitColor)"
          stroke="var(--color-lime-500)"
          type="monotone"
        />
        <ReferenceLine
          stroke="var(--color-lime-500)"
          strokeWidth={4}
          y={toSurprise}
        >
          <Label content={<ReferenceLabel toSurprise={toSurprise} />} />
        </ReferenceLine>
      </AreaChart>
    </ResponsiveContainer>
  );
}
