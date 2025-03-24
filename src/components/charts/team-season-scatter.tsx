import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TeamStats } from "../../data/types";

import * as SeasonUtils from "../../data/seasons";
import * as TeamUtils from "../../data/teams";
import * as Utils from "../../utils";
import { styles as PopoverStyles } from "../popover";

interface TeamSeasonScatterplotDatapoint extends TeamStats {
  isSurpriseTeam: boolean;
  logoSrc: string;
  pace: ReturnType<typeof SeasonUtils.pace>;
}

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
  const cy = height / 2 + y;
  const rot = `270 ${x + 12} ${cy + 20}`;

  return (
    <text
      className="fill-lime-500 stroke-lime-500 font-mono text-xl tracking-wide"
      transform={`rotate(${rot})`}
      y={cy + 24}
    >
      Pace
    </text>
  );
};

const XAxisLabel = ({
  viewBox,
}: {
  viewBox: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
}) => {
  const { height, width, y } = viewBox;

  return (
    <text
      className="fill-lime-500 stroke-lime-500 font-mono text-xl tracking-wide"
      x={width / 2}
      y={height / 2 + y + 50}
    >
      Over/Under
    </text>
  );
};

// https://recharts.org/en-US/examples/CustomContentOfTooltip
const TooltipContent = ({
  active,
  payload,
}: {
  active: boolean;
  label: string;
  payload: [{ payload: TeamSeasonScatterplotDatapoint }];
}) => {
  if (active && payload && payload.length > 0) {
    const point = payload[0].payload;

    return (
      <div className={`${PopoverStyles.body} max-w-fit pb-4`}>
        <h3 className="mb-1 text-center font-bold">
          <img
            className="mr-2 inline contrast-150 drop-shadow-lg"
            src={point.logoSrc}
            width={30}
          />
          {SeasonUtils.abbreviateSeasonRange(
            SeasonUtils.getSeasonById(point.seasonId),
            { compact: true },
          )}{" "}
          {TeamUtils.resolveTeamName(point.seasonId, point.teamId)}
        </h3>

        <p className="mt-4">
          <label className="mr-4 inline-block font-bold" htmlFor="record">
            Pace (Record)
          </label>
          <span id="record">
            {SeasonUtils.formatPace(point)} (
            {SeasonUtils.formatRecord(point.record)})
          </span>
        </p>
        <p>
          <label className="mr-4 inline-block font-bold" htmlFor="overUnder">
            Over/Under:
          </label>
          <span id="overUnder">{point.overUnder}</span>
        </p>
      </div>
    );
  }
};

const theme = Utils.getTheme();

export default function TeamSeasonScatterplot({
  data,
}: {
  data: TeamSeasonScatterplotDatapoint[];
}) {
  return (
    <ResponsiveContainer height={600} width="100%">
      <ScatterChart
        accessibilityLayer
        margin={{
          bottom: 36,
        }}
      >
        <CartesianGrid
          fill={theme.colors.slate[950]}
          stroke={theme.colors.lime[200]}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="overUnder"
          domain={[
            // TODO Smart way to fix hardcoding? At least explain
            Math.min(...data.map(({ overUnder }) => overUnder)) - 6,
            38,
          ]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<XAxisLabel />}
          name="Over/Under"
          tick={{
            fill: theme.colors.lime[500],
            fontSize: 16,
            stroke: theme.colors.lime[500],
          }}
          tickLine={{ stroke: theme.colors.lime[200] }}
          tickMargin={12}
          ticks={[15, 20, 25, 30, 35]}
          type="number"
        />
        <YAxis
          dataKey="pace"
          domain={[
            // TODO Smart way to fix hardcoding? At least explain
            -30, // Math.min(...points.map(({ pace }) => pace)) - 2,
            20, // Math.max(...points.map(({ pace }) => pace)) + 2,
          ]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          name="Pace"
          tick={{
            fill: theme.colors.lime[500],
            fontSize: 16,
            stroke: theme.colors.lime[500],
          }}
          tickLine={{ stroke: theme.colors.lime[200] }}
          tickMargin={12}
          type="number"
        />
        {/* @ts-expect-error - necessary b/c custom elements expect props, but  can't grok that recharts passes props for you under the hood */}
        <Tooltip content={<TooltipContent />} />
        <Scatter data={data}>
          {data.map((point, i) => (
            <Cell
              className="hover:fill-indigo-400"
              fill={
                point.isSurpriseTeam
                  ? theme.colors.lime[500]
                  : theme.colors.red[700]
              }
              key={i}
              onClick={() => {
                window.open(`/${point.seasonId}/${point.teamId}`, "_blank");
              }}
              role="link"
              tabIndex={0}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
