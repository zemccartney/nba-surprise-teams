import type { ChartTooltipPortalExtension } from "@tanstack/charts/tooltip/portal";

import { add } from "./tanstack-style";

interface TooltipPlacement {
  height: number;
  offset: number;
  viewportHeight: number;
  viewportWidth: number;
  width: number;
  x: number;
  y: number;
}

/** Keep a clear neighborhood around the point, even for very tall histories.
 * Unlike the default placer, never shift an oversized box back over its anchor.
 */
export function placeScatterTooltip({
  height,
  offset,
  viewportHeight,
  viewportWidth,
  width,
  x,
  y,
}: TooltipPlacement) {
  const edge = 16;
  const centeredY = Math.max(
    edge,
    Math.min(y - height / 2, viewportHeight - height - edge),
  );
  // Sideways placement keeps the dense cluster above and below the dot visible.
  if (x - offset - width >= edge)
    return { x: x - offset - width, y: centeredY };
  if (x + offset + width <= viewportWidth - edge)
    return { x: x + offset, y: centeredY };
  const left = Math.max(
    edge,
    Math.min(x - width / 2, viewportWidth - width - edge),
  );
  if (y - offset - height >= edge) return { x: left, y: y - offset - height };
  // Vertical overflow is intentional: retain the gap, not chart/viewport clipping.
  return { x: left, y: y + offset };
}

/**
Use TanStack's tooltip lifecycle/content, with document-level placement.
*/
export const scatterTooltipPortal: ChartTooltipPortalExtension = {
  create: ({ container, element, schedulePosition }) => {
    const document = container.ownerDocument;
    const view = document.defaultView;
    add(document.body, element);
    Object.assign(element.style, {
      bottom: "auto",
      margin: "0",
      position: "absolute",
      right: "auto",
      zIndex: "1000",
    });
    view?.addEventListener("scroll", schedulePosition, {
      capture: true,
      passive: true,
    });
    view?.addEventListener("resize", schedulePosition, { passive: true });
    view?.visualViewport?.addEventListener("resize", schedulePosition, {
      passive: true,
    });
    view?.visualViewport?.addEventListener("scroll", schedulePosition, {
      passive: true,
    });
    return {
      destroy: () => {
        view?.removeEventListener("scroll", schedulePosition, true);
        view?.removeEventListener("resize", schedulePosition);
        view?.visualViewport?.removeEventListener("resize", schedulePosition);
        view?.visualViewport?.removeEventListener("scroll", schedulePosition);
        element.remove();
      },
      hide: () => {
        element.hidden = true;
      },
      position: ({ anchor, offset = 40, scene, surface }) => {
        if (!view || !container.isConnected) return false;
        const bounds = surface.element.getBoundingClientRect();
        if (!bounds.width || !bounds.height || !scene.width || !scene.height)
          return false;
        const viewportLeft = view.visualViewport?.offsetLeft ?? 0;
        const viewportTop = view.visualViewport?.offsetTop ?? 0;
        const x =
          bounds.left + (anchor.x * bounds.width) / scene.width - viewportLeft;
        const y =
          bounds.top + (anchor.y * bounds.height) / scene.height - viewportTop;
        const viewportWidth = Math.min(
          document.documentElement.clientWidth,
          view.visualViewport?.width ?? view.innerWidth,
        );
        const viewportHeight = view.visualViewport?.height ?? view.innerHeight;
        // Do not hide merely because scrolling a long history moves its anchor
        // above the viewport. TanStack still owns pointer-leave/Escape dismissal.
        element.hidden = false;
        element.style.width = `${Math.min(512, viewportWidth - 32)}px`;
        const box = element.getBoundingClientRect();
        const placed = placeScatterTooltip({
          height: box.height,
          offset,
          viewportHeight,
          viewportWidth,
          width: box.width,
          x,
          y,
        });
        element.style.left = `${placed.x + view.scrollX + viewportLeft}px`;
        element.style.top = `${placed.y + view.scrollY + viewportTop}px`;
        return true;
      },
      update: () => {
        /*
        Placement is derived from the current scene; no persistent options.
        */
      },
    };
  },
  id: "scatter-tooltip",
};
