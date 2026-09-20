/**
SVG <image> has no HTML alt attribute. Supply its accessible name instead.
*/
export const labelSvgImages = (
  host: Pick<ParentNode, "querySelectorAll">,
  labels: ReadonlyMap<string, string>,
): void => {
  for (const image of host.querySelectorAll<SVGImageElement>(
    ":scope svg image",
  )) {
    const source =
      image.getAttribute("href") ??
      image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    const label = source ? labels.get(source) : undefined;
    if (!label) continue;
    if (image.getAttribute("role") !== "img") image.setAttribute("role", "img");
    if (image.getAttribute("aria-label") !== label)
      image.setAttribute("aria-label", label);
  }
};
