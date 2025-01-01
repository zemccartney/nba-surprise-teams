import { useMemo } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  Label,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { styles as PopoverStyles } from "./popover";
import * as Utils from "../utils";
import SurprisedEmoji from "../assets/images/emoji/hushed-face.svg";
import type { Game, TeamSeason } from "../data";
import type { TeamRecord, TeamStats } from "../utils";

// Essentially copied from https://recharts.org/en-US/examples/AreaChartFillByValue

interface DataPoint {
  projectedWins: number;
  date: string;
  _stats: TeamStats;
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

// https://recharts.org/en-US/examples/CustomContentOfTooltip
const TooltipContent = ({
  active,
  payload,
}: {
  active: boolean;
  payload: [{ payload: DataPoint }];
  label: string;
}) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;

    return (
      <div className={PopoverStyles.body}>
        <p className="mb-1 font-bold underline">{point.date}</p>
        <p>
          <label htmlFor="record" className="mr-4 inline-block font-bold">
            Record:
          </label>
          <span id="record">{Utils.displayRecord(point._stats)}</span>
        </p>
        <p>
          <label
            htmlFor="projectedWins"
            className="mr-4 inline-block font-bold"
          >
            Projected Wins:
          </label>
          <span id="projectedWins">{point.projectedWins}</span>
        </p>
        <p>
          <label htmlFor="pace" className="mr-4 inline-block font-bold">
            Pace:
          </label>
          <span id="pace">{Utils.displayPace(Utils.pace(point._stats))}</span>
        </p>
      </div>
    );
  }

  return null;
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
      <image x={x - 24} y={y - 8} width={16} href={SurprisedEmoji.src} />
      <text x={x - 24 - 20} y={y + 4} className="fill-lime-500 stroke-lime-500">
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
    x: number;
    y: number;
    height: number;
  };
}) => {
  const { x, y, height } = viewBox;

  // TODO Actually understand what's going on here, all these additions
  // were pure guesses, stumbled onto approximately ok-looking positioning
  const cy = height / 2 + y;
  const rot = `270 ${x + 12} ${cy + 20}`;

  return (
    <text
      y={cy + 16}
      transform={`rotate(${rot})`}
      className="fill-lime-500 stroke-lime-500"
    >
      Projected Wins
    </text>
  );
};

export default function PaceChart({
  games,
  teamSeason,
}: {
  games: Game[];
  teamSeason: TeamSeason;
}) {
  const data = useMemo<DataPoint[]>(() => {
    const points: DataPoint[] = [];
    const record: TeamRecord = {
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
          _stats: { ...record, ...teamSeason },
        });
      }
    });

    return points;
  }, [games, teamSeason]);

  const toSurprise = Utils.toSurprise(teamSeason);
  const offset = getGradientOffset(data, toSurprise);

  return (
    <ResponsiveContainer
      width="100%"
      height={600}
      style={{
        paddingLeft: 8,
        paddingRight: 8,
        // TODO Fix later, margin changes to align chart with table in team-stats; consider decoupling if chart used elsewhere
        // marginTop aligns with top of table in 2-column layout
        marginTop: "-4px",
      }}
    >
      <AreaChart
        // https://github.com/recharts/recharts/blob/8341516709e6042d27733f3e37b63af19d366a56/storybook/stories/API/Accessibility.mdx#L10
        accessibilityLayer
        data={data}
        width={400}
      >
        <CartesianGrid
          fill={theme.colors.slate[950]}
          stroke={theme.colors.lime[200]}
          strokeDasharray="3 3"
        />
        <XAxis
          axisLine={false}
          dataKey="date"
          interval="equidistantPreserveStart"
          tick={{
            fill: theme.colors.lime[500],
            fontSize: 16,
            stroke: theme.colors.lime[500],
          }}
          tickLine={{ stroke: theme.colors.lime[200] }}
          tickMargin={12}
        />
        <YAxis
          axisLine={false}
          dataKey="projectedWins"
          domain={[0, 82]}
          // @ts-ignore - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          tick={{
            fill: theme.colors.lime[500],
            fontSize: 16,
            stroke: theme.colors.lime[500],
          }}
          tickLine={{ stroke: theme.colors.lime[200] }}
          tickMargin={12}
        />
        {/* @ts-ignore - necessary b/c Tooltip expects an element, but passes props for you under the hood */}
        <Tooltip content={<TooltipContent />} cursor={false} />
        <defs>
          <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset={offset}
              stopColor={theme.colors.green[700]}
              stopOpacity={1}
            />
            <stop
              offset={offset}
              stopColor={theme.colors.red[700]}
              stopOpacity={1}
            />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="projectedWins"
          stroke={theme.colors.lime[500]}
          fill="url(#splitColor)"
          baseValue={toSurprise} // Note to self: key to fixing area highlighting issues relative to slope, tho not sure why
        />
        <ReferenceLine
          stroke={theme.colors.lime[500]}
          strokeWidth={4}
          y={toSurprise}
        >
          <Label content={<ReferenceLabel toSurprise={toSurprise} />} />
        </ReferenceLine>
      </AreaChart>
    </ResponsiveContainer>
  );
}
