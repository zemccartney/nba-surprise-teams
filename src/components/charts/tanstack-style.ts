import { logoAlt } from "../logo-alt";

// Keep paints connected to the site's CSS tokens, including future theme changes.
export const theme = {
  accent: "var(--chart-highlight)",
  alternate: "var(--chart-alternate)",
  axis: "var(--chart-axis)",
  background: "var(--chart-surface)",
  brightRed: "var(--chart-negative-line)",
  green: "var(--chart-positive)",
  grid: "var(--chart-grid)",
  lime: "var(--chart-positive-line)",
  red: "var(--chart-negative)",
  season: "var(--chart-season)",
  slate: "var(--chart-band)",
  surpriseDot: "var(--chart-surprise-dot)",
  yellow: "var(--chart-zero)",
};
export type Theme = typeof theme;
export const chartTheme = (t: Theme) => ({
  background: t.background,
  focusRing: false as const,
  foreground: t.axis,
  grid: t.grid,
  muted: t.axis,
  palette: [t.green, t.red],
});
export const axis = (text: string, offset: number) => ({
  label: { fontSize: 20, fontWeight: 700, offset, opacity: 1, text },
  line: false as const,
  tickLabels: { fontSize: 16, fontWeight: 700, opacity: 1 },
  ticks: { padding: 12, size: 6 },
});
export const grid = (t: Theme) => ({
  stroke: t.grid,
  strokeDasharray: "3 3",
  strokeOpacity: 1,
  strokeWidth: 1,
});
export const node = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] => {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
};
export const add = <T extends Node>(parent: T, ...children: Node[]): T => {
  // Worker HTMLRewriter globals collide with DOM Element.append's signature.
  // eslint-disable-next-line unicorn/prefer-dom-node-append
  for (const child of children) parent.appendChild(child);
  return parent;
};
export const logo = (name: string, src: string, width = 30) => {
  const image = node("img", "tooltip-logo");
  image.src = src;
  image.alt = logoAlt(name);
  image.width = width;
  return image;
};
export const labeled = (label: string, text: string, className = "") =>
  add(
    node("p", className),
    node("span", "tooltip-label", label),
    document.createTextNode(text),
  );
export const ticks = (min: number, max: number, step = 5) =>
  Array.from(
    { length: Math.max(0, Math.floor((max - min) / step) + 1) },
    (_, i) => min + i * step,
  );
