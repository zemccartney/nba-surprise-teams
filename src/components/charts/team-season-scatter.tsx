import type { CollectionEntry } from "astro:content";

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

import * as Utils from "../../utils";
import { PopoverBody } from "../popover";

interface TeamSeasonScatterplotDatapoint {
  isSurpriseTeam: boolean;
  logoSrc: string;
  overUnder: CollectionEntry<"teamSeasons">["data"]["overUnder"];
  pace: number; // Awaited<ReturnType<typeof ContentUtils.pace>>;
  recordFmt: string; // ReturnType<typeof ContentUtils.formatRecord>;
  seasonRange: string;
  teamName: string; // ReturnType<typeof ContentUtils.resolveTeamName>;
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
      <PopoverBody className="pb-4 md:max-w-fit" deRadix>
        <h3 className="mb-1 text-center font-bold">
          <img
            className="mr-2 inline contrast-150 drop-shadow-lg"
            src={point.logoSrc}
            width={30}
          />
          {point.seasonRange} {point.teamName}
        </h3>

        <p className="mt-4">
          <label className="mr-4 inline-block font-bold" htmlFor="record">
            Pace (Record)
          </label>
          <span id="record">
            {Utils.signedFormatter.format(point.pace)} ({point.recordFmt})
          </span>
        </p>
        <p>
          <label className="mr-4 inline-block font-bold" htmlFor="overUnder">
            Over/Under:
          </label>
          <span id="overUnder">{point.overUnder}</span>
        </p>
      </PopoverBody>
    );
  }
};

const roundToFive = (num: number, dir: "down" | "up"): number => {
  const method =
    Math.sign(num) === -1
      ? dir === "up"
        ? "floor"
        : "ceil"
      : dir === "up"
        ? "ceil"
        : "floor";
  return Math.sign(num) * Math[method](Math.abs(num) / 5) * 5;
};

export default function TeamSeasonScatterplot({
  data,
}: {
  data: TeamSeasonScatterplotDatapoint[];
}) {
  const ouMin = Math.min(...data.map(({ overUnder }) => overUnder));
  const ouMax = Math.max(...data.map(({ overUnder }) => overUnder));
  const xMin =
    roundToFive(ouMin, "down") === ouMin
      ? roundToFive(ouMin, "down") - 5
      : roundToFive(ouMin, "down");
  const xMax =
    roundToFive(ouMax, "up") === ouMax
      ? roundToFive(ouMax, "up") + 5
      : roundToFive(ouMax, "up");

  const paceMin = Math.min(...data.map(({ pace }) => pace));
  const paceMax = Math.max(...data.map(({ pace }) => pace));
  const yMin =
    roundToFive(paceMin, "down") === paceMin
      ? roundToFive(paceMin, "down") - 5
      : roundToFive(paceMin, "down");
  const yMax =
    roundToFive(paceMax, "up") === paceMax
      ? roundToFive(paceMax, "up") + 5
      : roundToFive(paceMax, "up");

  return (
    <ResponsiveContainer height={600} width="100%">
      <ScatterChart
        accessibilityLayer
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
          dataKey="overUnder"
          domain={[xMin, xMax]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<XAxisLabel />}
          name="Over/Under"
          tick={{
            fill: "var(--color-lime-500)",
            fontSize: 16,
            stroke: "var(--color-lime-500)",
          }}
          tickLine={{ stroke: "var(--color-lime-200)" }}
          tickMargin={12}
          ticks={Array.from(
            { length: Math.ceil(Math.abs(xMin - xMax) / 5) },
            (_, i) => xMin + i * 5,
          )}
          type="number"
        />
        <YAxis
          dataKey="pace"
          domain={[yMin, yMax]}
          // @ts-expect-error - necessary b/c label expects an element, but passes props for you under the hood
          label={<YAxisLabel />}
          name="Pace"
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
        <Tooltip content={<TooltipContent />} />
        <Scatter data={data}>
          {data.map((point, i) => (
            <Cell
              fill={
                point.isSurpriseTeam
                  ? "var(--color-lime-500)"
                  : "var(--color-red-700)"
              }
              key={i}
              /* 
              className="hover:fill-indigo-400"
              onClick={() => {
                window.open(`/${point.seasonId}/${point.teamId}`, "_blank");
              }}
              role="link"
              tabIndex={0} */
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
