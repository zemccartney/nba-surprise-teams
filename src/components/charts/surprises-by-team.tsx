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

import { PopoverBody } from "../popover";

type SurprisesByTeamChartDatapoint = {
  name: string;
  numEliminated: number;
  numSurprised: number;
  teamId: string; // TeamCode;
} & (
  | {
      history: {
        duration: [number, number?];
        logoSrc: string;
        name: string;
        teamId: string; // TeamCode;
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
        <PopoverBody className="md:max-w-fit" deRadix>
          <h3 className="mb-1 text-center font-bold">{point.name}</h3>

          <p className="text-center">
            Surprise Record: {point.numSurprised} -{" "}
            {Math.abs(point.numEliminated)}{" "}
            {/* Math.abs to reverse negative scale coercion (see note in render, on mapping in passing to data prop) */}
          </p>

          <ul className="ps-[0.5em]">
            {point.history.map((hist) => (
              <li className="mt-4" key={`${hist.teamId}-${hist.duration[0]}`}>
                <img
                  className="inline contrast-150 drop-shadow-lg"
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
        </PopoverBody>
      );
    }

    return (
      <PopoverBody className="md:max-w-fit" deRadix>
        <h3 className="mb-1 text-center font-bold">
          <img
            className="inline contrast-150 drop-shadow-lg"
            src={point.logoSrc}
            width={30}
          />{" "}
          {point.name}
        </h3>

        <p className="text-center">
          Surprise Record: {point.numSurprised} -{" "}
          {Math.abs(point.numEliminated)}
        </p>
      </PopoverBody>
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
            numEliminated: point.numEliminated / -1, // Coerce values to negative scale
          }))}
        margin={{
          bottom: 36,
        }}
        stackOffset="sign"
      >
        <CartesianGrid
          fill="var(--color-slate-950)"
          stroke="var(--color-lime-200)"
          strokeDasharray="3 3"
        />
        <ReferenceLine stroke="var(--color-yellow-400)" strokeWidth={4} y={0} />
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
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickFormatter={(value) => `${Math.abs(value)}`}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
          type="number"
        />
        <Tooltip
          // @ts-expect-error - necessary b/c custom elements expect props, but  can't grok that recharts passes props for you under the hood
          content={<TooltipContent />}
          cursor={{ fill: "var(--color-slate-400)", fillOpacity: 0.5 }}
        />
        <Bar
          dataKey="numSurprised"
          fill="var(--color-green-700)"
          stackId="stack"
        />
        <Bar
          dataKey="numEliminated"
          fill="var(--color-red-700)"
          stackId="stack"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
