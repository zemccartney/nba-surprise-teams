import { logoAlt } from "../logo-alt";

export const readTheme = () => {
  const style = getComputedStyle(document.documentElement);
  // Match the reference's sRGB palette rather than changing gamut mapping
  // while replacing the renderer. Resolve once per chart mount.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const color = (name: string) => {
    const value = style.getPropertyValue(`--color-${name}`).trim();
    if (!context) return value;
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  };
  return {
    accent: color("indigo-400"),
    background: color("slate-950"),
    brightRed: color("pace-red"),
    green: color("green-700"),
    lime: color("lime-500"),
    pale: color("lime-200"),
    red: color("red-700"),
    slate: color("slate-400"),
    yellow: color("yellow-400"),
  };
};
export type Theme = ReturnType<typeof readTheme>;
export const chartTheme = (t: Theme) => ({
  background: t.background,
  focusRing: false as const,
  foreground: t.lime,
  grid: t.pale,
  muted: t.lime,
  palette: [t.green, t.red],
});
export const axis = (text: string, offset: number) => ({
  label: { fontSize: 20, fontWeight: 700, offset, opacity: 1, text },
  line: false as const,
  tickLabels: { fontSize: 16, fontWeight: 700, opacity: 1 },
  ticks: { padding: 12, size: 6 },
});
export const grid = (t: Theme) => ({
  stroke: t.pale,
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
