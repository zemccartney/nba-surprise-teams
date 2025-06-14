import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PopoverBody } from "../popover";

interface SurprisesPerSeasonChartDatapoint {
  numSurprises: number;
  seasonId: string; // CollectionEntry<"seasons">["id"];
  seasonRange: string;
  surpriseTeams: {
    logoSrc: string;
    name: string;
    teamId: string; // TeamCode;
  }[];
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
      x={x - 48}
      y={cy + 24}
    >
      # Surprises
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
      Season
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
  payload: [{ payload: SurprisesPerSeasonChartDatapoint }];
}) => {
  if (active && payload && payload.length > 0) {
    const point = payload[0].payload;

    return (
      <PopoverBody className="pb-4 md:max-w-80" deRadix>
        <h3 className="mb-1 text-center font-bold">
          {point.seasonRange} Season
        </h3>

        {point.surpriseTeams.length > 0 && (
          <>
            <h4 className="mb-2">Surprise Teams:</h4>
            <ul className="ps-[0.5em]">
              {point.surpriseTeams.map((ts) => (
                <li className="mt-4" key={ts.teamId}>
                  <img
                    className="inline contrast-150 drop-shadow-lg"
                    src={ts.logoSrc}
                    width={30}
                  />{" "}
                  {ts.name}
                </li>
              ))}
            </ul>
          </>
        )}

        {point.surpriseTeams.length === 0 && <p>No surprises this year</p>}
      </PopoverBody>
    );
  }
};

const Cursor = ({
  height,
  // payload,
  width,
  x,
  y,
}: {
  height: number;
  payload: [{ payload: SurprisesPerSeasonChartDatapoint }];
  width: number;
  x: number;
  y: number;
}) => {
  // const point = payload[0].payload;

  return (
    <path
      className="recharts-rectangle recharts-tooltip-cursor"
      d={`M ${x},${y} h ${width} v ${height} h -${width} Z`}
      fill="var(--color-slate-400)"
      fillOpacity={0.5}
      /* onClick={() => {
        window.open(`/${point.seasonId}`, "_blank");
      }} 
      role="link"
      tabIndex={0} */
    />
  );
};

export default function SurprisesPerSeasonChart({
  data,
  latestSeasonYear,
}: {
  data: SurprisesPerSeasonChartDatapoint[];
  latestSeasonYear: number; // SeasonUtils.sortSeasonsByDate( SeasonUtils.getAllSeasons(), )[0]!;
}) {
  return (
    <ResponsiveContainer className="bigchart" height={600} width="100%">
      <BarChart
        data={data}
        margin={{
          bottom: 36,
        }}
      >
        <CartesianGrid
          fill="var(--color-slate-950)"
          stroke="var(--color-lime-200)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="seasonId"
          domain={[1990, latestSeasonYear + 1]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<XAxisLabel />}
          tick={{
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
          ticks={Array.from(
            { length: Math.ceil((latestSeasonYear + 1 - 1990) / 5) },
            (_, i) => 1990 + i * 5,
          )}
          type="number"
        />
        <YAxis
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          tick={{
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
          type="number"
        />
        {/* @ts-expect-error - necessary b/c custom elements expect props, but  can't grok that recharts passes props for you under the hood */}
        <Tooltip content={<TooltipContent />} cursor={<Cursor />} />
        <Bar
          // activeBar={{ fill: theme.colors.indigo[400] }}
          barSize={40}
          dataKey="numSurprises"
          minPointSize={10}
        >
          {data.map((_, i) => (
            <Cell
              fill={i % 2 ? "var(--color-lime-200)" : "var(--color-green-700)"}
              key={i}
              /* onClick={() => {
                window.open(`/${point.seasonId}`, "_blank");
              }} 
              role="link"
              tabIndex={0}
              */
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
