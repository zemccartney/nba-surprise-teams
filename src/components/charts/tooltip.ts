import type { TooltipComponentOption } from "echarts/components";

type Formatter = Exclude<
  TooltipComponentOption["formatter"],
  string | undefined
>;

// ECharts assigns string formatter results to innerHTML on every update.
// Return the same DOM subtree instead, preserving decoded images while the
// pointer moves within a point. Only replace its children when content changes.
export const stableTooltip = (format: Formatter): Formatter => {
  let element: HTMLDivElement | undefined;
  let previous: string | undefined;
  return (params, ticket, callback?: Parameters<Formatter>[2]) => {
    const content = callback
      ? format(params, ticket, callback)
      : format(params, ticket);
    if (typeof content !== "string" || content === "") {
      return content;
    }
    element ??= document.createElement("div");
    if (content !== previous) {
      element.innerHTML = content;
      previous = content;
    }
    return element;
  };
};
