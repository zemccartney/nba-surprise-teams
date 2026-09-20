import type {
  ChartScene,
  ChartValue,
  RenderChartSvgOptions,
} from "@tanstack/charts/types";

import { renderChartSvg } from "@tanstack/charts/svg";

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
        ...scene.nodes,
      ],
      theme: { ...scene.theme, background: "transparent" },
    },
    options,
  ).replace("<svg ", '<svg data-renderer="tanstack" ');
  return markup.replace("</svg>", () => `${annotation}</svg>`);
};
