/*
  Shared ECharts setup for the site's charts.

  Only the chart types, components, and renderer we use are registered, so the
  client bundle is tree-shaken to what the four charts need. Colors and fonts
  come from the design tokens in global.css, read when a chart mounts: the
  charts render to SVG attributes, which can't resolve var(). (When light mode
  lands, re-mount on theme change.)
*/
import type {
  BarSeriesOption,
  LineSeriesOption,
  ScatterSeriesOption,
} from "echarts/charts";
import type {
  AriaComponentOption,
  GridComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from "echarts/components";
import type { ComposeOption } from "echarts/core";

import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";

import type { ChartKeyboardNavigation } from "./keyboard";

import { waitForChartFonts } from "./fonts";
import { labelSvgImages } from "./image-labels";
import { enableChartKeyboard } from "./keyboard";
import { stableTooltip } from "./tooltip";

echarts.use([
  AriaComponent,
  BarChart,
  GridComponent,
  LineChart,
  MarkLineComponent,
  ScatterChart,
  SVGRenderer,
  TooltipComponent,
  VisualMapComponent,
]);

export type ChartOption = ComposeOption<
  | AriaComponentOption
  | BarSeriesOption
  | GridComponentOption
  | LineSeriesOption
  | MarkLineComponentOption
  | ScatterSeriesOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

export interface Theme {
  blurple: string;
  fontMono: string;
  green200: string;
  green700: string;
  indigo400: string;
  lime200: string;
  lime500: string;
  red700: string;
  shadowPopover: string;
  slate400: string;
  slate950: string;
  yellow400: string;
}

const readTheme = (): Theme => {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();

  // The color tokens are oklch(), which zrender can't parse when it tweens
  // hover states (it throws mid-animation). Paint each one into a 1px canvas and
  // read the sRGB bytes back as hex. Identical on screen for in-gamut colors.
  const ctx = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  const color = (name: string) => {
    const raw = token(name);

    if (!ctx) {
      return raw;
    }

    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;

    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };

  return {
    blurple: color("--color-blurple-glow"),
    fontMono: token("--font-mono"),
    green200: color("--color-green-200"),
    green700: color("--color-green-700"),
    indigo400: color("--color-indigo-400"),
    lime200: color("--color-lime-200"),
    lime500: color("--color-lime-500"),
    red700: color("--color-red-700"),
    shadowPopover: token("--shadow-popover"),
    slate400: color("--color-slate-400"),
    slate950: color("--color-slate-950"),
    yellow400: color("--color-yellow-400"),
  };
};

// The previous charts (Recharts) drew axis text with a 1px stroke in the fill
// color, which reads as semi-bold; the text border reproduces that.
export const axisText = (t: Theme, fontSize: number) => ({
  color: t.lime500,
  fontFamily: t.fontMono,
  fontSize,
  textBorderColor: t.lime500,
  textBorderWidth: 1,
});

export const axisBase = (t: Theme) => ({
  axisLabel: { ...axisText(t, 16), margin: 12 },
  axisLine: { show: false },
  axisTick: { length: 6, lineStyle: { color: t.lime200 } },
  nameLocation: "middle" as const,
  nameTextStyle: axisText(t, 20),
  splitLine: {
    lineStyle: { color: t.lime200, type: [3, 3] },
    showMaxLine: false,
    showMinLine: false,
  },
});

export const gridBase = (t: Theme) => ({
  backgroundColor: t.slate950,
  borderWidth: 0,
  show: true,
});

// Same look as .popover-body (popover.css), which the chart tooltips used to share
export const tooltipBase = (
  t: Theme,
  extraCss = "",
): TooltipComponentOption => ({
  backgroundColor: t.blurple,
  borderRadius: 0,
  borderWidth: 0,
  confine: true,
  extraCssText: `box-shadow: ${t.shadowPopover}; white-space: normal; ${extraCss}`,
  padding: 28,
  textStyle: {
    color: t.green200,
    fontFamily: t.fontMono,
    fontSize: 20,
    lineHeight: 28,
  },
});

// Tooltip content is an HTML string; data is ours, but escape it anyway
export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/*
  Mounts every `[data-chart="<kind>"]` host on the page: parses the JSON payload
  its .astro wrapper rendered, builds the option, and renders once the host
  scrolls into view (what client:visible did for the React charts).
*/
export const mountCharts = <Props>(
  kind: string,
  build: (props: Props, theme: Theme) => ChartOption,
  keyboard?: ChartKeyboardNavigation<Props>,
  imageLabels?: (props: Props) => ReadonlyMap<string, string>,
) => {
  for (const host of document.querySelectorAll<HTMLElement>(
    `[data-chart="${CSS.escape(kind)}"]`,
  )) {
    const payload = host.querySelector(
      'script[type="application/json"]',
    )?.textContent;

    if (!payload) {
      continue;
    }

    const props = JSON.parse(payload) as Props;
    const observer = new IntersectionObserver((entries) => {
      if (entries.every((entry) => !entry.isIntersecting)) {
        return;
      }

      mount();
    });
    let hasMounted = false;
    const mount = () => {
      if (hasMounted) {
        return;
      }
      hasMounted = true;
      observer.disconnect();
      host.removeEventListener("focus", mount);
      void render(host, props, build, keyboard, imageLabels?.(props));
    };

    // An offscreen lazy chart must still be reachable by Tab. Focus can mount
    // it too; once ready, the point selector replaces this temporary group.
    if (keyboard && keyboard.points(props).length > 0) {
      host.tabIndex = 0;
      host.setAttribute("role", "group");
      host.setAttribute("aria-label", keyboard.label);
      host.addEventListener("focus", mount);
    }
    observer.observe(host);
  }
};

const render = async <Props>(
  host: HTMLElement,
  props: Props,
  build: (props: Props, theme: Theme) => ChartOption,
  keyboard?: ChartKeyboardNavigation<Props>,
  imageLabels?: ReadonlyMap<string, string>,
) => {
  const theme = readTheme();

  // Prefer loaded fonts for measurement, but render with fallback metrics
  // when requests fail or stall rather than leaving an unusable placeholder.
  await waitForChartFonts(document.fonts, theme.fontMono);

  const chart = echarts.init(host, undefined, { renderer: "svg" });
  // ECharts creates SVG images without names and may replace them on redraw.
  // Only image-bearing charts register this; unchanged labels cause no DOM writes.
  if (imageLabels?.size) {
    chart.on("rendered", () => labelSvgImages(host, imageLabels));
  }
  const pointDescriptions = keyboard?.points(props) ?? [];
  const chartOption = build(props, theme);
  const tooltip = chartOption.tooltip;
  if (
    tooltip &&
    !Array.isArray(tooltip) &&
    typeof tooltip.formatter === "function"
  ) {
    tooltip.formatter = stableTooltip(tooltip.formatter);
  }
  chart.setOption({
    animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    ...chartOption,
    // The interactive selector owns its role/label. Do not let ECharts' aria
    // visual stage replace them with a static image description on updates.
    ...(pointDescriptions.length > 0 && { aria: { enabled: false } }),
  });

  if (keyboard) {
    enableChartKeyboard(host, chart, keyboard.label, pointDescriptions, {
      dataIndices: keyboard.dataIndices?.(props) ?? [],
      // A slider's descendants may be presentational to assistive technology;
      // retain the SVG imagery's meaning on the accessible control as well.
      orderDescription: [
        keyboard.orderDescription,
        ...(imageLabels?.values() ?? []),
      ]
        .filter(Boolean)
        .join(" "),
      pointLabel: keyboard.pointLabel ?? "Game",
      seriesIndices: keyboard.seriesIndices ?? [0],
    });
  }

  let isInitial = true;
  new ResizeObserver(() => {
    // The observer fires once on observe(); the chart is already sized for that
    if (isInitial) {
      isInitial = false;
      return;
    }
    chart.resize();
  }).observe(host);
};
