import type {
  ChartScene,
  ChartValue,
  DomChartDefinition,
} from "@tanstack/charts/types";

import { mountChartRenderer } from "@tanstack/charts/renderer";
import { createSvgChartRenderer } from "@tanstack/charts/svg/renderer";

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
Astro supplies the payload; TanStack owns rendering, fonts, focus and resize.
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
    let isMounted = false;
    const mount = () => {
      if (isMounted || !host.isConnected) return;
      isMounted = true;
      observer.disconnect();
      host.removeEventListener("focus", mount);
      try {
        const chart = build(JSON.parse(payload) as Props, host.clientHeight);
        const isTransferFocus = document.activeElement === host;
        // The SVG replaces the lazy placeholder as the sole keyboard target.
        host.removeAttribute("tabindex");
        host.removeAttribute("role");
        host.removeAttribute("aria-label");
        // Render with available fonts now. TanStack remeasures/redraws on
        // document.fonts loadingdone; no application timer or font wait needed.
        mountChartRenderer(host, {
          ariaDescription: `${chart.description} Use arrow keys to explore, Home and End for the endpoints, Enter to pin a tooltip, and Escape to dismiss it.`,
          ariaLabel: chart.label,
          definition: chart.definition,
          height: host.clientHeight,
          onTooltipBodyChange: (target) => {
            const point = target?.points[0];
            if (target && point)
              target.element.replaceChildren(chart.body(point.datum));
          },
          renderer: createSvgChartRenderer<Row, X, Y>((scene, options) =>
            renderTrackerSvg(scene, options, chart.annotation?.(scene)),
          ),
        });
        if (isTransferFocus)
          host.querySelector<SVGSVGElement>(":scope svg")?.focus();
      } catch (error) {
        host.removeAttribute("aria-label");
        host.removeAttribute("tabindex");
        host.setAttribute("role", "alert");
        host.textContent =
          "Unable to render this chart. Please reload to try again.";
        console.error(`[charts] ${kind} failed to render`, error);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) mount();
    });
    host.tabIndex = 0;
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", "Interactive chart loading");
    host.addEventListener("focus", mount);
    observer.observe(host);
    // Navigation replaces the document; this app does not use ClientRouter.
  }
};
