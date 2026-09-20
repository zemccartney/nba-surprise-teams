import type {
  ChartScene,
  ChartValue,
  DomChartDefinition,
} from "@tanstack/charts/types";

import { mountChartRenderer } from "@tanstack/charts/renderer";
import { createSvgChartRenderer } from "@tanstack/charts/svg/renderer";

import { waitForChartFonts } from "./fonts";
import { renderTrackerSvg } from "./tanstack-svg";

export interface TrackerChart<Row, X extends ChartValue, Y extends ChartValue> {
  // Keep custom annotations beside the definition, not in the input controller.
  annotation?: (scene: ChartScene<Row, X, Y>) => string;
  body: (row: Row) => HTMLElement;
  definition: DomChartDefinition<Row, X, Y>;
  description: string;
  label: string;
}

/**
Astro owns the payload; TanStack owns rendering, focus, tooltip and resize.
*/
export const mountCharts = <
  Props,
  Row,
  X extends ChartValue,
  Y extends ChartValue,
>(
  kind: string,
  build: (props: Props, height: number) => TrackerChart<Row, X, Y>,
): void => {
  for (const host of document.querySelectorAll<HTMLElement>(
    `[data-chart="${CSS.escape(kind)}"]`,
  )) {
    const payload = host.querySelector(
      ':scope > script[type="application/json"]',
    )?.textContent;
    if (!payload) continue;
    const props = JSON.parse(payload) as Props;
    let isMounted = false;
    let isDisposed = false;
    let destroy: (() => void) | undefined;
    const mount = async () => {
      if (isMounted || isDisposed) return;
      isMounted = true;
      observer.disconnect();
      host.removeEventListener("focus", onFocus);
      await waitForChartFonts(
        document.fonts,
        getComputedStyle(host).fontFamily,
      );
      if (isDisposed || !host.isConnected) return;
      const chart = build(props, host.clientHeight);
      const isTransferFocus = document.activeElement === host;
      // The SVG becomes the sole keyboard target, replacing the lazy placeholder.
      host.removeAttribute("tabindex");
      host.removeAttribute("role");
      host.removeAttribute("aria-label");
      const instance = mountChartRenderer(host, {
        ariaDescription: `${chart.description} Use arrow keys to explore, Home and End for the endpoints, Enter to pin a tooltip, and Escape to dismiss it.`,
        ariaLabel: chart.label,
        definition: chart.definition,
        height: host.clientHeight,

        onTooltipBodyChange: (target) => {
          const point = target?.points[0];
          if (target && point)
            target.element.replaceChildren(chart.body(point.datum));
        },
        renderer: createSvgChartRenderer<Row, X, Y>((scene, options) => {
          return renderTrackerSvg(scene, options, chart.annotation?.(scene));
        }),
      });
      destroy = () => instance.destroy();
      if (isTransferFocus)
        host.querySelector<SVGSVGElement>(":scope svg")?.focus();
    };
    const begin = () => {
      void mount().catch((error: unknown) => {
        if (isDisposed) return;
        host.removeAttribute("aria-label");
        host.removeAttribute("tabindex");
        host.setAttribute("role", "alert");
        host.textContent =
          "Unable to render this chart. Please reload to try again.";
        console.error(`[charts] ${kind} failed to render`, error);
      });
    };
    const onFocus = begin;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) begin();
    });
    host.tabIndex = 0;
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", "Interactive chart loading");
    host.addEventListener("focus", onFocus);
    observer.observe(host);
    document.addEventListener(
      "astro:before-swap",
      () => {
        isDisposed = true;
        observer.disconnect();
        host.removeEventListener("focus", onFocus);
        destroy?.();
      },
      { once: true },
    );
  }
};
