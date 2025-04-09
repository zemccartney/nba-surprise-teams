import Clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TeamCode } from "../../data/types";

import * as TeamUtils from "../../data/teams";
import * as Utils from "../../utils";
import { styles as PopoverStyles } from "../popover";

const theme = Utils.getTheme();

export type SurprisesByTeamChartDatapoint = {
  numEliminated: number;
  numSurprised: number;
  teamId: TeamCode;
} & (
  | {
      history: {
        duration: [number, number?];
        logoSrc: string;
        name: string;
        teamId: TeamCode;
      }[];
    }
  | {
      logoSrc?: string;
    }
);

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
      x={x - 48}
      y={cy + 24}
    >
      Season Results
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
      y={height / 2 + y + 20}
    >
      Team
    </text>
  );
};

const TooltipContent = ({
  active,
  payload,
}: {
  active: boolean;
  label: string;
  payload: [{ payload: SurprisesByTeamChartDatapoint }];
}) => {
  if (active && payload && payload.length > 0) {
    const point = payload[0].payload;

    if ("history" in point) {
      return (
        <div className={Clsx([PopoverStyles.body, "md:max-w-fit"])}>
          <h3 className="mb-1 text-center font-bold">
            {TeamUtils.getTeamById(point.teamId).name}
          </h3>

          <p className="text-center">
            Surprise Record: {point.numSurprised} -{" "}
            {Math.abs(point.numEliminated)}
          </p>

          <ul className="ps-[0.5em]">
            {point.history.map((hist) => (
              <li className="mt-4" key={`${hist.teamId}-${hist.duration[0]}`}>
                <img
                  className="inline contrast-150 drop-shadow-lg"
                  loading="lazy"
                  src={hist.logoSrc}
                  width={32}
                />{" "}
                {hist.name} (
                {/*
                  Inc end season id to represent year of end date of that season,
                  as ranges of a team name's existence are usually written not in terms
                  of our season id concept, but strictly as the range of years during which the
                  team existed, which would mean the year in which the last season in which
                  the team existed ended
                */}
                {`${hist.duration[0]} - ${hist.duration[1] ? hist.duration[1] + 1 : "present"}`}
                )
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className={Clsx([PopoverStyles.body, "max-w-fit"])}>
        <h3 className="mb-1 text-center font-bold">
          <img
            className="inline contrast-150 drop-shadow-lg"
            loading="lazy"
            src={point.logoSrc}
            width={30}
          />{" "}
          {TeamUtils.getTeamById(point.teamId).name}
        </h3>

        <p className="text-center">
          Surprise Record: {point.numSurprised} -{" "}
          {Math.abs(point.numEliminated)}
        </p>
      </div>
    );
  }
};

export default function SurprisesByTeamChart({
  data,
}: {
  data: SurprisesByTeamChartDatapoint[];
}) {
  return (
    <ResponsiveContainer height={600} width="100%">
      <BarChart
        data={data
          .toSorted((a, b) => a.teamId.localeCompare(b.teamId))
          .map((point) => ({
            ...point,
            numEliminated: point.numEliminated / -1,
          }))}
        margin={{
          bottom: 36,
        }}
        stackOffset="sign"
      >
        <CartesianGrid
          fill={theme.colors.slate[950]}
          stroke={theme.colors.lime[200]}
          strokeDasharray="3 3"
        />
        <ReferenceLine
          stroke={theme.colors.yellow[400]}
          strokeWidth={4}
          y={0}
        />
        <XAxis
          dataKey="teamId" // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<XAxisLabel />}
          tick={false}
          type="category"
        />
        <YAxis
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          tick={{
            fill: theme.colors.lime[500],
            fontSize: 16,
            stroke: theme.colors.lime[500],
          }}
          tickFormatter={(value) => `${Math.abs(value)}`}
          tickLine={{ stroke: theme.colors.lime[200] }}
          tickMargin={12}
          type="number"
        />
        <Tooltip
          // @ts-expect-error - necessary b/c custom elements expect props, but  can't grok that recharts passes props for you under the hood
          content={<TooltipContent />}
          cursor={{ fill: theme.colors.slate[400], fillOpacity: 0.5 }}
        />
        <Bar
          dataKey="numSurprised"
          fill={theme.colors.green[700]}
          stackId="stack"
        />
        <Bar
          dataKey="numEliminated"
          fill={theme.colors.red[700]}
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
