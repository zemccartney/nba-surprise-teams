import type { ECharts } from "echarts/core";

export interface ChartKeyboardNavigation<Props> {
  dataIndices?: (props: Props) => readonly number[];
  label: string;
  orderDescription?: string;
  pointLabel?: string;
  points: (props: Props) => readonly string[];
  seriesIndices?: readonly number[];
}

/*
  A single tab stop selects a point on the chart. Slider semantics let screen
  readers use the same arrow/Home/End controls and announce aria-valuetext;
  ECharts' generated role="img" description alone offers no point navigation.
  This changes the selected point, never the underlying chart data.
*/
export const enableChartKeyboard = (
  host: HTMLElement,
  chart: ECharts,
  label: string,
  points: readonly string[],
  options: {
    dataIndices?: readonly number[];
    orderDescription?: string;
    pointLabel?: string;
    seriesIndices?: readonly number[];
  } = {},
) => {
  if (points.length === 0) {
    return;
  }

  let selected = 0;
  let isKeyboardActive = false;
  let pointerIndex: number | undefined;
  const noun = options.pointLabel ?? "Game";
  const series = options.seriesIndices ?? [0];
  const dataIndex = () => options.dataIndices?.[selected] ?? selected;
  host.tabIndex = 0;
  host.setAttribute("role", "slider");
  host.setAttribute("aria-label", label);
  host.setAttribute("aria-orientation", "horizontal");
  host.setAttribute("aria-valuemin", "1");
  host.setAttribute("aria-valuemax", String(points.length));
  host.setAttribute(
    "aria-description",
    `${options.orderDescription ? `${options.orderDescription} ` : ""}Use arrow keys to explore ${noun.toLowerCase()}s, Home or End for the first or last ${noun.toLowerCase()}, and Escape to hide the tooltip.`,
  );

  const announce = () => {
    host.setAttribute("aria-valuenow", String(selected + 1));
    host.setAttribute(
      "aria-valuetext",
      `${noun} ${selected + 1} of ${points.length}. ${points[selected]}`,
    );
  };

  const hide = () => {
    chart.dispatchAction({ type: "hideTip" });
    if (isKeyboardActive) {
      chart.dispatchAction({
        dataIndex: dataIndex(),
        seriesIndex: [...series],
        type: "downplay",
      });
      isKeyboardActive = false;
    }
  };

  // A pointer can remain over a dot while the keyboard selects another one.
  // Clear both native and programmatic emphasis when handing ownership over.
  const resetEmphasis = () => {
    chart.dispatchAction({ seriesIndex: [...series], type: "downplay" });
    pointerIndex = undefined;
  };

  const show = () => {
    resetEmphasis();
    isKeyboardActive = true;
    announce();
    chart.dispatchAction({
      dataIndex: dataIndex(),
      seriesIndex: [...series],
      type: "highlight",
    });
    chart.dispatchAction({
      dataIndex: dataIndex(),
      seriesIndex: series[0] ?? 0,
      type: "showTip",
    });
  };

  announce();
  const onFocus = () => {
    // Pointer focus must not activate an unrelated remembered selection.
    if (host.matches(":focus-visible")) show();
  };
  host.addEventListener("focus", onFocus);
  host.addEventListener("blur", hide);
  // Restore pointer emphasis even when returning within the same dot (there
  // need not be a new mouseover event after keyboard navigation).
  const onPointerPoint = (event: {
    dataIndex?: number;
    seriesIndex?: number;
  }) => {
    if (
      event.dataIndex === undefined ||
      !series.includes(event.seriesIndex ?? -1)
    )
      return;
    if (isKeyboardActive) hide();
    if (pointerIndex === event.dataIndex) return;
    resetEmphasis();
    pointerIndex = event.dataIndex;
    chart.dispatchAction({
      dataIndex: pointerIndex,
      seriesIndex: [...series],
      type: "highlight",
    });
  };
  host.addEventListener("pointerleave", () => {
    if (isKeyboardActive) {
      return;
    }

    resetEmphasis();
    hide();
  });
  chart.on("mousemove", onPointerPoint);
  chart.on("mouseout", () => {
    if (!isKeyboardActive) resetEmphasis();
  });
  host.addEventListener("pointerdown", () => {
    if (isKeyboardActive) hide();
  });
  chart.on("click", (event: { dataIndex?: number; seriesIndex?: number }) => {
    onPointerPoint(event);
    if (
      event.dataIndex === undefined ||
      !series.includes(event.seriesIndex ?? -1)
    )
      return;
    const index = options.dataIndices?.length
      ? options.dataIndices.indexOf(event.dataIndex)
      : event.dataIndex;
    if (index < 0 || index >= points.length) return;
    selected = index;
    announce();
    host.focus({ preventScroll: true });
  });
  // Focus may have triggered lazy mounting before these listeners existed.
  if (document.activeElement === host) onFocus();

  const hasOpenControl = () =>
    document.querySelector(":popover-open, dialog[open]") !== null;
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !event.defaultPrevented &&
      host.isConnected &&
      !hasOpenControl()
    )
      hide();
  });
  host.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    let next: number;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowLeft": {
        next = Math.max(0, selected - 1);
        break;
      }
      case "ArrowRight":
      case "ArrowUp": {
        next = Math.min(points.length - 1, selected + 1);
        break;
      }
      case "End": {
        next = points.length - 1;
        break;
      }
      case "Escape": {
        if (hasOpenControl()) return;
        event.preventDefault();
        hide();
        return;
      }
      case "Home": {
        next = 0;
        break;
      }
      default: {
        // In particular, leave Tab and Shift+Tab alone: never trap focus.
        return;
      }
    }

    event.preventDefault();
    hide();
    selected = next;
    show();
  });
};
