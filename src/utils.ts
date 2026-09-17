import type { ImageMetadata } from "astro";

/***
 *
 * DATES & TIMES
 *
 * ***/

export const minToMs = (min: number) => min * 60 * 1000;

export const signedFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "always",
});

// Use the NBA calendar in both Worker requests and Node maintenance.
export { getCurrentEasternYYYYMMDD, getEasternYYYYMMDD } from "./data/calendar";

/***
 *
 * MISC
 *
 * ***/

export const getEmoji = (emoji: string) => {
  const imgs = import.meta.glob<{ default: ImageMetadata }>(
    "./assets/images/emoji/*.svg",
  );

  const matchedPath = imgs[`./assets/images/emoji/${emoji}.svg`];

  if (!matchedPath) {
    throw new Error("[getEmoji] emoji not found");
  }

  // Unwrap so output is passable directly to Astro's Image component's src property
  return matchedPath();
};
