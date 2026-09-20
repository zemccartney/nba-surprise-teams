import type {
  ChartScene,
  ChartValue,
  RenderChartSvgOptions,
  SceneNode,
} from "@tanstack/charts/types";

import { renderChartSvg } from "@tanstack/charts/svg";

const isInside = (value: number, min: number, max: number) =>
  value > min + 0.01 && value < max - 0.01;

/**
Paint the plot, not the axis gutters, without changing any chart geometry.
*/
export const renderTrackerSvg = <
  Row,
  X extends ChartValue,
  Y extends ChartValue,
>(
  scene: ChartScene<Row, X, Y>,
  options: RenderChartSvgOptions,
  annotation = "",
): string => {
  const { height, width, x, y } = scene.chart;
  const nodes = scene.nodes.map((node) => {
    if (node.kind !== "group" || node.className !== "ts-chart__grid")
      return node;
    return {
      ...node,
      children: node.children.flatMap<SceneNode>((line) => {
        if (line.kind !== "rule") return [line];
        const isVertical = line.x1 === line.x2;
        const isHorizontal = line.y1 === line.y2;
        if (
          (isVertical && !isInside(line.x1, x, x + width)) ||
          (isHorizontal && !isInside(line.y1, y, y + height))
        )
          return [];
        // A one-pixel stroke on a fractional coordinate looks translucent even
        // at full opacity. Match the reference's crisp half-pixel grid alignment.
        const px = Math.floor(line.x1) + 0.5;
        const py = Math.floor(line.y1) + 0.5;
        if (
          (isVertical && !isInside(px, x, x + width)) ||
          (isHorizontal && !isInside(py, y, y + height))
        )
          return [];
        return [
          {
            ...line,
            ...(isVertical && { x1: px, x2: px }),
            ...(isHorizontal && { y1: py, y2: py }),
            style: { ...line.style, strokeOpacity: 1 },
          },
        ];
      }),
      style: { ...node.style, strokeOpacity: 1 },
    };
  });
  const markup = renderChartSvg(
    {
      ...scene,
      nodes: [
        {
          key: "tracker-plot-background",
          kind: "rect",
          ...scene.chart,
          style: { fill: scene.theme.background },
        },
        ...nodes,
      ],
      theme: { ...scene.theme, background: "transparent" },
    },
    options,
  ).replace("<svg ", '<svg data-renderer="tanstack" ');
  return markup.replace("</svg>", () => `${annotation}</svg>`);
};
