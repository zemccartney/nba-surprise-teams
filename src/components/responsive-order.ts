// Keep reading/tab order consistent with CSS layouts that swap their first
// two items. Callers must use the same breakpoint as their media queries.
export const syncResponsiveOrder = (options: {
  desktopFirst: string;
  minWidth: number;
  mobileFirst: string;
  selector: string;
}) => {
  const desktop = globalThis.matchMedia(`(min-width: ${options.minWidth}px)`);
  for (const grid of document.querySelectorAll<HTMLElement>(options.selector)) {
    const wideFirst = grid.querySelector<HTMLElement>(
      `:scope > ${options.desktopFirst}`,
    );
    const narrowFirst = grid.querySelector<HTMLElement>(
      `:scope > ${options.mobileFirst}`,
    );
    if (!wideFirst || !narrowFirst) continue;
    const syncOrder = () => {
      const first = desktop.matches ? wideFirst : narrowFirst;
      if (grid.firstElementChild === first) return;
      const focused = document.activeElement;
      if ("moveBefore" in grid && typeof grid.moveBefore === "function") {
        grid.moveBefore(first, grid.firstElementChild);
      } else {
        const openPopovers = first.querySelectorAll<HTMLElement>(
          ":scope [popover]:popover-open",
        );
        // Cloudflare's global Element type shadows DOM prepend's signature.
        grid.insertBefore(first, grid.firstChild);
        for (const popover of openPopovers) popover.showPopover();
        if (
          focused instanceof HTMLElement &&
          first.contains(focused) &&
          document.activeElement !== focused
        ) {
          focused.focus({ preventScroll: true });
        }
      }
    };
    syncOrder();
    desktop.addEventListener("change", syncOrder);
  }
};
